"""BSE theke announcements, result PDF ar upcoming board meeting tane,
results.json + announcements.json banay (app.js ei format-e pore)."""
import json, time, datetime as dt
import requests

API = "https://api.bseindia.com/BseIndiaAPI/api/"
PDF = "https://www.bseindia.com/xml-data/corpfiling/AttachLive/"
H = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Referer": "https://www.bseindia.com/",
    "Origin": "https://www.bseindia.com",
    "Accept": "application/json, text/plain, */*",
}
S = requests.Session()
S.headers.update(H)
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
NOW = dt.datetime.now(IST)


def get(path, params, tries=3):
    for i in range(tries):
        try:
            r = S.get(API + path, params=params, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print("retry", path, e)
            time.sleep(3 * (i + 1))
    return None


def fmt(d):
    return d.strftime("%Y%m%d")


def ann_pages(cat, days, max_pages):
    rows = []
    for p in range(1, max_pages + 1):
        j = get("AnnGetData/w", {
            "strCat": cat, "strPrevDate": fmt(NOW - dt.timedelta(days=days)),
            "strScrip": "", "strSearch": "P", "strToDate": fmt(NOW),
            "strType": "C", "pageno": p,
        })
        t = (j or {}).get("Table") or []
        if not t:
            break
        rows += t
        time.sleep(1.2)
    return rows


def pdf_url(r):
    a = (r.get("ATTACHMENTNAME") or "").strip()
    return PDF + a if a else (r.get("NSURL") or "")


def day(s):
    return (s or "")[:10]


# 1) Announcements (last 2 din)
items = []
for r in ann_pages("-1", 2, 25):
    items.append({
        "d": day(r.get("NEWS_DT")),
        "c": r.get("SLONGNAME") or "",
        "t": r.get("HEADLINE") or r.get("NEWSSUB") or "",
        "k": r.get("CATEGORYNAME") or "",
        "s": r.get("SUBCATNAME") or "",
        "u": pdf_url(r),
    })
items.sort(key=lambda x: x["d"], reverse=True)

# 2) Upcoming board meetings (porer 30 din)
upcoming = []
j = get("DefaultData/w", {
    "Fdate": fmt(NOW), "TDate": fmt(NOW + dt.timedelta(days=30)),
    "ddlcategorys": "E", "ddlindustrys": "", "scripcode": "",
    "segment": "0", "strSearch": "S",
})
for r in (j if isinstance(j, list) else (j or {}).get("Table") or []):
    name = r.get("Long_Name") or r.get("short_name") or ""
    date = day(r.get("meeting_date") or r.get("Meeting_Date"))
    purpose = (r.get("Purpose") or "").strip()
    if name:
        upcoming.append([date, name, purpose])
upcoming.sort(key=lambda x: x[0])

# 3) Results (last 30 din, company-wise latest PDF)
seen = {}
for r in ann_pages("Result", 30, 40):
    name = r.get("SLONGNAME") or ""
    d = day(r.get("NEWS_DT"))
    if name and (name not in seen or d > seen[name]["d"]):
        seen[name] = {"d": d, "n": name, "u": pdf_url(r)}
companies = sorted(seen.values(), key=lambda x: x["d"], reverse=True)
for c in companies:
    c.pop("d")  # numbers (cols/s/e/np/eps) XBRL parse korle pore jog hobe

stamp = NOW.strftime("%d %b %Y, %I:%M %p IST")
json.dump({"updated": stamp, "companies": companies},
          open("results.json", "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"updated": stamp, "items": items, "upcoming": upcoming},
          open("announcements.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(items), "ann,", len(upcoming), "upcoming,", len(companies), "results")
