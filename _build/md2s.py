#!/usr/bin/env python3

def _guess_id_tag(fname: str)->tuple:
    """ fname must like tag_xxx.md or xxx.md """
    import re
    purename = re.sub(".md$", "", fname)
    pos = fname.find("_")
    if pos > 0:
        return purename[pos+1:], purename[:pos]
    return purename, "unknown"

def gz_str(s_in: str)->str:
    import gzip
    import base64
    s_out = gzip.compress(s_in.encode("utf-8"))
    return base64.b64encode(s_out).decode("utf-8")

def md2json(fname: str):
    """ json field: id+tag+text """
    import json
    import os
    import re
    with open(fname, "r", encoding="utf-8") as f:
        basename = os.path.basename(fname)
        fid, tag = _guess_id_tag(basename)
        out = {}
        out["id"] = fid
        out["tag"] = tag
        out["text"] = f.read() # compress is uesless
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
        config = { "from":["../tid/"] }
    elif policy == "2":
        config = { "from":["../tid/b2/"] }
    elif policy == "9":
        config = { "from":["../priv/"] }
    else:
        config = { "from":["D:/code/essay/priv/"] }
    config["to"]=f"./mds{policy}/"
    up_for_tm(float(sys.argv[1]))

