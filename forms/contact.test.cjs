// forms/contact.gs を、Google の部品（CacheService など）と Cloudflare の返事を真似た箱の中で動かして確かめる。
// 使い方: node forms/contact.test.cjs
// **本物の Apps Script・本物の Turnstile で確かめたことにはならない。**ここで見ているのは、確認・上限・鍵の筋道だけ。
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

function box() {
  const cache = new Map();
  const props = new Map([['TURNSTILE_SECRET', 'test-secret']]);
  const sent = [];
  const asked = [];
  // cf：Cloudflare が返すもの。試験ごとに書き換える
  const state = { t: Date.UTC(2026, 10, 26, 1, 0, 0), quota: 100, locked: false, cf: { code: 200, body: { success: true, action: 'tsam_contact', hostname: 'tsam.co.jp' } } };
  const ctx = {
    console: { error() {} },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !state.locked, waitLock() {}, releaseLock() {} }) },
    MailApp: { getRemainingDailyQuota: () => state.quota, sendEmail: (m) => sent.push(m) },
    UrlFetchApp: {
      fetch: (url, opt) => {
        asked.push({ url, opt });
        if (state.cf.throws) throw new Error('network');
        return { getResponseCode: () => state.cf.code, getContentText: () => (typeof state.cf.body === 'string' ? state.cf.body : JSON.stringify(state.cf.body)) };
      },
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }) },
    Utilities: {
      formatDate: (d, tz, f) => {
        const j = new Date(d.getTime() + 9 * 3600e3).toISOString();
        const [Y, M, D, h, m] = [j.slice(0, 4), j.slice(5, 7), j.slice(8, 10), j.slice(11, 13), j.slice(14, 16)];
        return f.replace('yyyy', Y).replace('MM', M).replace('dd', D).replace('HH', h).replace('mm', m);
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'contact.gs'), 'utf8'), ctx);
  ctx.now = () => state.t;
  const good = { name: '山田', organization: '', email: 'a@example.com', topic: '講演', message: 'こんにちは', website: '', 'cf-turnstile-response': 'tok-1' };
  return {
    ctx, sent, asked, state, props,
    post: (extra) => ctx.doPost({ parameter: { ...good, ...extra } }),
    wait: (sec) => { state.t += sec * 1000; },
  };
}

let n = 0;
const test = (name, fn) => { fn(box()); n++; console.log('ok', name); };

