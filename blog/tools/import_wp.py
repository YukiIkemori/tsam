#!/usr/bin/env python3
"""旧ブログ（WordPress）の記事を、このリポジトリの形に移す。**一度きりの道具**（2026-11-26 に実行済み）。

もう一度流す必要は基本的に無い。残してあるのは「何をどう変えて移したか」の記録として。

  python3 tools/import_wp.py <ダンプのフォルダ>

ダンプのフォルダに要るもの（旧サイトが生きているうちに取ったもの）:
  posts.json     https://tsam.co.jp/wp-json/wp/v2/posts?_embed&per_page=100 を全頁つないだ配列
  related/<id>.json  https://tsam.co.jp/wp-json/yarpp/v1/related/<id>?category=Blog（関連記事）
  dl/            記事の画像の実物と manifest.json（元URL → ファイル）

出すもの:
  posts/<番号>.html          記事。頭に ---（題・日付・タグ・関連記事）、その下は本文の HTML
  public/images/<番号>/      記事の画像（WebP、長辺1600pxまで）。og.jpg はアイキャッチ（SNS用）

本文について変えたこと（文章には触れていない）:
  ・画像を自前に置き直した（旧サーバーと Google ドキュメントの一時URLに置かれていたため、放っておくと切れる）
  ・記事どうしのリンク（tsam.co.jp/archives/…、blog.tsam.co.jp/archives/…）を /archives/… に
  ・本文の見出しを h2 始まりに揃えた（h1 は記事の題だけ。WordPress では本文に h1 を使っている記事があった）
  ・WordPress のエディタが付けた飾りの class、<!--more-->、空のアンカー、Amazon の計測用の透明画像（1件）を外した
  ・X（Twitter）の埋め込みの <script> は外した（記事の頁が一度だけ読み込む）

移さなかったもの：コメント（旧ブログに26件。オーナー 2026-11-26「コメントは消して」）。最初は移していたが、外した。
"""
import base64, html, io, json, os, re, sys
from bs4 import BeautifulSoup, Comment
from PIL import Image

D = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAXW = 1600

# 旧タグ（WordPress の id）→ 新しい URL の名前。並びは旧ブログのタグの順
TAGS = {41: 'startup', 50: 'finance', 39: 'venturecapital', 40: 'knowhow', 49: 'columns', 43: 'reports', 51: 'contribution', 45: 'others'}

posts = json.load(open(f'{D}/posts.json'))
manifest = json.load(open(f'{D}/dl/manifest.json'))
DROP_CLASS = re.compile(r'^(wp-block-(paragraph|heading|list)|wp-image-\d+|is-layout-flow|wp-block-quote-is-layout-flow|has-css-opacity|mce-item-anchor)$')
ARCHIVE = re.compile(r'^https?://(?:blog\.)?tsam\.co\.jp/archives/(\d+)/?$')
IMG_LINK = re.compile(r'\.(jpe?g|png|gif|webp)(\?.*)?$', re.I)


def save_image(im, dest, fmt='WEBP'):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if im.width > MAXW:
        im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)
    if fmt == 'JPEG':
        im = im.convert('RGB')
        im.save(dest, 'JPEG', quality=84, optimize=True, progressive=True)
    else:
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'transparency' in im.info or im.mode in ('LA', 'P') else 'RGB')
        im.save(dest, 'WEBP', quality=82, method=6)
    return im.width, im.height


def open_src(src):
    if src.startswith('data:'):
        return Image.open(io.BytesIO(base64.b64decode(src.split(',', 1)[1])))
    m = manifest.get(src)
    return Image.open(f"{D}/dl/{m['file']}") if m else None


def jst(s):
    return s + '+09:00'


