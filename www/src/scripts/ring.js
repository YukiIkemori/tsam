// コーラルの輪を、読んでいる見出しの「o」から次の見出しの「o」へ運ぶ。輪が着いたら、そこから次の節が円く開く。
//
// 仕組み：
//   ・席 … 見出しの o（[data-slot] の中の .ring）。席に着いているあいだは、席そのものをコーラルにする
//     （ページと一緒に普通にスクロールするので、指の動きとずれない）
//   ・渡り … 席と席のあいだだけ、画面に固定した輪（.traveler）を出して動かす。左端の細い線（レール）まで
//     小さくなって降り、次の席が近づいたら大きくなって o に入る。
//     席を離れるのは見出しが画面の上 10% を越えたとき、着くのは次の見出しが 64% まで上がったとき
//   ・開き … [data-iris] の付いた節は、輪が着くまで閉じている（clip-path の円の半径が 0。前の節の地が続いて見える）。
//     輪が着くと、その輪を芯に円が広がって節が開き、円の縁を、輪と同じコーラルの線（.shock）がなぞって画面の外へ抜ける。
//     着くのは、節の頭が画面の 45% まで上がったとき（輪が画面からはみ出すほど大きい見出しは、輪が入りきったとき）。
//     閉じているのは輪が着く前だけで、どこまでスクロールしたかだけで決まる（戻せば閉じる）
//   ・太り … 席のある見出し（.swell）は、輪が着いたときに極細から太る（輪の位置は動かない。global.css）
//
// 動きを減らす設定（prefers-reduced-motion）のときは何もしない。全部の o がコーラルのまま止まっていて、節は最初から開いている。
// JS が動かないときも同じ見た目になる（global.css）。

// 書体が届いて、最初の一枚が描かれたあと（太っていく動きを、ここから始める）
export const ready = new Promise((done) => {
  let did = false;
  const go = () => {
    if (did) return;
    did = true;
    requestAnimationFrame(() => requestAnimationFrame(done));
  };
  setTimeout(go, 1200);
  (document.fonts?.ready ?? Promise.resolve()).then(go);
});
window.__tsam = 1; // 動いた印（Boot.astro が 4 秒後に見る）

const root = document.documentElement;
const slots = [...document.querySelectorAll('[data-slot]')];
const traveler = document.querySelector('.traveler');
const shock = document.querySelector('.shock');
const still = matchMedia('(prefers-reduced-motion: reduce)');

