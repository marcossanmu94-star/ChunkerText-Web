import os

def build():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, '..'))

    with open(os.path.join(script_dir, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()

    with open(os.path.join(script_dir, 'styles.css'), 'r', encoding='utf-8') as f:
        css = f.read()

    with open(os.path.join(script_dir, 'Sortable.min.js'), 'r', encoding='utf-8') as f:
        sortable = f.read()

    with open(os.path.join(script_dir, 'storage.js'), 'r', encoding='utf-8') as f:
        storage = f.read()

    with open(os.path.join(script_dir, 'app.js'), 'r', encoding='utf-8') as f:
        app = f.read()

    # Inline CSS
    style_tag = f'<style>\n{css}\n</style>'
    html = html.replace('<link rel="stylesheet" href="styles.css">', style_tag)

    # Inline scripts
    html = html.replace('<script src="Sortable.min.js"></script>', f'<script>\n{sortable}\n</script>')
    html = html.replace('<script src="storage.js"></script>', f'<script>\n{storage}\n</script>')
    html = html.replace('<script src="app.js"></script>', f'<script>\n{app}\n</script>')

    # Write root standalone app
    target_root = os.path.join(root_dir, 'ChunkerText_App.html')
    with open(target_root, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'Successfully built {target_root} (size: {os.path.getsize(target_root)} bytes)')

if __name__ == '__main__':
    build()
