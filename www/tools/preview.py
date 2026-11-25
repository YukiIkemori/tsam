"""見本（本番ではない場所に置く写し）を作る。本番に出す前に、動きごと見てもらうためのもの。

使い方: www/ で `npm run build` のあと `python3 tools/preview.py <出力先のフォルダ>`
  <フォルダ>/tsam-preview.html … トップ（置き場所の側が <html> や <head> を足すので、中身だけ）
  <フォルダ>/record.html、startup.html、startup/<slug>.html … ほかの頁（こちらは一枚ずつ完全な HTML）
  <フォルダ>/preview.css … 共通の CSS
  <フォルダ>/files.json  … 置き場所に渡すファイルの一覧
dist/ の頁から、外の置き場所でも動く形に直す:
  - 自前の Jost（/_astro/*.woff2）は読めないので Google Fonts の Jost に任せる
  - アナリティクスと構造化データは外す（見本のアクセスを本番の数字に混ぜない）
  - フォームは「見本です。送信はしていません」と出すだけにする
  - 頁どうしの線は、フォルダの中の相対の線に直す
"""
import glob, json, os, re, sys

out = sys.argv[1]
os.makedirs(os.path.join(out, 'startup'), exist_ok=True)
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@200..400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+JP:wght@300;400;500&display=swap">'
JS = "<script>document.documentElement.classList.add('js');</script>"

css = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob('dist/_astro/*.css')))
css = re.sub(r'@font-face\{[^}]*\}', '', css)
assert '/_astro/' not in css, '自前の書体への参照が残っている'
open(os.path.join(out, 'preview.css'), 'w', encoding='utf-8').write(css)


def body_of(path, rel, home=False):
    h = open(path, encoding='utf-8').read()
    b = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
    top = '#top' if home else f'{rel}index.html'
    b = b.replace('href="/pages/privacy-policy"', 'href="https://tsam.co.jp/pages/privacy-policy"')
    b = b.replace('href="/record"', f'href="{rel}record.html"')
    b = re.sub(r'href="/startup(/[a-z0-9-]+)?(#[^"]*)?"', lambda m: f'href="{rel}startup{m.group(1) or ""}.html{m.group(2) or ""}"', b)
    b = re.sub(r'href="/#([a-z]+)"', (lambda m: f'href="#{m.group(1)}"') if home else (lambda m: f'href="{rel}index.html#{m.group(1)}"'), b)
    b = b.replace('href="/"', f'href="{top}"')
    assert 'googletagmanager' not in b and 'src="/' not in b and 'href="/' not in b, path
    return b


home = body_of('dist/index.html', '', True).replace('data-contact data-endpoint ', 'data-contact data-endpoint="preview" ')
assert 'data-endpoint="preview"' in home, 'フォームを見本用に切り替えられなかった'
open(os.path.join(out, 'tsam-preview.html'), 'w', encoding='utf-8').write(
    f'<title>tsam 新公式サイト 見本</title>\n{FONTS}\n<style>{css}</style>\n{JS}\n{home}'
)
files = ['preview.css']
for src in ['dist/record.html', 'dist/startup.html'] + sorted(glob.glob('dist/startup/*.html')):
    name = os.path.relpath(src, 'dist')
    rel = '../' * name.count('/')
    title = re.search(r'<title>([^<]*)</title>', open(src, encoding='utf-8').read()).group(1)
    open(os.path.join(out, name), 'w', encoding='utf-8').write(
        '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
        f'<title>{title}</title>{FONTS}<link rel="stylesheet" href="{rel}preview.css">{JS}</head>\n'
        f'<body>{body_of(src, rel)}</body></html>\n'
    )
    files.append(name)
json.dump(files, open(os.path.join(out, 'files.json'), 'w'))
print('書き出しました:', out, len(files), 'ファイル')
