// スクロールに合わせた小さな動き。どれも JS が無ければ最初から仕上がりの形で見えている（global.css の html.js …）。
//   ・画面に入ったものを一度だけ、下から静かに出す（.rv）
//   ・極細から太る語（.swell）のうち、輪の席でないものを、画面に入ったときに太らせる（席のある見出しは ring.js が受け持つ）
//   ・年表と、年ごとの一覧、ブログのタグの壁（[data-focus]）：画面のまんなかを横切っている行・段に .is-focus を付ける（その年の数字・その語が太る）
//   ・読み進めるにつれて、薄い字が頭から墨になる（.fill の --p）
//   ・頁の頭を離れたら html に .scrolled を付ける（広い画面で、右上の円い押しどころを出す合図）
//   ・読み込みが済んだら html に .smooth を付ける（頁の中の見出しへ、滑らかに送る合図）
import { ready } from './ring.js';

const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v) => Math.min(1, Math.max(0, v));

const els = document.querySelectorAll('.rv, .swell:not([data-hold])');
if (!('IntersectionObserver' in window) || still) {
  els.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  ready.then(() => els.forEach((el) => io.observe(el)));
}

// 画面のまんなか（少し上）を横切っている行に印を付ける。動きを控える設定のときも印は付ける
// （太さがその場で切り替わるだけで、動きにはならない。CSS の側が transition を外している）
const rows = document.querySelectorAll('.years li, [data-focus]');
if (rows.length && 'IntersectionObserver' in window) {
  const fo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.classList.toggle('is-focus', e.isIntersecting);
    },
    { rootMargin: '-46% 0px -54% 0px' },
  );
  rows.forEach((el) => fo.observe(el));
}

const fills = still ? [] : [...document.querySelectorAll('.fill')];
let queued = false;
function update() {
  queued = false;
  root.classList.toggle('scrolled', window.scrollY > 72);
  const vh = window.innerHeight;
  for (const el of fills) {
    // 段の頭が画面の下から入ってきたところで 0、段の底が画面のまんなかまで上がったところで 1
    const b = el.parentElement.getBoundingClientRect();
    if (b.bottom < -vh || b.top > vh * 2) continue;
    el.style.setProperty('--p', clamp((vh * 0.92 - b.top) / (b.height + vh * 0.42)).toFixed(3));
  }
}
const ask = () => {
  if (!queued) {
    queued = true;
    requestAnimationFrame(update);
  }
};
window.addEventListener('scroll', ask, { passive: true });
window.addEventListener('resize', ask);
update();

// 頁の中の見出しへ滑らかに送るのは、読み込みが済んでから（global.css の html.smooth）。
// 見出しへ直に来たとき（/#contact）の最初のひと跳びは、その場で着かせる
const smooth = () => setTimeout(() => root.classList.add('smooth'), 400);
if (document.readyState === 'complete') smooth();
else window.addEventListener('load', smooth, { once: true });

// 旧サイトのアンカー（/#section-contact など）で来た人を、新しい見出しへ連れていく
const old = {
  '#section-company': '#company',
  '#section-my-background': '#background',
  '#section-publication': '#books',
  '#section-news': '#recent',
  '#section-contact': '#contact',
  '#section-consulting': '#contact',
};
if (old[location.hash]) location.replace(old[location.hash]);
