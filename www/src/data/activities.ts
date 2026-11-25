// 活動の記録（講演・審査員・就任・掲載など）。元は activities.json。旧サイトの News をそのまま持ってきたもの。
// 選別はしない（オーナー 2026-11-26「全部データ使おう。選別のほうがだるい」）。
// トップには新しい順に数件、/record には全件を年ごとに出す。
import raw from './activities.json';
import { site } from './site';

export type Activity = { date: string; title: string; body: string };

export const all: Activity[] = [...(raw as Activity[])].sort((a, b) => b.date.localeCompare(a.date));
export const recent = all.slice(0, site.recentCount);

export const years: { year: string; items: Activity[] }[] = [];
for (const a of all) {
  const y = a.date.slice(0, 4);
  const last = years[years.length - 1];
  if (last && last.year === y) last.items.push(a);
  else years.push({ year: y, items: [a] });
}
export const firstYear = years[years.length - 1].year;
export const lastYear = years[0].year;
