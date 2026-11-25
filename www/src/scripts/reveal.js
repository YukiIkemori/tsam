// 画面に入ったものを一度だけ、下から静かに出す。JS が無ければ最初から見えている（global.css の html.js .rv）。
const els = document.querySelectorAll('.rv');
if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  els.forEach((el) => io.observe(el));
}

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