test('確認が通れば届く。Cloudflare には鍵と確認を渡している', (b) => {
  assert.deepStrictEqual(b.post({}), { ok: true });
  assert.strictEqual(b.sent.length, 1);
  assert.strictEqual(b.sent[0].to, 'ikemori@tsam.co.jp');
  assert.strictEqual(b.sent[0].replyTo, 'a@example.com');
  assert.strictEqual(b.asked.length, 1);
  assert.strictEqual(b.asked[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepStrictEqual({ ...b.asked[0].opt.payload }, { secret: 'test-secret', response: 'tok-1' });
});
test('確認が無い・長すぎるものは、問い合わせもせずに断る', (b) => {
  assert.strictEqual(b.post({ 'cf-turnstile-response': '' }).error, 'verification');
  assert.strictEqual(b.post({ 'cf-turnstile-response': 'x'.repeat(2049) }).error, 'verification');
  assert.strictEqual(b.asked.length, 0);
  assert.strictEqual(b.sent.length, 0);
});
test('Cloudflare が通さなかった確認（偽物・使い回し）は送らない', (b) => {
  b.state.cf.body = { success: false, 'error-codes': ['timeout-or-duplicate'] };
  assert.strictEqual(b.post({}).error, 'verification');
  assert.strictEqual(b.sent.length, 0);
});
test('別の用途・別のサイトで出た確認は送らない', (b) => {
  b.state.cf.body = { success: true, action: 'login', hostname: 'tsam.co.jp' };
  assert.strictEqual(b.post({}).error, 'verification');
  b.state.cf.body = { success: true, action: 'tsam_contact', hostname: 'evil.example' };
  assert.strictEqual(b.post({}).error, 'verification');
  b.state.cf.body = { success: true, hostname: 'tsam.co.jp' };
  assert.strictEqual(b.post({}).error, 'verification');
  assert.strictEqual(b.sent.length, 0);
});
test('見本のホスト名は、プロパティ HOSTS に入れたときだけ通る', (b) => {
  b.state.cf.body = { success: true, action: 'tsam_contact', hostname: 'tsam-co-jp.web.app' };
  assert.strictEqual(b.post({}).error, 'verification');
  b.props.set('HOSTS', 'tsam.co.jp, tsam-co-jp.web.app');
  assert.strictEqual(b.post({}).ok, true);
  assert.strictEqual(b.sent.length, 1);
});
test('シークレットキーが入っていなければ、何も送らない', (b) => {
  b.props.delete('TURNSTILE_SECRET');
  assert.strictEqual(b.post({}).error, 'server');
  assert.strictEqual(b.asked.length, 0);
  assert.strictEqual(b.sent.length, 0);
});
test('Cloudflare に繋がらない・返事が読めないときは送らない', (b) => {
  b.state.cf = { code: 500, body: 'oops' };
  assert.strictEqual(b.post({}).error, 'server');
  b.state.cf = { code: 200, body: '<html>' };
  assert.strictEqual(b.post({}).error, 'server');
  b.state.cf = { throws: true };
  assert.strictEqual(b.post({}).error, 'server');
  assert.strictEqual(b.sent.length, 0);
});
test('人には見えない欄が埋まっていたら、送れたふりをして捨てる', (b) => {
  assert.deepStrictEqual(b.post({ website: 'http://spam.example' }), { ok: true });
  assert.strictEqual(b.asked.length, 0);
  assert.strictEqual(b.sent.length, 0);
});
test('名前・内容が空、メールアドレスの形でないものは、問い合わせもせずに断る', (b) => {
  assert.strictEqual(b.post({ name: ' ' }).error, 'invalid');
  assert.strictEqual(b.post({ message: '' }).error, 'invalid');
  assert.strictEqual(b.post({ email: 'abc' }).error, 'invalid');
  assert.strictEqual(b.asked.length, 0);
});
test('1時間に10通まで。時間が変われば、また送れる', (b) => {
  for (let i = 0; i < 10; i++) { assert.strictEqual(b.post({}).ok, true); b.wait(61); }
  assert.strictEqual(b.post({}).error, 'busy');
  assert.strictEqual(b.sent.length, 10);
  const before = b.asked.length;
  assert.strictEqual(b.post({}).error, 'busy');
  assert.strictEqual(b.asked.length, before, '上限のあとは Cloudflare に問い合わせない');
  b.wait(3600);
  assert.strictEqual(b.post({}).ok, true);
});
test('1日に40通まで。日が変われば、また送れる', (b) => {
  let ok = 0;
  for (let h = 0; h < 6; h++) { for (let i = 0; i < 10; i++) { if (b.post({}).ok) ok++; b.wait(61); } b.wait(3600); }
  assert.strictEqual(ok, 40);
  assert.strictEqual(b.sent.length, 40);
  assert.strictEqual(b.post({}).error, 'busy');
  b.wait(24 * 3600);
  assert.strictEqual(b.post({}).ok, true);
});
test('数は消えない置き場にある（キャッシュが消えても数え直さない）', (b) => {
  for (let i = 0; i < 10; i++) { b.post({}); b.wait(61); }
  const c = JSON.parse(b.props.get('COUNT'));
  assert.strictEqual(c.hn, 10);
  assert.strictEqual(c.dn, 10);
});
test('Google の送信枠の残りが少ないときは送らない', (b) => {
  b.state.quota = 19;
  assert.strictEqual(b.post({}).error, 'busy');
  assert.strictEqual(b.sent.length, 0);
});
test('鍵が取れないとき（同時に来すぎ）は送らない', (b) => {
  b.state.locked = true;
  assert.strictEqual(b.post({}).error, 'busy');
  assert.strictEqual(b.sent.length, 0);
});
test('Cloudflare への問い合わせは1分に10回まで', (b) => {
  b.state.cf.body = { success: false };
  for (let i = 0; i < 10; i++) assert.strictEqual(b.post({}).error, 'verification');
  assert.strictEqual(b.post({}).error, 'busy');
  assert.strictEqual(b.asked.length, 10);
  b.wait(61);
  b.state.cf.body = { success: true, action: 'tsam_contact', hostname: 'tsam.co.jp' };
  assert.strictEqual(b.post({}).ok, true);
});
test('件名に改行を入れさせない。長すぎる内容は切る', (b) => {
  b.post({ name: '山田\r\nBcc: x@example.com', message: 'あ'.repeat(6000) });
  assert.ok(!/[\r\n]/.test(b.sent[0].subject));
  assert.ok(b.sent[0].body.length < 5400);
});
test('ただ開いたときは、案内だけを返す', (b) => {
  assert.deepStrictEqual(b.ctx.doGet({ parameter: { token: '1' } }), { ok: true, about: 'tsam.co.jp contact form endpoint' });
});

console.log(`${n} 件とも通った`);
