// コーラルの輪を、読んでいる見出しの「o」から次の見出しの「o」へ運ぶ。
//
// 仕組み：
//   ・見出しの o（[data-slot] の中の .ring）が「席」。席に着いているあいだは、席そのものをコーラルにする
//     （ページと一緒に普通にスクロールするので、指の動きとずれない）
//   ・席と席のあいだだけ、画面に固定した輪（.traveler）を出して動かす。左端の細い線（レール）まで
//     小さくなって降り、次の見出しが上がってきたら大きくなって o に入る
//   ・席を離れるのは見出しが画面の上 10% を越えたとき、着くのは次の見出しが 64% まで上がったとき
//
// 動きを減らす設定（prefers-reduced-motion）のときは運ばない。全部の o がコーラルのまま止まっている。
// JS が動かないときも同じ見た目になる（global.css）。

const slots = [...document.querySelectorAll('[data-slot]')];
const traveler = document.querySelector('.traveler');
const still = matchMedia('(prefers-reduced-motion: reduce)');

if (slots.length > 1 && traveler && !still.matches) {
  document.documentElement.classList.add('ring-on');

  const LEAVE = 0.1;
  const ARRIVE = 0.64;
  const BASE = 100; // .traveler の素の直径（px）。大きさは scale で変える
  let pts = [];
  let segs = [];
  let railX = 0;
  let railD = 14;
  let seated = -2;
  let queued = false;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);

  function measure() {
    const vh = window.innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    // レールは左の余白のまんなか（global.css の --rail と同じ場所）
    railX = (parseFloat(getComputedStyle(document.querySelector('.top')).paddingLeft) || 24) / 2;
    railD = window.innerWidth < 700 ? 12 : 16;
    pts = slots.map((s) => {
      const r = s.querySelector('.ring').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY, d: r.width };
    });
    segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      let L = pts[i].y - vh * LEAVE;
      let R = pts[i + 1].y - vh * ARRIVE;
      if (R - L < 140) {
        const mid = (L + R) / 2;
        L = mid - 70;
        R = mid + 70;
      }
      segs.push({ L, R });
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
    seated = -2;
    update();
  }

  function seat(i) {
    if (seated === i) return;
    seated = i;
    slots.forEach((s, k) => s.classList.toggle('is-on', k === i));
    traveler.classList.toggle('is-moving', i < 0);
  }

  function update() {
    queued = false;
    const s = window.scrollY;
    let i = 0;
    while (i < segs.length && s >= segs[i].R) i++;
    if (i >= segs.length || s <= segs[i].L) return seat(i);

    const { L, R } = segs[i];
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
      const inn = ease(clamp((R - s) / Math.min(300, span * 0.36)));
      x = railX + (a.x - railX) * (1 - out) + (b.x - railX) * (1 - inn);
      d = railD + (a.d - railD) * (1 - out) + (b.d - railD) * (1 - inn);
    }
    const y = lerp(ya, yb, ease(t));
    traveler.style.transform = `translate3d(${x}px,${y}px,0) scale(${d / BASE})`;
    seat(-1);
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
}
