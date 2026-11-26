"""Search and fetch Creative Commons audio (and images) from Openverse, with the licence kept next to every file.

Openverse (openverse.org, run by WordPress) indexes openly licensed media from Freesound, Jamendo, Wikimedia Commons
and others. Its API is free and needs no key for search (anonymous requests are rate limited).

Usage:
  python3 -I openverse.py search "gravel footsteps" [--kind audio|images] [--licence cc0,by] [--max-s 10] [--n 20] [--json]
  python3 -I openverse.py get <out dir> <id> [<id> ...] [--kind audio|images]

search prints id, title, licence, creator, source, duration and the landing page; only the licences you allow come back
(default cc0 and by: CC0 and CC BY, the two that are safe for a brand's paid and organic posts; never nc, nd or sa).
get downloads each file into <out dir>/<id>.<ext> plus <id>.json with title, creator, licence, licence URL, landing page
and the attribution line to credit. Downloads are sequential and polite. Standard library only.
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.openverse.org/v1"
UA = "openverse-skill/1.0 (sound design for code-made videos)"
SAFE = {"cc0", "pdm", "by"}  # CC0, public domain mark, CC BY


def call(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except Exception as e:  # 429, 5xx, timeouts: back off and retry
            if i == tries - 1:
                sys.exit(f"openverse: {url} failed after {tries} tries: {e}")
            time.sleep(4 * (i + 1))
    raise RuntimeError("unreachable")


def search(q, kind, licences, n, max_s):
    params = {"q": q, "license": ",".join(licences), "page_size": min(n, 50)}
    data = call(f"{API}/{kind}/?{urllib.parse.urlencode(params)}")
    rows = []
    for r in data.get("results", []):
        dur = (r.get("duration") or 0) / 1000  # milliseconds in the API
        if kind == "audio" and max_s and dur and dur > max_s:
            continue
        if r.get("license") not in licences:
            continue
        rows.append({"id": r["id"], "title": r.get("title"), "licence": r.get("license"), "version": r.get("license_version"),
                     "creator": r.get("creator"), "source": r.get("source"), "duration_s": round(dur, 2) if dur else None,
                     "filetype": r.get("filetype"), "url": r.get("url"), "landing": r.get("foreign_landing_url"),
                     "licence_url": r.get("license_url"), "attribution": r.get("attribution")})
    return rows


def get(out, ids, kind):
    out.mkdir(parents=True, exist_ok=True)
    for i in ids:
        r = call(f"{API}/{kind}/{i}/")
        lic = r.get("license")
        if lic not in SAFE:
            print(f"skip {i}: licence {lic} is not cc0, pdm or by")
            continue
        ext = (r.get("filetype") or Path(urllib.parse.urlparse(r["url"]).path).suffix.lstrip(".") or "bin").lower()
        dst = out / f"{i}.{ext}"
        req = urllib.request.Request(r["url"], headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as resp, open(dst, "wb") as f:
            f.write(resp.read())
        meta = {k: r.get(k) for k in ("id", "title", "creator", "creator_url", "license", "license_version", "license_url",
                                       "foreign_landing_url", "source", "provider", "attribution", "duration", "url")}
        dst.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"ok {dst.name}  {lic} {r.get('license_version') or ''}  {r.get('creator')}  {r.get('foreign_landing_url')}")
        time.sleep(1.5)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("query")
    s.add_argument("--kind", default="audio", choices=["audio", "images"])
    s.add_argument("--licence", default="cc0,by")
    s.add_argument("--n", type=int, default=20)
    s.add_argument("--max-s", type=float, default=0, help="audio only: drop results longer than this (seconds)")
    s.add_argument("--json", action="store_true")
    g = sub.add_parser("get")
    g.add_argument("out")
    g.add_argument("ids", nargs="+")
    g.add_argument("--kind", default="audio", choices=["audio", "images"])
    a = p.parse_args()
    if a.cmd == "search":
        lic = [x.strip() for x in a.licence.split(",") if x.strip()]
        bad = [x for x in lic if x not in SAFE]
        if bad:
            sys.exit(f"openverse: refusing licences {bad}: only cc0, pdm and by are allowed")
        rows = search(a.query, a.kind, lic, a.n, a.max_s)
        if a.json:
            print(json.dumps(rows, ensure_ascii=False, indent=1))
        else:
            for r in rows:
                print(f"{r['id']}  {(r['title'] or '')[:42]:42}  {r['licence']} {r['version'] or ''}  "
                      f"{r['duration_s'] or '-'} s  {r['source']}  {r['creator']}  {r['landing']}")
            print(f"{len(rows)} results")
    else:
        get(Path(a.out), a.ids, a.kind)


if __name__ == "__main__":
    main()
