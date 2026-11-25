/**
 * tsam.co.jp のお問い合わせフォームの受け口（Google Apps Script のウェブアプリ）。
 *
 * 【未検証】まだ一度も設置していない。設置の手順は docs/contact-form.md。
 * この仕組みの動きは forms/contact.test.cjs（Node で Google と Cloudflare の部品を真似たもの）でしか確かめていない。
 *
 * やること：フォームから届いた内容を、TO のアドレスへメールで送る。それだけ。
 *   ・返信先（Reply-To）は書いた人のメールアドレスにしてあるので、届いたメールにそのまま返信できる
 *   ・スプレッドシートには何も残さない
 *
 * この URL はサイトの中に見えるので、誰でも叩ける。受け口を作った人の Google の送信枠（1日100通ほど）を
 * 機械に使い切られないように、四つの関門を置いている（2026-11-26、Dots の指摘で足した）:
 *   1. Cloudflare Turnstile。フォームは、ブラウザが Cloudflare からもらった「機械ではない」の確認（cf-turnstile-response）を添えて送る。
 *      受け口はそれを Cloudflare に問い合わせて確かめる（siteverify）。確認が無い・通らない・別のサイトや別の用途（action）のもの、は送らない。
 *      確認は一回きりで、使い回しは Cloudflare が断る。フォームを通らずに POST だけ投げる機械はここで止まる
 *   2. 人には見えない欄（website）。埋まっていたら機械なので、何もせずに「送れた」と返す
 *   3. 上限。1時間に MAX_PER_HOUR 通、1日に MAX_PER_DAY 通まで。数は消えない置き場（スクリプトのプロパティ COUNT）に持ち、
 *      数えるあいだは鍵をかける（同時に来ても数え漏らさない）
 *   4. Google の送信枠の残りが MIN_QUOTA 通を切ったら送らない（持ち主のほかの用途のぶんを残す）
 * Cloudflare への問い合わせにも Google の枠（1日2万回）があるので、問い合わせは1分に VERIFY_PER_MINUTE 回まで。
 *
 * 【設置のときに入れるもの】スクリプトのプロパティ TURNSTILE_SECRET に、Turnstile のシークレットキー。
 *   **このファイルにも、リポジトリにも、チャットにも書かない。**入っていなければ、受け口は何も送らない。
 *   見本（web.app など）で試すときは、プロパティ HOSTS に「tsam.co.jp,tsam-co-jp.web.app」のようにコンマで並べる。
 *
 * 返すもの：{ok:true}、または {ok:false, error: 'invalid' | 'verification' | 'busy' | 'server'}。失敗しても HTTP は 200。
 *
 * このファイルを直しても、サイトには何も起きない。Apps Script の画面に貼り直して「デプロイを管理 → 新しいバージョン」で反映する。
 */
const TO = 'ikemori@tsam.co.jp';
const MAX_PER_HOUR = 10;
const MAX_PER_DAY = 40;
const MIN_QUOTA = 20;
const ACTION = 'tsam_contact'; // フォームが Turnstile に付ける用途の名前（ContactForm.astro と同じ）
const HOSTS = ['tsam.co.jp']; // 確認が出された頁のホスト名。これ以外で出た確認は受けない
const VERIFY_PER_MINUTE = 10;
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function now() {
  return Date.now();
}

// 開いて確かめる用。ブラウザでウェブアプリの URL を開くと {"ok":true,…} が出る
function doGet() {
  return reply({ ok: true, about: 'tsam.co.jp contact form endpoint' });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.website) return reply({ ok: true });

    const name = clean(p.name, 100);
    const org = clean(p.organization, 100);
    const email = clean(p.email, 200);
    const topic = clean(p.topic, 30) || 'その他';
    const message = String(p.message || '').trim().slice(0, 5000);
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ ok: false, error: 'invalid' });

    const token = String(p['cf-turnstile-response'] || '');
    if (!token || token.length > 2048) return reply({ ok: false, error: 'verification' });

    const props = PropertiesService.getScriptProperties();
    // もう上限に達しているなら、Cloudflare に問い合わせるまでもない（鍵はかけずに覗くだけ。本番の勘定は下で鍵をかけてやる）
    if (full(count(props))) return reply({ ok: false, error: 'busy' });

    const cache = CacheService.getScriptCache();
    const key = 'v' + Math.floor(now() / 60000);
    const asked = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(asked), 120);
    if (asked > VERIFY_PER_MINUTE) return reply({ ok: false, error: 'busy' });

    const v = verify(token, props);
    if (v !== 'ok') return reply({ ok: false, error: v });

    // ここから先は一人ずつ。通数の勘定を、同時に来た送信と取り違えないため
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply({ ok: false, error: 'busy' });
    try {
      const c = count(props);
      if (full(c)) return reply({ ok: false, error: 'busy' });
      if (MailApp.getRemainingDailyQuota() < MIN_QUOTA) return reply({ ok: false, error: 'busy' });

      // 送る前に数える（送信が途中でこけても、数は減らさない。多めに数えるぶんには安全）
      props.setProperty('COUNT', JSON.stringify({ hour: c.hour, hn: c.hn + 1, day: c.day, dn: c.dn + 1 }));

      MailApp.sendEmail({
        to: TO,
        replyTo: email,
        subject: '【tsam.co.jp】' + topic + 'のお問い合わせ（' + name + '）',
        body: [
          'tsam.co.jp のお問い合わせフォームから届きました。このメールに返信すると、書いた方に届きます。',
          '',
          'お名前：' + name,
          '会社名・団体名：' + org,
          'メールアドレス：' + email,
          'ご用件：' + topic,
          '受付：' + Utilities.formatDate(new Date(now()), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm'),
          '',
          message,
        ].join('\n'),
      });
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'server' });
  }
}

// いまの時間・日の通数。時間や日が変わっていたら 0 から
function count(props) {
  const hour = Utilities.formatDate(new Date(now()), 'Asia/Tokyo', 'yyyyMMddHH');
  const day = hour.slice(0, 8);
  let c = {};
  try { c = JSON.parse(props.getProperty('COUNT') || '{}'); } catch (err) { c = {}; }
  return { hour: hour, day: day, hn: c.hour === hour ? Number(c.hn) || 0 : 0, dn: c.day === day ? Number(c.dn) || 0 : 0 };
}

function full(c) {
  return c.hn >= MAX_PER_HOUR || c.dn >= MAX_PER_DAY;
}

// Cloudflare に確認を問い合わせる。通れば 'ok'。確認がだめなら 'verification'、こちらの不備や通信の失敗なら 'server'
function verify(token, props) {
  const secret = props.getProperty('TURNSTILE_SECRET');
  if (!secret) return 'server'; // 鍵が入っていないあいだは、何も通さない
  const res = UrlFetchApp.fetch(VERIFY_URL, { method: 'post', payload: { secret: secret, response: token }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return 'server';
  let j = null;
  try { j = JSON.parse(res.getContentText()); } catch (err) { return 'server'; }
  if (!j || j.success !== true) return 'verification';
  if (j.action !== ACTION) return 'verification';
  const hosts = String(props.getProperty('HOSTS') || HOSTS.join(',')).split(',').map(function (h) { return h.trim(); });
  if (hosts.indexOf(String(j.hostname || '')) < 0) return 'verification';
  return 'ok';
}

// 一行の欄：改行を落として（件名に改行を入れさせない）、長さを切る
function clean(v, max) {
  return String(v || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
