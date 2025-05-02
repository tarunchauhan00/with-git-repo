import os
import yaml

docs_folder = 'docs'
mkdocs_file = 'mkdocs.yml'

def get_md_files(path):
    return [f for f in os.listdir(path) if f.endswith('.md') and f != 'index.md']

def build_nav():
    nav = [{'Home': 'index.md'}]  # Always start with Home
    for file in sorted(get_md_files(docs_folder)):
        title = file.replace('.md', '').replace('_', ' ').title()
        nav.append({title: file})
    return nav

def update_mkdocs():
    with open(mkdocs_file, 'r') as f:
        data = yaml.safe_load(f)

    data['nav'] = build_nav()

    with open(mkdocs_file, 'w') as f:
        yaml.dump(data, f, sort_keys=False)

if __name__ == '__main__':
    update_mkdocs()