if (slots.length > 1 && traveler && !still.matches) {
  root.classList.add('ring-on');

  const LEAVE = 0.1;
  const ARRIVE = 0.64;
  const BASE = 100; // .traveler の素の直径（px）。大きさは scale で変える
  const STROKE = 0.064 / 0.48; // 輪の線の太さ ÷ 外径（global.css の .ring）
  const HORIZON = 0.45; // 開く節に輪が着くとき、その節の頭が画面のどこまで上がっているか
  const OPEN = 1250; // 節が開く時間（ms）
  const SHUT = 420;
  const CURVE = 'cubic-bezier(0.22, 0.45, 0.3, 1)';

  // 席のある見出しは、輪が着いたときに太らせる（reveal.js には触らせない）
  const swells = slots.map((s) => s.closest('.swell'));
  swells.forEach((el) => el && (el.dataset.hold = ''));

  // 円く開く節。芯は、その節で最初の席
  const irises = [];
  slots.forEach((s, k) => {
    const sec = k > 0 && s.closest('[data-iris]');
    if (sec && !irises.some((e) => e.sec === sec)) irises.push({ k, sec, els: [sec], on: null });
  });
  // 頁の最後の節のあとに続く地（フッター）は、その節と一緒に開く
  const foot = document.querySelector('.foot');
  const last = irises[irises.length - 1];
  if (last && foot && !last.sec.nextElementSibling && last.sec.parentElement === document.querySelector('main')) last.els.push(foot);

  let pts = [];
  let segs = [];
  let railX = 0;
  let railD = 14;
  let seated = -2;
  let reached = -2;
  let live = false; // 最初の一枚が描かれたあと（それまでは動かさずに形だけ決める）
  let fresh = true; // 測り直した直後（節の開き閉じを、動かさずに形だけ合わせる）
  let queued = false;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);

  function measure() {
    const vh = window.innerHeight;
    const vw = root.clientWidth;
    const sy = window.scrollY;
    // 頁の底は body の底で測る（閉じた節の代わりに敷く地 ::after が、頁の外へはみ出していても数えない）
    const end = document.body.getBoundingClientRect().bottom + sy;
    const max = Math.max(0, end - vh);
    // 閉じた節の代わりに敷く、前の節の地の続き。頁の底を越えない長さにする（global.css の --ext）
    for (const e of irises) {
      const prev = e.sec.previousElementSibling;
      if (prev) prev.style.setProperty('--ext', `${Math.max(0, Math.min(vh * 1.3, end - (prev.getBoundingClientRect().bottom + sy))).toFixed(0)}px`);
    }
    // レールは左の余白のまんなか（global.css の --rail と同じ場所）
    railX = (parseFloat(getComputedStyle(document.querySelector('.top')).paddingLeft) || 24) / 2;
    railD = window.innerWidth < 700 ? 12 : 16;
    pts = slots.map((s) => {
      const r = s.querySelector('.ring').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 + sy, d: r.width };
    });
    const tops = new Map(irises.map((e) => [e.k, e.sec.getBoundingClientRect().top + sy]));
    segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i + 1];
      let L = pts[i].y - vh * LEAVE;
      let R = p.y - vh * ARRIVE;
      let far = 300; // 着く手前、レールを離れて席へ寄っていく長さ
      if (tops.has(i + 1)) {
        // 開く節：節の頭が画面の HORIZON まで上がったら着く。ただし、輪が画面の底からはみ出しているあいだは待つ
        const top = tops.get(i + 1);
        R = Math.max(p.y + p.d / 2 + 24 - vh, Math.min(R, top - vh * HORIZON));
        // 閉じた節（何も無い地）が画面に入ってきたら、輪はもう席へ向かいはじめる
        far = Math.max(far, R - (top - vh));
      }
      if (R - L < 180) L = R - 180;
      segs.push({ L, R, far });
    }
    // ページの末尾：スクロールしきっても着けない席が出ないように、うしろから詰める
    let cap = max - 2;
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i].R > cap) segs[i].R = cap;
      if (segs[i].L > segs[i].R - 120) segs[i].L = segs[i].R - 120;
      cap = segs[i].L - 1;
    }
    // ページの頭：最初の席を離れるのは 0 より後
    let floor = 1;
    for (const s of segs) {
      if (s.L < floor) s.L = floor;
      if (s.R < s.L + 120) s.R = s.L + 120;
      floor = s.R + 1;
    }
    for (const e of irises) {
      const p = pts[e.k];
      e.at = segs[e.k - 1].R;
      e.off = e.at > max - 1; // 着けない（頁が短くてスクロールできない）ときは、閉じない
      e.cx = p.x;
      e.cy = p.y;
      e.r0 = p.d / 2;
      e.w0 = p.d * STROKE;
      e.R = Math.hypot(Math.max(p.x, vw - p.x), vh) + 40; // 開ききった円：席が画面のどこにあっても、画面の外まで届く
      e.boxes = e.els.map((el) => {
        const b = el.getBoundingClientRect();
        return { el, x: b.left, y: b.top + sy };
      });
      e.on = null;
    }
    seated = -2;
    fresh = true;
    update();
  }

  function seat(i, reach) {
    if (seated !== i) {
      seated = i;
      slots.forEach((s, k) => s.classList.toggle('is-on', k === i));
      traveler.classList.toggle('is-moving', i < 0);
    }
    if (live && reached !== reach) {
      reached = reach;
      swells.forEach((el, k) => el && el.classList.toggle('in', k <= reach));
    }
  }

  // 節を開く・閉じる。開くときは、席の輪の大きさの円から、画面の外まで。instant は、動かさずにその形にする
  const circle = (e, b, r) => `circle(${r.toFixed(1)}px at ${(e.cx - b.x).toFixed(1)}px ${(e.cy - b.y).toFixed(1)}px)`;
  let wave = null; // いま縁の線がなぞっている節
  function turn(e, on, instant) {
    if (e.on === on) return;
    e.on = on;
    for (const b of e.boxes) {
      const st = b.el.style;
      clearTimeout(b.timer);
      if (instant) {
        st.transition = 'none';
        st.clipPath = on ? '' : circle(e, b, 0);
        continue;
      }
      // いまの形から始める（開いている途中で戻ったときも、飛ばない）
      const cur = getComputedStyle(b.el).clipPath;
      st.transition = 'none';
      st.clipPath = on ? circle(e, b, e.r0) : cur && cur !== 'none' ? cur : circle(e, b, e.R);
      void b.el.offsetWidth;
      st.transition = `clip-path ${on ? OPEN : SHUT}ms ${on ? CURVE : 'cubic-bezier(0.6, 0, 0.8, 0.4)'}`;
      st.clipPath = circle(e, b, on ? e.R : 0);
      if (on) b.timer = setTimeout(() => ((st.transition = ''), (st.clipPath = '')), OPEN + 80);
    }
    if (!shock) return;
    const st = shock.style;
    clearTimeout(shock.timer);
    if (on && !instant) {
      // 縁の線：輪そのものの太さから始まって、広がるにつれて細くなり、画面の外へ抜けるころに消える
      wave = e;
      st.transition = 'none';
      st.setProperty('--sx', `${e.cx.toFixed(1)}px`);
      st.setProperty('--sy', `${(e.cy - window.scrollY).toFixed(1)}px`);
      st.setProperty('--sr2', `${e.r0.toFixed(1)}px`);
      st.setProperty('--sw2', `${e.w0.toFixed(1)}px`);
      st.opacity = '1';
      shock.classList.add('is-on');
      void shock.offsetWidth;
      st.transition = `--sr2 ${OPEN}ms ${CURVE}, --sw2 ${OPEN * 0.7}ms ${CURVE}, opacity ${OPEN * 0.4}ms linear ${OPEN * 0.6}ms`;
      st.setProperty('--sr2', `${e.R.toFixed(1)}px`);
      st.setProperty('--sw2', '1.5px');
      st.opacity = '0';
      shock.timer = setTimeout(() => (shock.classList.remove('is-on'), (wave = null)), OPEN + 80);
    } else if (wave === e || instant) {
      wave = null;
      st.transition = 'none';
      shock.classList.remove('is-on');
    }
  }

  function update() {
    queued = false;
    const s = window.scrollY;
    for (const e of irises) turn(e, e.off || s >= e.at, !live || fresh);
    fresh = false;
    if (wave) shock.style.setProperty('--sy', `${(wave.cy - s).toFixed(1)}px`); // 開いているあいだも、芯は頁と一緒に動く
    let i = 0;
    while (i < segs.length && s >= segs[i].R) i++;
    if (i >= segs.length || s <= segs[i].L) return seat(i, i);

    const { L, R, far } = segs[i];
    const a = pts[i];
    const b = pts[i + 1];
    const span = R - L;
    const t = (s - L) / span;
    const ya = a.y - L; // 席を離れる瞬間の、画面の中での高さ
    const yb = b.y - R; // 次の席に着く瞬間の、画面の中での高さ
    let x, d;
    if (span < 520) {
      // 近い席どうしは、レールに寄らずにまっすぐ渡る
      const e = ease(t);
      x = lerp(a.x, b.x, e);
      d = lerp(a.d, b.d, e);
    } else {
      const out = ease(clamp((s - L) / Math.min(240, span * 0.3)));
      const inn = ease(clamp((R - s) / Math.min(far, span * 0.6)));
      x = railX + (a.x - railX) * (1 - out) + (b.x - railX) * (1 - inn);
      d = railD + (a.d - railD) * (1 - out) + (b.d - railD) * (1 - inn);
    }
    const y = lerp(ya, yb, ease(t));
    traveler.style.transform = `translate3d(${x}px,${y}px,0) scale(${d / BASE})`;
    seat(-1, i);
  }

  const ask = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  measure();
  ready.then(() => {
    live = true;
    seated = -2;
    update();
  });
}
