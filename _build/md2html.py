def _2htm(mddt: str, txt: str):
    import markdown
    from markdown.extensions.toc import TocExtension
    ed1 = txt.find("\n")
    title = txt[2:ed1] # skip "# "
    ctx = txt[ed1+1:]
    prelude = f"""<!DOCTYPE html>
<html lang="zh"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<link href="/style.css" rel="stylesheet" type="text/css">
<title>{title}</title>
<meta content="width=device-width, initial-scale=1" name="viewport">
</head><body><article>"""
    outname = f"./{mddt}.html"
    with open(outname, "w", encoding="utf-8") as f:
        f.write(prelude)
        md = markdown.Markdown(extensions=['tables', 'fenced_code', TocExtension(toc_depth="2-3")])
        htm = md.convert(ctx)
        f.write(f"<header>{title}</header>")
        f.write(md.toc)
        f.write(htm)
        f.write('<hr><a href="/">back</a></article></body></html>')
        f.flush()

def scan_dir(d: str, lastday: float):
    import os
    import time
    now = time.time()
    for f in os.scandir(d):
        if f.is_file() and f.name.endswith(".md"):
            mtime = os.path.getmtime(d+f.name)
            if (now-mtime) < lastday*86400:
                with open(d+f.name, "r", encoding="utf-8") as fd:
                    txt = fd.read()
                    print("generate html by ", f.name)
                    _2htm(f.name[:-3], txt)

def main():
    import sys
    scan_dir("../rumi/", 1.0)

main()
