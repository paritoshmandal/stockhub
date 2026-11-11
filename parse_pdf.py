"""BSE result PDF theke Sales/EBIDT/Net profit/EPS ber kore (SEBI standard table)."""
import io, re
import requests
import pdfplumber

MONTHS = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
          7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
QEND = {(30, 6), (30, 9), (31, 12), (31, 3)}
NUM = re.compile(r"\(?-?\d[\d,]*\.?\d*\)?")


def to_num(tok):
    t = tok.strip()
    neg = (t.startswith("(") and t.endswith(")")) or t.startswith("-")
    try:
        v = float(t.strip("()-").replace(",", ""))
    except ValueError:
        return None
    return -v if neg else v


def row(lines, pats, min_nums=3):
    for p in pats:
        rx = re.compile(p, re.I)
        for ln in lines:
            m = rx.search(ln)
            if not m:
                continue
            nums = [to_num(x) for x in NUM.findall(ln[m.end():])]
            nums = [n for n in nums if n is not None]
            if len(nums) >= min_nums:
                return nums[:3]
    return None


def unit_div(text):
    t = text[:4000].lower()
    if "crore" in t:
        return 1.0
    if "lakh" in t or "lacs" in t or "lac)" in t:
        return 100.0
    if "million" in t:
        return 10.0
    if "thousand" in t:
        return 10000.0
    return None


def quarter_labels(text):
    out = []
    for d, m, y in re.findall(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", text[:6000]):
        d, m, y = int(d), int(m), int(y)
        if (d, m) in QEND:
            lab = "%s %d" % (MONTHS[m], y)
            if lab not in out:
                out.append(lab)
        if len(out) == 3:
            return out
    return None


def parse_text(text):
    low = text.lower()
    m = re.search(r"statement of (audited |unaudited )?consolidated|consolidated (audited |unaudited )?financial results", low)
    body = text[m.start():] if m else text
    lines = [l.strip() for l in body.splitlines() if l.strip()]
    div = unit_div(text)
    cols = quarter_labels(body) or quarter_labels(text)
    if div is None or cols is None:
        return None
    sales = row(lines, [r"revenue from operations", r"total income"])
    np_ = row(lines, [r"(net )?profit\s*(/\s*\(loss\)\s*)?(\(?after tax\)?\s*)?for the (period|quarter)",
                      r"profit after tax", r"net profit.{0,20}after tax"])
    eps = row(lines, [r"\bbasic\b"])
    if not (sales and np_):
        return None
    pbt = row(lines, [r"profit.{0,40}before.{0,30}tax"])
    fin = row(lines, [r"finance costs?"])
    dep = row(lines, [r"depreciation"])
    sc = lambda a: [round(x / div, 2) for x in a] if a else None
    ebidt = None
    if pbt and fin and dep:
        ebidt = [round((pbt[i] + fin[i] + dep[i]) / div, 2) for i in range(3)]
    return {"cols": cols, "s": sc(sales), "e": ebidt, "np": sc(np_), "eps": eps}


def parse_url(url, session=None):
    s = session or requests
    r = s.get(url, timeout=60, headers={"Referer": "https://www.bseindia.com/"})
    r.raise_for_status()
    with pdfplumber.open(io.BytesIO(r.content)) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages[:5])
    return parse_text(text)
