// コーラルの o（メンター）を、読んでいる見出しから次の見出しへ運ぶ。運ばれた先の一語だけが太る（太さの試作）。
//
// しくみ：
//   ・見出しの o（[data-slot]）が「席」。o は本物の字で、座っているあいだは席の字そのものをコーラルにする
//     （頁と一緒に普通にスクロールするので、指の動きとずれない）
//   ・席と席のあいだだけ、画面に固定した o（.traveler。同じ書体の「o」一字）を出して動かす。
//     左端のレールまで小さくなって降り、次の見出しが上がってきたら大きくなって、その o にぴったり重なる
//   ・見出しの太さ（--wg。200〜800）は、スクロールの位置だけで決まる。時間では動かさない
//     （行きと帰りで見え方が同じになるように。止まれば止まる）
//       着いた瞬間は細い → 読み進めると太る（UP の距離で 800）→ 離れる瞬間は 800 → 離れながら細る（DOWN）
//     運ばれる o も、離れるときは 800、着くときは 200。席の字と重なる瞬間に形がそろうので、受け渡しで跳ねない
//   ・席を離れるのは見出しが画面の上 10% を越えたとき、着くのは次の見出しが 64% まで上がったとき
//   ・頁の頭で開いたときだけ、最初の席は時間をかけて太る（入りの演出。一度きり）
//
// 動きを減らす設定（prefers-reduced-motion）のときは運ばない。見出しは全部太く、o は全部コーラルのまま止まる。
// JS が動かないときも同じ見た目になる（global.css の [data-swell]）。

const slots = [...document.querySelectorAll('[data-slot]')];
const traveler = document.querySelector('.traveler');
const still = matchMedia('(prefers-reduced-motion: reduce)');

