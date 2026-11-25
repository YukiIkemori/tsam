"""見本（1ファイルの写し）を作る。本番に出す前に、動きごと見てもらうためのもの。

使い方: www/ で `npm run build` のあと `python3 tools/preview.py <出力先.html>`
dist/index.html から、外の置き場所でも単独で動く形に直す:
  - CSS を中に入れる。自前の Jost（/_astro/*.woff2）は読めないので Google Fonts の Jost に任せる
  - アナリティクスと構造化データは外す（見本のアクセスを本番の数字に混ぜない）
  - フォームは「見本です。送信はしていません」と出すだけにする
"""
import glob, re, sys

out = sys.argv[1]
h = open('dist/index.html', encoding='utf-8').read()
css = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob('dist/_astro/*.css')))
css = re.sub(r'@font-face\{[^}]*\}', '', css)
assert '/_astro/' not in css, '自前の書体への参照が残っている'
body = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
body = body.replace('data-contact data-endpoint ', 'data-contact data-endpoint="preview" ')
assert 'data-endpoint="preview"' in body, 'フォームを見本用に切り替えられなかった'
body = body.replace('href="/pages/privacy-policy"', 'href="https://tsam.co.jp/pages/privacy-policy"').replace('href="/"', 'href="#top"')
assert 'googletagmanager' not in body and 'src="/' not in body and 'href="/' not in body
page = (
    '<title>tsam 新公式サイト 見本</title>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@200..400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+JP:wght@300;400;500&display=swap">\n'
    f'<style>{css}</style>\n'
    "<script>document.documentElement.classList.add('js');</script>\n"
    f'{body}'
)
open(out, 'w', encoding='utf-8').write(page)
print(out, len(page), 'bytes')
