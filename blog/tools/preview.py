"""ブログの見本（本番ではない場所に置く写し）を作る。本番に出す前に、動きごと見てもらうためのもの。

使い方: blog/ で `npm run build` のあと `python3 tools/preview.py <出力先のフォルダ>`
  <フォルダ>/tsam-blog-preview.html … 表紙（置き場所の側が <html> や <head> を足すので、中身だけ）
  <フォルダ>/archives.html、tags/*.html、archives/<番号>.html … ほかの頁（こちらは一枚ずつ完全な HTML）
  <フォルダ>/preview.css、images/ … 共通の CSS と記事の画像
  <フォルダ>/files.json … 置き場所に渡すファイルの一覧
dist/ の頁から、外の置き場所でも動く形に直す（公式の www/tools/preview.py と同じ考え方）:
  - 自前の Jost（/_astro/*.woff2）は読めないので Google Fonts の Jost に任せる
  - アナリティクス、構造化データ、X の埋め込みの読み込みは外す
  - 頁どうしの線と画像は、フォルダの中の相対の線に直す
"""
import glob, json, os, re, shutil, sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@200..800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+JP:wght@300;400;500&display=swap">'
JS = "<script>document.documentElement.classList.add('js');</script>"

css = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob('dist/_astro/*.css')))
css = re.sub(r'@font-face\{[^}]*\}', '', css)
assert '/_astro/' not in css, '自前の書体への参照が残っている'
open(os.path.join(out, 'preview.css'), 'w', encoding='utf-8').write(css)


def body_of(path, rel, home=False):
    h = open(path, encoding='utf-8').read()
    b = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
    b = re.sub(r'<script[^>]*platform\.x\.com[^>]*></script>', '', b)
    top = '#top' if home else f'{rel}index.html'
    b = b.replace('href="/feed.xml"', 'href="https://blog.tsam.co.jp/feed.xml"')
    b = re.sub(r'href="/#([a-z]+)"', (lambda m: f'href="#{m.group(1)}"') if home else (lambda m: f'href="{rel}index.html#{m.group(1)}"'), b)
    b = b.replace('href="/"', f'href="{top}"')
    b = re.sub(r'href="/(archives|tags/[a-z]+|archives/\d+)(#[^"]*)?"', lambda m: f'href="{rel}{m.group(1)}.html{m.group(2) or ""}"', b)
    b = b.replace('src="/images/', f'src="{rel}images/')
    assert 'googletagmanager' not in b and 'src="/' not in b and 'href="/' not in b, path
    return b


files = ['preview.css']
home = body_of('dist/index.html', '', True)
open(os.path.join(out, 'tsam-blog-preview.html'), 'w', encoding='utf-8').write(
    f'<title>tsam.blog 見本</title>\n{FONTS}\n<style>{css}</style>\n{JS}\n<div class="blog">{home}</div>'
)
for src in sorted(glob.glob('dist/archives.html') + glob.glob('dist/tags/*.html') + glob.glob('dist/archives/*.html')):
    name = os.path.relpath(src, 'dist')
    rel = '../' * name.count('/')
    title = re.search(r'<title>([^<]*)</title>', open(src, encoding='utf-8').read()).group(1)
    dest = os.path.join(out, name)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(
        '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
        f'<title>{title}</title>{FONTS}<link rel="stylesheet" href="{rel}preview.css">{JS}</head>\n'
        f'<body class="blog">{body_of(src, rel)}</body></html>\n'
    )
    files.append(name)
for src in sorted(glob.glob('dist/images/*/*.webp')):
    name = os.path.relpath(src, 'dist')
    dest = os.path.join(out, name)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copyfile(src, dest)
    files.append(name)
json.dump(files, open(os.path.join(out, 'files.json'), 'w'))
print('書き出しました:', out, len(files), 'ファイル')
