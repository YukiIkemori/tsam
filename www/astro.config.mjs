import { defineConfig } from 'astro/config';

// tsam.co.jp（会社公式）。Firebase Hosting に dist/ をそのまま置く。
// build.format を 'file' にしているのは、いまの URL（/pages/privacy-policy。末尾スラッシュなし）を
// そのまま残すため。Firebase 側は cleanUrls で .html を外す。
export default defineConfig({
  site: 'https://tsam.co.jp',
  trailingSlash: 'never',
  build: { format: 'file' },
});
