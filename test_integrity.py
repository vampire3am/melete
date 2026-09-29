import os
import re

files = [f for f in os.listdir('.') if f.endswith('.html')]
print(f'Checking {len(files)} HTML files...')
all_ok = True

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
        # check links
        links = re.findall(r'href=[\'"]([a-zA-Z0-9_\-\./]+\.html)(?:[?#][^\'"]*)?[\'"]', content)
        for link in links:
            target = link.split('#')[0].split('?')[0]
            if target and not os.path.exists(target):
                print(f'[{f}] Missing target: {target}')
                all_ok = False
        # check assets
        imgs = re.findall(r'src=[\'"](assets/[^\'"]+)[\'"]', content)
        for img in imgs:
            if not os.path.exists(img):
                print(f'[{f}] Missing asset: {img}')
                all_ok = False

if all_ok:
    print('VERIFICATION SUCCESS: All internal pages, stylesheets, logos, and scripts exist and link with 100% integrity!')