count = {'posts': 0, 'images': 0}
for p in posts:
    pid = p['id']
    soup = BeautifulSoup(p['content']['rendered'], 'html.parser')

    for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for s in soup.find_all('script'):
        s.decompose()
    for a in soup.find_all('a'):
        if a.get('name') and not a.get('href') and not a.get_text(strip=True):
            a.decompose()

    # 画像
    n = 0
    images = []
    for img in soup.find_all('img'):
        src = html.unescape(img.get('src', ''))
        if 'amazon-adsystem' in src:
            (img.find_parent('figure') or img).decompose()
            continue
        im = open_src(src)
        if im is None:
            raise SystemExit(f'画像が無い: {pid} {src[:80]}')
        n += 1
        rel = f'/images/{pid}/{n:02d}.webp'
        w, h = save_image(im, f'{ROOT}/public{rel}')
        alt = img.get('alt', '')
        img.attrs = {'src': rel, 'width': w, 'height': h, 'alt': alt, 'loading': 'lazy', 'decoding': 'async'}
        images.append(rel)
        count['images'] += 1
        # 画像だけを包んで、画像の実物へ飛ばしているリンクは外す（旧サーバーや blogspot の実物に飛ぶため）
        a = img.parent
        if a.name == 'a' and IMG_LINK.search(a.get('href', '')) and not a.get_text(strip=True):
            a.unwrap()

    # アイキャッチは SNS 用の画像としてだけ使う（旧ブログも本文には出していなかった）
    og = None
    if p['featured_media']:
        fm = p['_embedded'].get('wp:featuredmedia', [{}])[0].get('source_url')
        im = open_src(fm) if fm else None
        if im is not None:
            if im.width > 1200:
                im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
            og = f'/images/{pid}/og.jpg'
            save_image(im, f'{ROOT}/public{og}', 'JPEG')

    # リンク
    for a in soup.find_all('a', href=True):
        m = ARCHIVE.match(a['href'])
        if m:
            a['href'] = f'/archives/{m.group(1)}'
            for k in ('target', 'rel'):
                a.attrs.pop(k, None)

    # 見出しを h2 始まりに
    used = sorted({int(t.name[1]) for t in soup.find_all(re.compile(r'^h[1-6]$'))})
    shift = {lv: i + 2 for i, lv in enumerate(used)}
    for t in soup.find_all(re.compile(r'^h[1-6]$')):
        t.name = f'h{shift[int(t.name[1])]}'

    # 埋め込み
    for f in soup.find_all('iframe'):
        w, h = f.get('width'), f.get('height')
        for k in ('frameborder', 'width', 'height'):
            f.attrs.pop(k, None)
        f['loading'] = 'lazy'
        if w and h and w.isdigit() and h.isdigit():
            f['style'] = f'aspect-ratio:{w}/{h}'

    # エディタの飾りを外す
    for t in soup.find_all(True):
        if t.has_attr('class'):
            keep = [c for c in t['class'] if not DROP_CLASS.match(c)]
            if keep:
                t['class'] = keep
            else:
                del t['class']
        for k in ('decoding', 'fetchpriority', 'srcset', 'sizes'):
            if t.name != 'img':
                t.attrs.pop(k, None)

    body = str(soup).strip()
    body = re.sub(r'\n{3,}', '\n\n', body)

    tags = [TAGS[t] for t in p['tags'] if t in TAGS]
    related = [r['id'] for r in json.load(open(f'{D}/related/{pid}.json'))]
    fm = [
        '---',
        f"title: {json.dumps(html.unescape(p['title']['rendered']), ensure_ascii=False)}",
        f"date: {jst(p['date'])}",
        f"modified: {jst(p['modified'])}",
        f"tags: [{', '.join(tags)}]",
    ]
    if og:
        fm.append(f'image: {og}')
    fm.append(f"related: [{', '.join(map(str, related))}]")
    fm.append('---')
    with open(f'{ROOT}/posts/{pid}.html', 'w') as f:
        f.write('\n'.join(fm) + '\n\n' + body + '\n')
    count['posts'] += 1

print(count)
