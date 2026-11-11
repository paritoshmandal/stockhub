/* StockHub front-end (Screener-style). Blogger HTML-e: <div id="sh"></div> + this script.
   Reads results.json and announcements.json from the same folder as this file. */
(function () {
  var root = document.getElementById("sh");
  if (!root) return;
  var src = (document.currentScript && document.currentScript.src) || "";
  var BASE = src.replace(/[^\/]*$/, "");
  var PAGE = 20;
  var state = { tab: "results", q: "", f: "all", shown: PAGE, res: null, ann: null };

  var css = "\
#sh{font-family:Arial,Helvetica,sans-serif;color:#222;max-width:900px;margin:0 auto;font-size:14px}\
#sh *{box-sizing:border-box}\
#sh .sh-title{font-size:22px;font-weight:700;margin:6px 0 4px}\
#sh .sh-upd{font-size:12px;color:#777;margin-bottom:10px}\
#sh .sh-bar{display:flex;gap:6px;margin-bottom:8px}\
#sh .sh-tab{border:1px solid #c9d6e2;background:#fff;color:#034f84;padding:7px 12px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer}\
#sh .sh-tab.on{background:#034f84;color:#fff;border-color:#034f84}\
#sh .sh-q{width:100%;padding:9px 12px;border:1px solid #c9d6e2;border-radius:6px;font-size:14px;margin-bottom:8px}\
#sh .sh-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}\
#sh .sh-chip{border:1px solid #c9d6e2;background:#fff;color:#444;border-radius:14px;padding:4px 11px;font-size:12px;cursor:pointer}\
#sh .sh-chip.on{background:#034f84;color:#fff;border-color:#034f84}\
#sh .sh-card{background:#fff;border:1px solid #e3e8ee;border-radius:8px;padding:12px 14px;margin:0 0 12px}\
#sh .sh-name{font-size:17px;font-weight:700;color:#1d1d1d}\
#sh .sh-pdf{margin-left:10px;font-size:12px;color:#034f84;text-decoration:none;border:1px solid #c9d6e2;border-radius:4px;padding:2px 7px;white-space:nowrap}\
#sh .sh-meta{font-size:13px;color:#555;margin:4px 0 8px}\
#sh .sh-meta b{color:#222}\
#sh .sh-tag{font-size:11px;color:#034f84;background:#eaf2f8;border-radius:4px;padding:1px 6px;margin-right:6px}\
#sh table{width:100%;border-collapse:collapse;font-size:13px}\
#sh th{font-weight:600;color:#555;padding:6px 4px;text-align:right;border-bottom:1px solid #e3e8ee;line-height:1.3}\
#sh td{padding:7px 4px;text-align:right;border-bottom:1px solid #f1f4f7}\
#sh th:first-child,#sh td:first-child{text-align:left;color:#333;width:28%}\
#sh th.sh-yoy,#sh td.sh-yoy{width:16%}\
#sh .sh-up{color:#16a34a;font-weight:600}\
#sh .sh-dn{color:#dc2626;font-weight:600}\
#sh .sh-pend{background:#fff8e6;border:1px solid #f3d58a;color:#7a5200;padding:8px 10px;border-radius:6px;font-size:13px;margin-top:6px}\
#sh .sh-more{display:block;margin:10px auto;background:#034f84;color:#fff;border:0;padding:9px 22px;border-radius:6px;font-weight:700;cursor:pointer}\
#sh .sh-empty{padding:18px;text-align:center;color:#777}\
#sh .sh-row{display:flex;justify-content:space-between;gap:8px;border:1px solid #e3e8ee;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fff}\
#sh .sh-foot{font-size:11px;color:#777;margin:10px 0 0;line-height:1.5}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v, nd) {
    if (v === null || v === undefined || isNaN(v)) return "–";
    return Number(v).toLocaleString("en-IN", { minimumFractionDigits: nd || 0, maximumFractionDigits: nd || 0 });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function pct(a) {
    if (!a || a[0] == null || a[2] == null || !a[2]) return null;
    return (a[0] - a[2]) / Math.abs(a[2]) * 100;
  }
  function yoyCell(a) {
    var p = pct(a);
    if (p === null) return '<td class="sh-yoy">–</td>';
    var up = p >= 0;
    return '<td class="sh-yoy ' + (up ? "sh-up" : "sh-dn") + '">' + (up ? "↑ " : "↓ ") + Math.abs(Math.round(p)) + "%</td>";
  }

  function resultCard(c) {
    var h = '<div class="sh-card"><div><span class="sh-name">' + esc(c.n) + "</span>";
    var u = safeUrl(c.u);
    if (u) h += '<a class="sh-pdf" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">PDF ↗</a>';
    h += "</div>";
    var meta = [];
    if (c.p != null) meta.push("Price <b>₹ " + num(c.p, 2) + "</b>");
    if (c.m != null) meta.push("M.Cap <b>₹ " + num(c.m) + " Cr</b>");
    if (c.pe != null) meta.push("PE <b>" + num(c.pe, 1) + "</b>");
    if (meta.length) h += '<div class="sh-meta">' + meta.join(" &nbsp; ") + "</div>";
    if (c.cols && c.s) {
      h += "<table><tr><th></th><th class=\"sh-yoy\">YoY</th>";
      for (var i = 0; i < 3; i++) h += "<th>" + esc(c.cols[i] || "-") + "</th>";
      h += "</tr>";
      [["Sales", "s", 1], ["EBITDA", "e", 1], ["Net profit", "np", 1], ["EPS (₹)", "eps", 2]].forEach(function (r) {
        var a = c[r[1]] || [];
        h += "<tr><td>" + r[0] + "</td>" + yoyCell(a);
        for (var j = 0; j < 3; j++) h += "<td>" + num(a[j], r[2]) + "</td>";
        h += "</tr>";
      });
      h += "</table>";
    } else {
      h += '<div class="sh-pend">Numbers pending: result ta ekhono data source-e ashe ni (1–2 din lagte pare). PDF-e dekhte paro.</div>';
    }
    return h + "</div>";
  }

  function annCard(a) {
    var h = '<div class="sh-row"><div><div><b>' + esc(a.c) + "</b></div>" +
      '<div class="sh-meta"><span class="sh-tag">' + esc(a.k) + "</span>" + esc(a.t) + "</div>";
    if (a.s) h += '<div class="sh-meta">' + esc(a.s) + "</div>";
    h += "</div><div>" + esc(a.d);
    var u = safeUrl(a.u);
    if (u) h += '<br><a class="sh-pdf" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">PDF ↗</a>';
    return h + "</div></div>";
  }

  function render() {
    var res = state.res, ann = state.ann;
    var q = state.q.trim().toLowerCase();
    var html = '<div class="sh-title">Latest quarterly results</div>';
    html += '<div class="sh-upd">' + (res && res.updated ? "Updated: " + esc(res.updated) : "Loading…") + "</div>";
    html += '<div class="sh-bar">';
    [["results", "Results"], ["ann", "Announcements"], ["up", "Upcoming"]].forEach(function (t) {
      html += '<button class="sh-tab' + (state.tab === t[0] ? " on" : "") + '" data-t="' + t[0] + '">' + t[1] + "</button>";
    });
    html += "</div>";

    var list = [], body = "";
    if (state.tab === "results") {
      html += '<input class="sh-q" placeholder="Company search…" value="' + esc(state.q) + '">';
      html += '<div class="sh-chips">';
      [["all", "All"], ["pu", "Profit up"], ["su", "Sales up"], ["pd", "Profit down"]].forEach(function (f) {
        html += '<button class="sh-chip' + (state.f === f[0] ? " on" : "") + '" data-f="' + f[0] + '">' + f[1] + "</button>";
      });
      html += "</div>";
      list = ((res && res.companies) || []).filter(function (c) {
        if (q && (c.n || "").toLowerCase().indexOf(q) < 0) return false;
        if (state.f === "all") return true;
        var g = pct(state.f === "su" ? c.s : c.np);
        if (g === null) return false;
        return state.f === "pd" ? g < 0 : g >= 0;
      });
      body = list.slice(0, state.shown).map(resultCard).join("");
    } else if (state.tab === "ann") {
      html += '<input class="sh-q" placeholder="Company search…" value="' + esc(state.q) + '">';
      list = ((ann && ann.items) || []).filter(function (a) { return !q || (a.c || "").toLowerCase().indexOf(q) > -1; });
      body = list.slice(0, state.shown).map(annCard).join("");
    } else {
      list = (ann && ann.upcoming) || [];
      body = list.map(function (u) {
        return '<div class="sh-row"><b>' + esc(u[1]) + "</b><span>" + esc(u[0]) + " · " + esc(u[2]) + "</span></div>";
      }).join("");
    }
    html += body || '<div class="sh-empty">' + (res || ann ? "Kichu paoa jayni." : "Data load hocche…") + "</div>";
    if (state.tab !== "up" && list.length > state.shown) html += '<button class="sh-more">Show more</button>';
    html += '<div class="sh-foot">Source: BSE public announcements, Yahoo Finance (unofficial, deri hote pare). Shudhu tothyer jonno, invest korar age official filing dekhe nao.</div>';
    root.innerHTML = html;

    Array.prototype.forEach.call(root.querySelectorAll(".sh-tab"), function (b) {
      b.onclick = function () { state.tab = b.getAttribute("data-t"); state.shown = PAGE; render(); };
    });
    Array.prototype.forEach.call(root.querySelectorAll(".sh-chip"), function (b) {
      b.onclick = function () { state.f = b.getAttribute("data-f"); state.shown = PAGE; render(); };
    });
    var qi = root.querySelector(".sh-q");
    if (qi) qi.oninput = function () {
      state.q = qi.value; state.shown = PAGE; render();
      var n = root.querySelector(".sh-q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
    };
    var mb = root.querySelector(".sh-more");
    if (mb) mb.onclick = function () { state.shown += PAGE; render(); };
  }

  function get(name) {
    return fetch(BASE + name + "?v=" + Date.now()).then(function (r) {
      if (!r.ok) throw new Error(name + " " + r.status);
      return r.json();
    });
  }
  render();
  get("results.json").then(function (d) { state.res = d; render(); }).catch(function () { state.res = { companies: [] }; render(); });
  get("announcements.json").then(function (d) { state.ann = d; render(); }).catch(function () { state.ann = { items: [], upcoming: [] }; render(); });
})();