if (slots.length && traveler && !still.matches) {
  const root = document.documentElement;
  root.classList.add('ring-on');

  const THIN = 200;
  const HEAVY = 800;
  const LEAVE = 0.1;
  const ARRIVE = 0.64;
  // Jost の o の実測（em。2026-11-27）。字の箱の左上から見た、字の真ん中。箱の頭はベースラインの 1.07em 上
  const CY = 0.84;
  const k = (w) => (w - THIN) / (HEAVY - THIN);
  const CX = (w) => 0.2765 + k(w) * 0.025;
  const INK = (w) => 0.469 + k(w) * 0.072; // 字の幅

  const swells = slots.map((s) => s.closest('[data-swell]') || s.closest('.display') || s.parentElement);
  const n = slots.length;
  const wNow = new Array(n).fill(-1);
  const oNow = new Array(n).fill('');
  let pts = [];
  let segs = [];
  let up = [];
  let down = 160;
  let railX = 0;
  let railFs = 26;
  let seated = -2;
  let queued = false;
  let intro = 1;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function setW(i, w) {
    w = Math.round(w);
    if (wNow[i] === w) return;
    wNow[i] = w;
    swells[i].style.setProperty('--wg', w);
  }

  // 席の o の色（global.css の .ring-on .o）。lifted はコーラルの側、k は濃さ（0〜1）
  function setO(i, lifted, k) {
    k = Math.round(k * 50) / 50;
    const key = (lifted ? 'c' : 'k') + k;
    if (oNow[i] === key) return;
    oNow[i] = key;
    slots[i].classList.toggle('is-lift', lifted);
    slots[i].style.setProperty('--k', k);
  }
  // p は 0 で席にいるのと同じ（コーラル）、1 で墨に戻りきる。まんなかで一度透ける
  const phase = (i, p) => (p < 0.5 ? setO(i, true, 1 - 2 * p) : setO(i, false, 2 * p - 1));
  // o が席から離れきる（重ならなくなる）までのスクロールの距離。字が大きいほど長い
  const lift = (i) => Math.max(28, Math.min(150, pts[i].fs * 0.35));

  function boxes(w) {
    for (const el of swells) el.style.setProperty('--wg', w);
    return slots.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.left, y: r.top + window.scrollY, fs: parseFloat(getComputedStyle(s).fontSize) };
    });
  }

  function measure() {
    const vh = window.innerHeight;
    const max = Math.max(0, root.scrollHeight - vh);
    // レールは左の余白のまんなか（global.css の --rail と同じ場所）
    railX = (parseFloat(getComputedStyle(document.querySelector('.top')).paddingLeft) || 24) / 2;
    railFs = (window.innerWidth < 700 ? 11 : 15) / INK(HEAVY);
    const thin = boxes(THIN);
    const heavy = boxes(HEAVY);
    wNow.fill(-1);
    pts = thin.map((t, i) => ({
      fs: t.fs,
      y: t.y + CY * t.fs,
      xt: t.x + CX(THIN) * t.fs,
      xh: heavy[i].x + CX(HEAVY) * heavy[i].fs,
    }));
    const UP = Math.min(220, vh * 0.24);
    down = Math.min(200, vh * 0.22);
    segs = [];
    for (let i = 0; i < n - 1; i++) {
      let L = pts[i].y - vh * LEAVE;
      let R = pts[i + 1].y - vh * ARRIVE;
      if (R - L < 140) {
        const mid = (L + R) / 2;
        L = mid - 70;
        R = mid + 70;
      }
      segs.push({ L, R });
    }
    // 頁の末尾：最後の席に着いてから太りきるまでの距離（UP）を、スクロールの残りに確保する
    let cap = max - Math.min(UP, 120) - 2;
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i].R > cap) segs[i].R = cap;
      if (segs[i].L > segs[i].R - 120) segs[i].L = segs[i].R - 120;
      cap = segs[i].L - 1;
    }
    // 頁の頭：最初の席を離れるのは 0 より後
    let floor = 1;
    for (const s of segs) {
      if (s.L < floor) s.L = floor;
      if (s.R < s.L + 120) s.R = s.L + 120;
      floor = s.R + 1;
    }
    // 太りきる距離は、次に離れるまでの間に収める（離れる瞬間は必ず 800）
    up = pts.map((_, i) => {
      if (i === 0) return 1;
      const A = segs[i - 1].R;
      const D = i < n - 1 ? segs[i].L : max;
      return Math.max(1, Math.min(UP, D - A));
    });
    seated = -2;
    update();
  }

  // スクロールの位置 s での、席 i の見出しの太さ
  function weightOf(i, s) {
    const A = i === 0 ? -Infinity : segs[i - 1].R;
    const D = i === n - 1 ? Infinity : segs[i].L;
    if (s < A) return THIN;
    if (s <= D) return i === 0 ? lerp(THIN, HEAVY, outExpo(intro)) : lerp(THIN, HEAVY, ease(clamp((s - A) / up[i])));
    return lerp(HEAVY, THIN, ease(clamp((s - D) / down)));
  }

  function seat(i) {
    if (seated === i) return;
    seated = i;
    slots.forEach((s, j) => s.classList.toggle('is-on', j === i));
    traveler.classList.toggle('is-moving', i < 0);
  }

  function place(x, y, fs, w) {
    traveler.style.fontSize = `${fs}px`;
    traveler.style.fontWeight = String(Math.round(w));
    traveler.style.transform = `translate3d(${x - CX(w) * fs}px,${y - CY * fs}px,0)`;
  }

  function update() {
    queued = false;
    const s = window.scrollY;
    if (segs.length && s > segs[0].L) intro = 1;
    for (let i = 0; i < n; i++) setW(i, weightOf(i, s));

    let i = 0;
    while (i < segs.length && s >= segs[i].R) i++;
    if (i >= segs.length || s <= segs[i].L) {
      for (let j = 0; j < n; j++) setO(j, false, 1);
      return seat(i);
    }

    const { L, R } = segs[i];
    // 離れたばかりの席と着く直前の席は、o をコーラルに寄せておく（運ばれる o と重なっている間は一つに見える）
    for (let j = 0; j < n; j++) {
      if (j === i) phase(j, clamp((s - L) / lift(j)));
      else if (j === i + 1) phase(j, clamp((R - s) / lift(j)));
      else setO(j, false, 1);
    }
    const a = pts[i];
    const b = pts[i + 1];
    const span = R - L;
    const t = (s - L) / span;
    const ya = a.y - L; // 席を離れる瞬間の、画面の中での高さ
    const yb = b.y - R; // 次の席に着く瞬間の、画面の中での高さ
    let x, fs, w;
    if (span < 520) {
      // 近い席どうしは、レールに寄らずにまっすぐ渡る
      const e = ease(t);
      x = lerp(a.xh, b.xt, e);
      fs = lerp(a.fs, b.fs, e);
      w = lerp(HEAVY, THIN, e);
    } else {
      const out = ease(clamp((s - L) / Math.min(240, span * 0.3)));
      const inn = ease(clamp((R - s) / Math.min(300, span * 0.36)));
      x = railX + (a.xh - railX) * (1 - out) + (b.xt - railX) * (1 - inn);
      fs = railFs + (a.fs - railFs) * (1 - out) + (b.fs - railFs) * (1 - inn);
      w = lerp(THIN, HEAVY, inn);
    }
    place(x, lerp(ya, yb, ease(t)), fs, w);
    seat(-1);
  }

  const ask = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  let mq = false;
  const remeasure = () => {
    if (!mq) {
      mq = true;
      requestAnimationFrame(() => {
        mq = false;
        measure();
      });
    }
  };

  // 入り：頁の頭で開いたときだけ、最初の席が時間をかけて太る
  if (window.scrollY < 8 && !location.hash) {
    intro = 0;
    const t0 = performance.now() + 420;
    const tick = (now) => {
      intro = Math.max(intro, clamp((now - t0) / 1400));
      ask();
      if (intro < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  document.fonts?.ready.then(remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  measure();
}
