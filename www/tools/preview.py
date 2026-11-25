"""見本（本番ではない場所に置く写し）を作る。本番に出す前に、動きごと見てもらうためのもの。

使い方: www/ で `npm run build` のあと `python3 tools/preview.py <出力先のフォルダ>`
  <フォルダ>/tsam-preview.html … トップ（置き場所の側が <html> や <head> を足すので、中身だけ）
  <フォルダ>/record.html       … 活動の記録（こちらは一枚の完全な HTML）
dist/ の頁から、外の置き場所でも単独で動く形に直す:
  - CSS を中に入れる。自前の Jost（/_astro/*.woff2）は読めないので Google Fonts の Jost に任せる
  - アナリティクスと構造化データは外す（見本のアクセスを本番の数字に混ぜない）
  - フォームは「見本です。送信はしていません」と出すだけにする
  - 頁どうしの線は、同じフォルダの中の相対の線に直す
"""
import glob, os, re, sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@200..400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+JP:wght@300;400;500&display=swap">'
JS = "<script>document.documentElement.classList.add('js');</script>"

css = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob('dist/_astro/*.css')))
css = re.sub(r'@font-face\{[^}]*\}', '', css)
assert '/_astro/' not in css, '自前の書体への参照が残っている'


def body_of(path, home):
    h = open(path, encoding='utf-8').read()
    b = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
    top = '#top' if home else 'index.html'
    b = b.replace('href="/pages/privacy-policy"', 'href="https://tsam.co.jp/pages/privacy-policy"')
    b = b.replace('href="/record"', 'href="record.html"')
    b = re.sub(r'href="/#([a-z]+)"', r'href="index.html#\1"', b)
    b = b.replace('href="/"', f'href="{top}"')
    assert 'googletagmanager' not in b and 'src="/' not in b and 'href="/' not in b, path
    return b


home = body_of('dist/index.html', True).replace('data-contact data-endpoint ', 'data-contact data-endpoint="preview" ')
assert 'data-endpoint="preview"' in home, 'フォームを見本用に切り替えられなかった'
open(os.path.join(out, 'tsam-preview.html'), 'w', encoding='utf-8').write(
    f'<title>tsam 新公式サイト 見本</title>\n{FONTS}\n<style>{css}</style>\n{JS}\n{home}'
)
open(os.path.join(out, 'record.html'), 'w', encoding='utf-8').write(
    '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    f'<title>活動の記録｜tsam 新公式サイト 見本</title>{FONTS}<style>{css}</style>{JS}</head>\n'
    f'<body>{body_of("dist/record.html", False)}</body></html>\n'
)
print('書き出しました:', out)
