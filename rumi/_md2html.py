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

def main():
    import sys
    if 1 == len(sys.argv):
        print(f"usage: {sys.argv[0]} xx.md  -- generate same name html")
        return 0
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        txt = f.read()
        _2htm(sys.argv[1][:-3], txt)

main()
