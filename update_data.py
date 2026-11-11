"""StockHub robot v4: NSE-based announcements/results/board meetings (browser-like session).
- results.json: companies with results in the last 3 days (+ watchlist), numbers from yfinance
- announcements.json: latest corporate announcements + upcoming result meetings
Source: NSE public API (unofficial). Numbers: yfinance (unofficial)."""
import json, os, time, datetime as dt
import requests

NOW = dt.datetime.utcnow() + dt.timedelta(hours=5, minutes=30)
TODAY = NOW.date()
CR = 1e7
RESULT_DAYS, MAX_RESULT_CARDS, MAX_ANN = 3, 80, 300
BASE = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

S = requests.Session()
S.headers.update({
    "User-Agent": UA,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
})

def warmup():
    for url in ("https://www.nseindia.com/", "https://www.nseindia.com/companies-listing/corporate-filings-announcements"):
        try:
            r = S.get(url, timeout=30, headers={"Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
            print("warmup", url, r.status_code, len(S.cookies), "cookies")
        except Exception as e:
            print("WARN warmup", url, e)
        time.sleep(2)

def nse_get(path, params):
    last = None
    for attempt in range(2):
        try:
            r = S.get("https://www.nseindia.com" + path, params=params, timeout=40)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last = e
            time.sleep(3)
    raise last

def load(name, default):
    try:
        with open(os.path.join(BASE, name), encoding="utf8") as f:
            return json.load(f)
    except Exception:
        return default

def save(name, obj):
    with open(os.path.join(BASE, name), "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

def parse_date(s):
    s = (s or "").strip()
    for n, fmt in ((10, "%Y-%m-%d"), (10, "%d-%m-%Y"), (11, "%d-%b-%Y"), (10, "%d-%b-%Y")):
        try:
            return dt.datetime.strptime(s[:n], fmt).date()
        except Exception:
            pass
    return None

def kind(text):
    t = text.lower()
    if "result" in t: return "Result"
    if "dividend" in t: return "Dividend"
    if "transcript" in t or "earnings call" in t or "con. call" in t: return "Earnings Call"
    if "analyst" in t or "investor" in t: return "Investor Meet"
    return "Other"

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

    # 1. recent results (NSE financial results list)
    try:
        rows = nse_get("/api/corporates-financial-results", {"index": "equities", "period": "Quarterly"})
    except Exception as e:
        rows = []; warns.append(f"Results list: {e}")
    print("DEBUG results type:", type(rows).__name__, "| count:", len(rows) if hasattr(rows, "__len__") else "-")
    if isinstance(rows, list) and rows:
        print("DEBUG first row keys:", list(rows[0].keys())[:25])
        print("DEBUG first row sample:", {k: rows[0][k] for k in list(rows[0].keys())[:8]})
    elif isinstance(rows, dict):
        print("DEBUG dict keys:", list(rows.keys())[:20])
    latest = {}
    cutoff = TODAY - dt.timedelta(days=RESULT_DAYS)
    for x in rows if isinstance(rows, list) else []:
        sym = (x.get("symbol") or "").strip()
        rd = parse_date(x.get("broadCastDate") or x.get("toDate") or "")
        if not sym or (rd and rd < cutoff): continue
        if sym not in latest:
            latest[sym] = {"sym": sym, "name": (x.get("companyName") or sym).strip(), "rd": rd,
                           "u": x.get("attchmntFile") or ""}
    for r in list(latest.values())[:MAX_RESULT_CARDS]:
        try:
            card = fetch_result(r["sym"] + ".NS", r["name"], r["rd"])
        except Exception as e:
            warns.append(f"{r['name']}: {e}"); card = {"n": r["name"], "p": None, "m": None, "pe": None}
        card["u"] = r["u"]; card["rd"] = str(r["rd"] or "")
        cards.append(card); seen.add(r["name"])
        time.sleep(0.5)

    # 2. watchlist (always shown)
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

    # 3. announcements
    items = []
    try:
        ann = nse_get("/api/corporate-announcements", {"index": "equities"})
        for x in ann if isinstance(ann, list) else []:
            desc = (x.get("desc") or "").strip()
            d = parse_date(x.get("sort_date") or x.get("an_dt") or "")
            items.append({"date": d or TODAY, "c": (x.get("companyName") or x.get("symbol") or "").strip(),
                          "k": kind(desc + " " + (x.get("attchmntText") or "")[:200]),
                          "t": desc or "Announcement", "s": (x.get("attchmntText") or "")[:160],
                          "u": x.get("attchmntFile") or ""})
    except Exception as e:
        warns.append(f"Announcements: {e}")
    items.sort(key=lambda a: a["date"], reverse=True)
    out = []
    for a in items[:MAX_ANN]:
        lab = "Today" if a["date"] == TODAY else a["date"].strftime("%d %B %Y").lstrip("0")
        out.append({"d": lab, "c": a["c"], "k": a["k"], "t": a["t"], "s": a["s"], "u": a["u"]})

    # 4. upcoming result meetings (NSE event calendar)
    upcoming = []
    try:
        ev = nse_get("/api/event-calendar", {"index": "equities"})
        for x in ev if isinstance(ev, list) else []:
            purpose = (x.get("purpose") or x.get("bm_desc") or "")
            if "result" not in purpose.lower(): continue
            d = parse_date(x.get("date") or "")
            if d and d >= TODAY:
                upcoming.append((d, [d.strftime("%a, %d %b"), (x.get("company") or x.get("symbol") or "").strip(), "Result"]))
    except Exception as e:
        warns.append(f"Event calendar: {e}")
    upcoming = [v for d, v in sorted(upcoming, key=lambda t: t[0])][:40]
    if out or upcoming:
        old = load("announcements.json", {"items": [], "upcoming": []})
        save("announcements.json", {"upcoming": upcoming or old.get("upcoming", []), "items": out or old.get("items", [])})

    print("Updated:", stamp, "| result cards:", len(cards), "| announcements:", len(out), "| upcoming:", len(upcoming))
    for w in warns[:30]: print("WARN", w)

if __name__ == "__main__":
    main()
    
