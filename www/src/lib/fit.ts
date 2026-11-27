// 大きな欧文（Jost）を、置き場所の幅ちょうどに組むための実測。
//
// このサイトの大きな字は「幅いっぱいに組む」のが決まり。短い語ほど大きく、長い語ほど小さくなる。
// 字の大きさは CSS だけで決まる（font-size = 置き場所の幅 ÷ その語の墨の幅）。JS で測り直さないので、
// 読み込みの途中でがたつかない。その「語の墨の幅」を、build のときに書体のファイルから実測するのがこのファイル。
//
//   measure('C|mpany', 900) … 「|」は輪になる o の位置。墨の幅・左右の空き・天と底（どれも em）を返す
//   fitVars('C|mpany', 900) … CSS に渡す変数（style 属性に書く文字列）
//
// 書体を替えたら、この実測と global.css の輪の寸法（.ring）が変わる。blog も同じものを読む。
import { createRequire } from 'node:module';
import * as fontkit from 'fontkit';

const require = createRequire(import.meta.url);
const base: any = fontkit.openSync(require.resolve('@fontsource-variable/jost/files/jost-latin-wght-normal.woff2'));
const UPM: number = base.unitsPerEm;
const made = new Map<number, any>();
const at = (w: number) => made.get(w) ?? (made.set(w, base.getVariation({ wght: w })), made.get(w));

export const HEAVY = 900; // 極太
export const THIN = 200; // 極細
// 輪（o の代わりに置く正円）。外径・線の太さ・ベースラインからの下がり（em）。太さによらず同じ形
export const RING = { d: 0.48, s: 0.064, y: 0.01 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 字間。太いほど詰める（100 で -0.008em、400 で -0.016em、900 で -0.03em。母型と同じ点で折れる直線）
export const track = (w: number) => (w <= 400 ? lerp(-0.008, -0.016, (w - 100) / 300) : lerp(-0.016, -0.03, (w - 400) / 500));
// 輪の左右の空き。細い字のときは o の送りのまま、太い字では少し詰める
export const ringSide = (w: number) => lerp(0.035, 0.046, (w - 100) / 800);

export type Measure = { ink: number; lsb: number; rsb: number; top: number; bot: number; adv: number };

const cache = new Map<string, Measure>();
export function measure(text: string, w: number, trk = track(w)): Measure {
  const key = `${text}@${w}@${trk}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = at(w);
  let adv = 0;
  let n = 0;
  let top = 0;
  let bot = 0;
  let lsb: number | null = null;
  let rsb = 0;
  text.split('|').forEach((part, i) => {
    if (i > 0) {
      const side = ringSide(w);
      adv += RING.d + side * 2;
      n++;
      lsb ??= side;
      rsb = side;
      top = Math.max(top, RING.d - RING.y);
      bot = Math.max(bot, RING.y);
    }
    if (!part) return;
    const run = f.layout(part);
    run.glyphs.forEach((g: any, k: number) => {
      adv += run.positions[k].xAdvance / UPM;
      n++;
      const b = g.bbox;
      if (!Number.isFinite(b.minX)) return; // 空白
      lsb ??= b.minX / UPM;
      rsb = (g.advanceWidth - b.maxX) / UPM;
      top = Math.max(top, b.maxY / UPM);
      bot = Math.max(bot, -b.minY / UPM);
    });
  });
  const m = { adv: adv + trk * n, lsb: lsb ?? 0, rsb, top, bot, ink: adv + trk * (n - 1) - (lsb ?? 0) - rsb };
  cache.set(key, m);
  return m;
}

const r = (n: number) => String(Math.round(n * 10000) / 10000);

// 輪より前の字の送りの合計（em。字間ぶんも含む）。語が太っていくあいだ、輪を動かさないために使う
function before(text: string, w: number): number {
  const i = text.indexOf('|');
  if (i <= 0) return 0;
  const run = at(w).layout(text.slice(0, i));
  return run.positions.reduce((s: number, p: any) => s + p.xAdvance / UPM, 0) + track(w) * run.glyphs.length;
}

// CSS に渡す変数（style 属性に書く文字列）。
//   --w 太さ ／ --t9 字間 ／ --i9 墨の幅 ／ --l9 左の空き ／ --top・--bot 天と底 ／ --side 輪の左右の空き
//   --d1・--d4 … 太さ 100・400 のとき、輪より前の字が仕上がりよりどれだけ短いか。
//                極細から太っていく見出し（.swell）は、このぶん左に空けておいて、輪の位置を動かさずに両側へ太る
//                （Jost の母型は 100・400・900 で、そのあいだは直線。だから二点持てば、途中もずれない）
export function fitVars(text: string, w: number = HEAVY): string {
  const m = measure(text, w);
  const b = before(text, w);
  return [
    `--w:${w}`,
    `--t9:${r(track(w))}`,
    `--i9:${r(m.ink)}`,
    `--l9:${r(m.lsb)}`,
    `--top:${r(m.top)}`,
    `--bot:${r(m.bot)}`,
    `--side:${r(ringSide(w))}`,
    `--d1:${r(b - before(text, 100))}`,
    `--d4:${r(b - before(text, 400))}`,
  ].join(';');
}

// 空白の送り（em）
export const space = (w: number) => at(w).layout(' ').positions[0].xAdvance / UPM;
