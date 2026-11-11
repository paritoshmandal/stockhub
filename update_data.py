"""StockHub robot v3: all BSE companies, with a browser-like BSE session.
- results.json: companies that announced results in the last 3 days (+ your watchlist), numbers from yfinance
- announcements.json: latest company updates/corporate actions + upcoming result meetings
Source: BSE public announcements API (unofficial; BSE may change it). Numbers: yfinance (unofficial)."""
import json, os, re, time, datetime as dt
from urllib.parse import quote_plus
import requests

NOW = dt.datetime.utcnow() + dt.timedelta(hours=5, minutes=30)
TODAY = NOW.date()
CR = 1e7
RESULT_DAYS, MAX_RESULT_CARDS, ANN_DAYS, MAX_ANN = 3, 80, 2, 300
BASE = os.path.dirname(os.path.abspath(__file__))
MON = {m: i + 1 for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.bseindia.com",
    "Referer": "https://www.bseindia.com/corporates/ann.html",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
})

def warmup():
    """Visit BSE pages first so the server sets cookies, like a real browser."""
    for url in ("https://www.bseindia.com/", "https://www.bseindia.com/corporates/ann.html"):
        try:
            r = SESSION.get(url, timeout=30, headers={"Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
            print("warmup", url, r.status_code, len(SESSION.cookies), "cookies")
        except Exception as e:
            print("WARN warmup", url, e)
        time.sleep(2)

def load(name, default):
    try:
        with open(os.path.join(BASE, name), encoding="utf8") as f:
            return json.load(f)
    except Exception:
        return default

def save(name, obj):
    with open(os.path.join(BASE, name), "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

def bse_get(cat, d1, d2):
    url = ("https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?strCat=" + quote_plus(cat) +
           f"&strPrevDate={d1}&strScrip=&strSearch=P&strToDate={d2}&strType=C")
    last = None
    for attempt in range(2):
        try:
            r = SESSION.get(url, timeout=40)
            r.raise_for_status()
            return r.json().get("Table", [])
        except Exception as e:
            last = e
            time.sleep(3)
    raise last

def ymd(d): return d.strftime("%Y%m%d")

def row(x):
    att = x.get("ATTACHMENTNAME")
    return {"code": str(x.get("SCRIP_CD") or ""), "name": (x.get("SLONGNAME") or "").strip(),
            "date": (x.get("NEWS_DT") or "")[:10],
            "head": (x.get("HEADLINE") or x.get("NEWSSUB") or "").strip(),
            "sub": (x.get("SUBCATNAME") or x.get("CATEGORYNAME") or "").strip(),
            "pdf": ("https://www.bseindia.com/xml-data/corpfiling/AttachLive/" + att) if att else ""}

def kind(text):
    t = text.lower()
    if "result" in t: return "Result"
    if "dividend" in t: return "Dividend"
    if "transcript" in t or "earnings call" in t or "con. call" in t: return "Earnings Call"
    if "analyst" in t or "investor" in t: return "Investor Meet"
    return "Other"

def find_dates(text):
    out = []
    for d, m, y in re.findall(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})", text):
        try: out.append(dt.date(int(y), int(m), int(d)))
        except ValueError: pass
    for d, m, y in re.findall(r"(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})[,\s]+(20\d{2})", text):
        if m[:3].lower() in MON:
            try: out.append(dt.date(int(y), MON[m[:3].lower()], int(d)))
            except ValueError: pass
    for m, d, y in re.findall(r"([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})", text):
        if m[:3].lower() in MON:
            try: out.append(dt.date(int(y), MON[m[:3].lower()], int(d)))
            except ValueError: pass
    return out

def pick(df, names):
    for n in names:
        if n in df.index: return df.loc[n]
    return None

def series(r, idx, scale, nd):
    out = []
    for i in idx:
        try:
            v = float(r.iloc[i]) / scale
            out.append(None if v != v else round(v, nd))
        except Exception:
            out.append(None)
    return out

def fetch_result(ticker, name, rdate=None):
    import yfinance as yf
    t = yf.Ticker(ticker)
    q = t.quarterly_income_stmt
    if q is None or q.empty: raise RuntimeError("no quarterly data")
    q = q.sort_index(axis=1, ascending=False)
    qend = q.columns[0].date()
    card = {"n": name}
    stale = rdate is not None and (rdate - qend).days > 100
    idx = [0, 1, 4 if q.shape[1] > 4 else 99]
    if not stale:
        card["cols"] = [q.columns[i].strftime("%b %Y") if i < q.shape[1] else "-" for i in idx]
        def s(names, scale, nd):
            r = pick(q, names)
            return [None] * 3 if r is None else series(r, idx, scale, nd)
        card["s"] = s(["Total Revenue", "Operating Revenue"], CR, 1)
        card["e"] = s(["EBITDA", "Normalized EBITDA"], CR, 1)
        card["np"] = s(["Net Income", "Net Income Common Stockholders"], CR, 1)
        card["eps"] = s(["Diluted EPS", "Basic EPS"], 1, 2)
    try:
        fi = t.fast_info
        card["p"] = round(float(fi["last_price"]), 2)
        card["m"] = round(float(fi["market_cap"]) / CR)
    except Exception:
        card["p"] = card["m"] = None
    try:
        pe = t.info.get("trailingPE"); card["pe"] = round(pe, 1) if pe else None
    except Exception:
        card["pe"] = None
    return card

def main():
    warns = []
    warmup()
    comps = load("companies.json", [])
    cards, seen = [], set()

    # recent results, all companies
    latest = {}
    for i in range(RESULT_DAYS):
        d = TODAY - dt.timedelta(days=i)
        try:
            for x in bse_get("Result", ymd(d), ymd(d)):
                r = row(x)
                if r["code"] and r["code"] not in latest: latest[r["code"]] = r
        except Exception as e:
            warns.append(f"Result {d}: {e}")
    todo = list(latest.values())[:MAX_RESULT_CARDS]
    for r in todo:
        try: rd = dt.date.fromisoformat(r["date"])
        except Exception: rd = None
        try:
            card = fetch_result(r["code"] + ".BO", r["name"], rd)
        except Exception as e:
            warns.append(f"{r['name']}: {e}"); card = {"n": r["name"], "p": None, "m": None, "pe": None}
        card["u"] = r["pdf"]; card["rd"] = r["date"]
        cards.append(card); seen.add(r["name"])
        time.sleep(0.5)

    # watchlist (always shown with numbers)
    for c in comps:
        if c.get("nse") and c["name"] not in seen:
            try:
                card = fetch_result(c["nse"] + ".NS", c["name"])
                card["u"] = ""; card["rd"] = "Watchlist"
                cards.append(card)
            except Exception as e:
                warns.append(f"Watch {c['name']}: {e}")
            time.sleep(0.5)
    cards.sort(key=lambda c: c.get("rd", ""), reverse=True)
    stamp = NOW.strftime("%d %b %Y, %I:%M %p IST")
    if cards:
        save("results.json", {"cols": [], "updated": stamp, "companies": cards})

    # announcements
    items = []
    for cat in ("Company Update", "Corp. Action"):
        for i in range(ANN_DAYS):
            d = TODAY - dt.timedelta(days=i)
            try:
                for x in bse_get(cat, ymd(d), ymd(d)):
                    r = row(x)
                    items.append({"date": r["date"], "c": r["name"], "k": kind(r["head"] + " " + r["sub"]),
                                  "t": r["sub"] or "Announcement", "s": r["head"][:160], "u": r["pdf"]})
            except Exception as e:
                warns.append(f"{cat} {d}: {e}")
    items.sort(key=lambda a: a["date"], reverse=True)
    out = []
    for a in items[:MAX_ANN]:
        try: lab = "Today" if a["date"] == str(TODAY) else dt.date.fromisoformat(a["date"]).strftime("%d %B %Y").lstrip("0")
        except Exception: lab = a["date"]
        out.append({"d": lab, "c": a["c"], "k": a["k"], "t": a["t"], "s": a["s"], "u": a["u"]})

    # upcoming results from board meeting intimations
    up = {}
    for i in range(10):
        d = TODAY - dt.timedelta(days=i)
        try:
            for x in bse_get("Board Meeting", ymd(d), ymd(d)):
                r = row(x); text = r["head"] + " " + r["sub"]
                if "result" not in text.lower(): continue
                fut = sorted(z for z in find_dates(text) if z >= TODAY)
                if fut: up[(r["name"], fut[0])] = [fut[0].strftime("%a, %d %b"), r["name"], "Result"]
        except Exception as e:
            warns.append(f"Board {d}: {e}")
    upcoming = [v for k, v in sorted(up.items(), key=lambda kv: kv[0][1])][:40]
    if out or upcoming:
        old = load("announcements.json", {"items": [], "upcoming": []})
        save("announcements.json", {"upcoming": upcoming or old.get("upcoming", []), "items": out or old.get("items", [])})

    print("Updated:", stamp, "| result cards:", len(cards), "| announcements:", len(out), "| upcoming:", len(upcoming))
    for w in warns[:30]: print("WARN", w)

if __name__ == "__main__":
    main()
         
