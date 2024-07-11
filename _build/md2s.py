#!/usr/bin/env python3

def tid2md(j_fl):
    def _wt2md(art):
        import re
        art = re.sub("^# ", "1. ", art, flags=re.M)
        art = re.sub("^!!! ", "### ", art, flags=re.M)
        art = re.sub("^!! ",  "## ", art, flags=re.M)
        art = re.sub("^! ",  "# ", art, flags=re.M)
        art = re.sub("''(.*?)''", "**\g<1>**", art)
        return art
    def _prop_tag(tid_tag):
        right_tag = ""
        md_tag = set(("lang","os","net","data","security","design","protocol","web","tool","think","finance"))
        for i in tid_tag.split(" "):
            if i in md_tag:
                right_tag = i
                break
        return right_tag
    import json
    import sys
    with open(j_fl, encoding="utf-8") as f:
        j = json.loads(f.read())
        for i in j:
            cday = i["created"][2:8]
            try:
                tag = _prop_tag(i["tags"])
                if tag == "":
                    print(f"[{i['title']}] no right tag: [{i['tags']}]", file=sys.stderr)
                    continue
            except:
                continue
            fname = f'{cday}_{tag}.md'
            with open(fname, "w", encoding="utf-8") as of:
                of.write(f"# {i['title']}\n")
                of.write(_wt2md(i["text"]))
            print(cday)


def md2json(fname):
    import json
    import os
    import re
    out = {}
    with open(fname, "r", encoding="utf-8") as f:
        txt = f.read()
        basename = os.path.basename(fname)
        pos = -1!=basename.find("_") and basename.find("_") or basename.find(".md")
        out["id"] = basename[:pos]
        pt = re.search("_[a-z0-9]{2,}\.md", basename)
        out["tag"] = "unknown"
        if pt is not None:
            pos = pt.span()
            out["tag"] = basename[pos[0]+1:pos[1]-3]
        out["text"] = txt
        return "jctx.push(JSON.parse("+repr(json.dumps(out, ensure_ascii=False))+"));"


def up_for_tm(lastday: float):
    """modify in lastday"""
    import os
    def _conv_in_day(nam, pos, pth, lastday):
        import time
        now = time.time()
        mtime = os.path.getmtime(pth)
        if (now-mtime) < lastday*86400:
            fout = config["to"]+nam[:pos]+".mds"
            print(f"{nam}({pth}) to {fout}")
            with open(fout, "w", encoding="utf-8") as f:
                f.write(md2json(pth))
    def scan_f_in_dir(d):
        for f in os.scandir(d):
            if f.is_file():
                if f.name.endswith(".md"):
                    pos = f.name.find(".md")
                    _conv_in_day(f.name, pos, f.path, lastday)
            else:
                scan_f_in_dir(f.path)
    for d in config["from"]:
        scan_f_in_dir(d)

if __name__ == '__main__':
    import sys
    policy = sys.argv[2]
    if policy == "1":
        config = { "from":["../tid/b1/"] }
    elif policy == "2":
        config = { "from":["../tid/b2/"] }
    else:
        config = { "from":["D:/code/essay/priv/"] }
    config["to"]=f"./mds{policy}/"
    up_for_tm(float(sys.argv[1]))

