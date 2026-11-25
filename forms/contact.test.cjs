// forms/contact.gs を、Google の部品（CacheService など）を真似た箱の中で動かして確かめる。
// 使い方: node forms/contact.test.cjs
// **本物の Apps Script で確かめたことにはならない。**ここで見ているのは、札・上限・鍵の筋道だけ。
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

function box() {
  const cache = new Map();
  const props = new Map();
  const sent = [];
  const state = { t: Date.UTC(2026, 10, 26, 1, 0, 0), quota: 100, locked: false };
  const ctx = {
    console: { error() {} },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !state.locked, waitLock() {}, releaseLock() {} }) },
    MailApp: { getRemainingDailyQuota: () => state.quota, sendEmail: (m) => sent.push(m) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()],
      base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
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
  const good = { name: '山田', organization: '', email: 'a@example.com', topic: '講演', message: 'こんにちは' };
  return {
    ctx, sent, state, props,
    token: () => ctx.doGet({ parameter: { token: '1' } }).token,
    post: (extra) => ctx.doPost({ parameter: { ...good, ...extra } }),
    wait: (sec) => { state.t += sec * 1000; },
  };
}

let n = 0;
const test = (name, fn) => { fn(box()); n++; console.log('ok', name); };

test('札をもらい、数秒おいて送ると届く', (b) => {
  const token = b.token();
  b.wait(5);
  assert.deepStrictEqual(b.post({ token }), { ok: true });
  assert.strictEqual(b.sent.length, 1);
  assert.strictEqual(b.sent[0].to, 'ikemori@tsam.co.jp');
  assert.strictEqual(b.sent[0].replyTo, 'a@example.com');
});
test('札が無い・でたらめ・署名違いは送らない', (b) => {
  const token = b.token();
  b.wait(5);
  assert.strictEqual(b.post({}).error, 'token');
  assert.strictEqual(b.post({ token: 'abc' }).error, 'token');
  assert.strictEqual(b.post({ token: token.slice(0, -3) + (token.endsWith('AAA') ? 'BBB' : 'AAA') }).error, 'token');
  const [ts, nonce, sig] = token.split('.');
  assert.strictEqual(b.post({ token: `${Number(ts) - 100}.${nonce}.${sig}` }).error, 'token'); // 時刻だけ書き換え
  assert.strictEqual(b.sent.length, 0);
});
test('もらってすぐの札と、古すぎる札は送らない', (b) => {
  const t1 = b.token();
  b.wait(1);
  assert.strictEqual(b.post({ token: t1 }).error, 'token');
  const t2 = b.token();
  b.wait(2 * 3600 + 1);
  assert.strictEqual(b.post({ token: t2 }).error, 'token');
  assert.strictEqual(b.sent.length, 0);
});
test('同じ札は一度しか使えない', (b) => {
  const token = b.token();
  b.wait(5);
  assert.strictEqual(b.post({ token }).ok, true);
  assert.strictEqual(b.post({ token }).error, 'token');
  assert.strictEqual(b.sent.length, 1);
});
test('見えない欄が埋まっていたら、送らずに「送れた」と返す', (b) => {
  assert.deepStrictEqual(b.post({ website: 'http://spam' }), { ok: true });
  assert.strictEqual(b.sent.length, 0);
});
test('欄が足りない・メールアドレスの形でないものは送らない', (b) => {
  const token = b.token();
  b.wait(5);
  assert.strictEqual(b.post({ token, name: '' }).error, 'invalid');
  assert.strictEqual(b.post({ token, email: 'x' }).error, 'invalid');
  assert.strictEqual(b.sent.length, 0);
});
test('件名に改行を入れさせない', (b) => {
  const token = b.token();
  b.wait(5);
  b.post({ token, name: '山田\nBcc: x@example.com' });
  assert.ok(!/[\r\n]/.test(b.sent[0].subject));
});
test('1時間に10通まで。時間が替わるとまた送れる', (b) => {
  for (let i = 0; i < 12; i++) {
    const token = b.token();
    b.wait(5);
    const r = b.post({ token });
    assert.strictEqual(r.ok, i < 10, `i=${i}`);
  }
  assert.strictEqual(b.sent.length, 10);
  b.wait(3600);
  const token = b.token();
  b.wait(5);
  assert.strictEqual(b.post({ token }).ok, true);
});
test('1日に40通まで。日が替わるとまた送れる', (b) => {
  let ok = 0;
  for (let h = 0; h < 8; h++) {
    for (let i = 0; i < 10; i++) {
      const token = b.token();
      b.wait(5);
      if (b.post({ token }).ok) ok++;
    }
    b.wait(3600);
  }
  assert.strictEqual(ok, 40);
  b.wait(24 * 3600);
  const token = b.token();
  b.wait(5);
  assert.strictEqual(b.post({ token }).ok, true);
});
test('Google の送信枠の残りが少ないときは送らない', (b) => {
  b.state.quota = 19;
  const token = b.token();
  b.wait(5);
  assert.strictEqual(b.post({ token }).error, 'busy');
  assert.strictEqual(b.sent.length, 0);
});
test('鍵が取れないときは送らない', (b) => {
  const token = b.token();
  b.wait(5);
  b.state.locked = true;
  assert.strictEqual(b.post({ token }).error, 'busy');
  assert.strictEqual(b.sent.length, 0);
});
test('札の発行にも上限がある', (b) => {
  let last;
  for (let i = 0; i < 61; i++) last = b.ctx.doGet({ parameter: { token: '1' } });
  assert.strictEqual(last.error, 'busy');
});
test('ただ開いたときは、札を出さない', (b) => {
  const r = b.ctx.doGet({ parameter: {} });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.token, undefined);
});
console.log(`${n} 件とも通った`);
