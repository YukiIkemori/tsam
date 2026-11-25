// /llms.txt — AI に読ませるための、この会社の素の説明。頁に見えている事実だけを並べる（手で書かない。ここが作る）。
// まだ標準ではなく、検索の順位が上がる根拠も無い。費用がゼロだから置いている。
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { all, recent, firstYear, lastYear } from '../data/activities';
import { pages, rounds, inRound, index, glossary, NAME, BASE } from '../lib/startup';

const strip = (s: string) => s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1');

export const GET: APIRoute = () => {
  const body = `# 株式会社tsam（ツァム）

> tsamは起業家をサポートする会社です。起業における成功確率を少しでも高められるように、日々活動をしています。キャッチフレーズは「${site.tagline}」。

## 会社概要

- 会社名: 株式会社tsam（ツァム）
- 代表取締役: 池森裕毅
- 設立: 2019年2月
- 資本金: 100万円
- 本社所在地: 東京都千代田区九段南一丁目5番6号 りそな九段ビル5F
- 事業内容: インターネットコンサルティング事業、オンラインコミュニティ運営事業、オンラインWEBサービス運営事業
- 公式サイト: ${site.url}/
- ブログ: ${site.blog}
- お問い合わせ: ${site.url}/#contact （${site.email}）。講演や審査員のご依頼、コンサルティングのご希望など

## 代表 池森裕毅（Yuki Ikemori）の経歴

1980年生まれ、千葉県松戸市出身。東京理科大学中退後、起業家として活動開始。

- 2005年: オンラインゲームデータオークションサイト運営の株式会社ポケットを設立。2014年に売却
- 2011年: ソーシャル婚活サイト運営の株式会社フリッグを設立。2013年に売却
- 2019年: スタートアップ支援を目的とした株式会社tsamを設立。行政・地方自治体・大学機関と連携し、スタートアップカリキュラムを提供
- 2020年: 情報経営イノベーション専門職大学客員教授に就任
- 2022年: ベンチャーキャピタルStoked Capitalを設立
- 2023年: 独立行政法人中小企業基盤整備機構アドバイザーに就任
- 2026年: 信州大学特任教授に就任

現在は、信州大学特任教授として教育現場に携わる傍ら、後進の起業家育成に従事。

## 著書

- [デジタル人材のシン・キャリアガイド―スタートアップの始め方](https://www.amazon.co.jp/dp/482721378X)（ぱる出版、2023年）
- [図解・ビジネスモデルで学ぶスタートアップ](https://www.amazon.co.jp/dp/4800592364)（日本能率協会マネジメントセンター、2024年。監修）

## 最近の活動

講演・審査員・対談・就任・メディア掲載など、${firstYear}年から${lastYear}年までの全${all.length}件は ${site.url}/record にあります。

${recent.map((a) => `- ${a.date}: ${a.title}。${strip(a.body)}`).join('\n')}

## 教科書「${NAME}」

${index.desc} 全${pages.length + 2}頁。どの頁も、冒頭に答えを置いてある。目次は ${site.url}${BASE}

${rounds.map((r) => `### ${r.ja}\n\n${inRound(r).map((p) => `- [${p.h1}](${site.url}${p.url}): ${p.blurb}`).join('\n')}`).join('\n\n')}

### 用語集

- [${glossary.h1}](${site.url}${glossary.url}): ${glossary.terms.length}語を一行ずつ

## 頁

- [トップ（会社概要・経歴・お問い合わせ）](${site.url}/)
- [教科書「${NAME}」（全${pages.length + 2}頁）](${site.url}${BASE})
- [活動の記録（講演・審査員・メディア掲載。全${all.length}件）](${site.url}/record)
- [プライバシーポリシー](${site.url}/pages/privacy-policy)
- [ブログ（スタートアップ概論、投資家視点、ノウハウ、コラム）](${site.blog})
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
