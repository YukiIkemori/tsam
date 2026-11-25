import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// blog.tsam.co.jp（ブログ）。Firebase Hosting に dist/ をそのまま置く。
// 記事の URL は /archives/<番号>（旧ブログのまま。オーナー決定）。末尾スラッシュなしにするため build.format は 'file'。
// 意匠の部品（輪の o、ロゴ、色と字の決まり）は公式サイト（../www）のものをそのまま読む。二つに分けて持たない。
export default defineConfig({
  site: 'https://blog.tsam.co.jp',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    resolve: { alias: { '@www': fileURLToPath(new URL('../www/src', import.meta.url)) } },
    server: { fs: { allow: ['..'] } },
  },
});
