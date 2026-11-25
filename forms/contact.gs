/**
 * tsam.co.jp のお問い合わせフォームの受け口（Google Apps Script のウェブアプリ）。
 *
 * 【未検証】まだ一度も設置していない。設置の手順は docs/contact-form.md。
 * この仕組みの動きは forms/contact.test.cjs（Node で Google の部品を真似たもの）でしか確かめていない。
 *
 * やること：フォームから届いた内容を、TO のアドレスへメールで送る。それだけ。
 *   ・返信先（Reply-To）は書いた人のメールアドレスにしてあるので、届いたメールにそのまま返信できる
 *   ・スプレッドシートには何も残さない（メールを送る権限だけで動く。appsscript.json）
 *
 * この URL はサイトの中に見えるので、誰でも叩ける。受け口を作った人の Google の送信枠（1日100通ほど）を
 * 機械に使い切られないように、四つの関門を置いている（2026-11-26、Dots の指摘で足した）:
 *   1. 札（token）。フォームは書き始めたときに、この受け口から札を一枚もらう（doGet の ?token=1）。
 *      札には発行の時刻と、この受け口だけが知っている鍵での署名が入っている。送信のときに札が無い、
 *      署名が合わない、もらってから TOKEN_MIN_SEC 秒たっていない、TOKEN_MAX_SEC 秒を過ぎた、
 *      一度使った、のどれかなら送らない。フォームを通らずに POST だけ投げる機械はここで止まる
 *   2. 人には見えない欄（website）。埋まっていたら機械なので、何もせずに「送れた」と返す
 *   3. 上限。1時間に MAX_PER_HOUR 通、1日に MAX_PER_DAY 通まで。数は消えない置き場（スクリプトのプロパティ）に持ち、
 *      数えるあいだは鍵をかける（同時に来ても数え漏らさない）
 *   4. Google の送信枠の残りが MIN_QUOTA 通を切ったら送らない（持ち主のほかの用途のぶんを残す）
 * 札は「フォームの頁を開いて数秒待つ」機械なら通れる。それでも 3 と 4 があるので、枠を使い切られることはない。
 *
 * このファイルを直しても、サイトには何も起きない。Apps Script の画面に貼り直して「デプロイを管理 → 新しいバージョン」で反映する。
 */
const TO = 'ikemori@tsam.co.jp';
const MAX_PER_HOUR = 10;
const MAX_PER_DAY = 40;
const MIN_QUOTA = 20;
const TOKEN_MIN_SEC = 4;
const TOKEN_MAX_SEC = 2 * 60 * 60;
const TOKENS_PER_MINUTE = 60; // 札の発行そのものの上限（発行は軽いが、際限なくは出さない）

function now() {
  return Date.now();
}

// 開いて確かめる用。ブラウザでウェブアプリの URL を開くと {"ok":true,…} が出る。?token=1 を付けると札を一枚出す
function doGet(e) {
  try {
    if (!(e && e.parameter && e.parameter.token)) return reply({ ok: true, about: 'tsam.co.jp contact form endpoint' });
    const cache = CacheService.getScriptCache();
    const key = 't' + Math.floor(now() / 60000);
    const n = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(n), 120);
    if (n > TOKENS_PER_MINUTE) return reply({ ok: false, error: 'busy' });
    const body = Math.floor(now() / 1000) + '.' + Utilities.getUuid().replace(/-/g, '');
    return reply({ ok: true, token: body + '.' + sign(body), wait: TOKEN_MIN_SEC });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'server' });
  }
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

    const nonce = checkToken(String(p.token || ''));
    if (!nonce) return reply({ ok: false, error: 'token' });

    // ここから先は一人ずつ。札の使用済みの印と、通数の勘定を、同時に来た送信と取り違えないため
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply({ ok: false, error: 'busy' });
    try {
      const cache = CacheService.getScriptCache();
      if (cache.get('u' + nonce)) return reply({ ok: false, error: 'token' });

      const props = PropertiesService.getScriptProperties();
      const hour = Utilities.formatDate(new Date(now()), 'Asia/Tokyo', 'yyyyMMddHH');
      const day = hour.slice(0, 8);
      let c = {};
      try { c = JSON.parse(props.getProperty('COUNT') || '{}'); } catch (err) { c = {}; }
      const hn = c.hour === hour ? Number(c.hn) || 0 : 0;
      const dn = c.day === day ? Number(c.dn) || 0 : 0;
      if (hn >= MAX_PER_HOUR || dn >= MAX_PER_DAY) return reply({ ok: false, error: 'busy' });
      if (MailApp.getRemainingDailyQuota() < MIN_QUOTA) return reply({ ok: false, error: 'busy' });

      // 送る前に数える（送信が途中でこけても、数は減らさない。多めに数えるぶんには安全）
      props.setProperty('COUNT', JSON.stringify({ hour: hour, hn: hn + 1, day: day, dn: dn + 1 }));
      cache.put('u' + nonce, '1', 21600);

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

// 札を確かめる。通れば札の中の一回きりの番号を返す。だめなら ''
function checkToken(token) {
  const m = token.match(/^(\d{9,11})\.([0-9a-f]{32})\.([A-Za-z0-9_-]{20,64}=*)$/);
  if (!m) return '';
  if (!same(sign(m[1] + '.' + m[2]), m[3])) return '';
  const age = Math.floor(now() / 1000) - Number(m[1]);
  if (age < TOKEN_MIN_SEC || age > TOKEN_MAX_SEC) return '';
  return m[2];
}

// 署名。鍵はこの受け口のプロパティに一度だけ作って置く（コードにもサイトにも出ない）
function sign(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret()));
}

function secret() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SECRET');
  if (s) return s;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    s = props.getProperty('SECRET');
    if (!s) {
      s = Utilities.getUuid() + Utilities.getUuid();
      props.setProperty('SECRET', s);
    }
    return s;
  } finally {
    lock.releaseLock();
  }
}

// 文字ごとの早抜けをしない比べ方（合っている桁数を、かかった時間から読ませない）
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// 一行の欄：改行を落として（件名に改行を入れさせない）、長さを切る
function clean(v, max) {
  return String(v || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
