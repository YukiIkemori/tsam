// activities.json の本文に入っている [文字](URL) だけをリンクに直す。ほかの記法は扱わない。
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(src: string): string {
  let out = '';
  let last = 0;
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  for (const m of src.matchAll(re)) {
    out += esc(src.slice(last, m.index)) + `<a href="${esc(m[2])}" rel="noopener">${esc(m[1])}</a>`;
    last = m.index! + m[0].length;
  }
  return out + esc(src.slice(last));
}
