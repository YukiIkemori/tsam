/**
 * tsam.co.jp のお問い合わせフォームの受け口（Google Apps Script のウェブアプリ）。
 *
 * 【未検証】まだ一度も設置していない。設置の手順は docs/contact-form.md。
 *
 * やること：フォームから届いた内容を、TO のアドレスへメールで送る。それだけ。
 *   ・返信先（Reply-To）は書いた人のメールアドレスにしてあるので、届いたメールにそのまま返信できる
 *   ・SHEET_ID を入れると、同じ内容をスプレッドシートにも一行ずつ残す（メールが届かなかったときの控え）
 *   ・人には見えない欄（website）が埋まっていたら機械なので、何もせずに「送れた」と返す
 *   ・1時間に MAX_PER_HOUR 通を超えたら送らない（いたずらで Google の送信枠を使い切られないように）
 *
 * このファイルを直しても、サイトには何も起きない。Apps Script の画面に貼り直して「デプロイを管理 → 新しいバージョン」で反映する。
 */
const TO = 'ikemori@tsam.co.jp';
const SHEET_ID = ''; // 控えを残すスプレッドシートの ID（URL の /d/ と /edit のあいだ）。空なら残さない
const MAX_PER_HOUR = 20;

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

    const cache = CacheService.getScriptCache();
    const key = 'n' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHH');
    const n = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(n), 3600);
    if (n > MAX_PER_HOUR) return reply({ ok: false, error: 'busy' });

    const when = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    if (SHEET_ID) {
      SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([when, topic, name, org, email, message]);
    }
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
        '受付：' + when,
        '',
        message,
      ].join('\n'),
    });
    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'server' });
  }
}

// 開いて確かめる用。ブラウザでウェブアプリの URL を開くと、これが出る
function doGet() {
  return reply({ ok: true, about: 'tsam.co.jp contact form endpoint' });
}

// 一行の欄：改行を落として（件名に改行を入れさせない）、長さを切る
function clean(v, max) {
  return String(v || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
