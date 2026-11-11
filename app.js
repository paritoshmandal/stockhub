/* StockHub front-end (Screener-style cards). Blogger HTML-e: <div id="sh"></div> + this script. */
(function () {
  var root = document.getElementById("sh");
  if (!root) return;
  var src = (document.currentScript && document.currentScript.src) || "";
  var BASE = src.replace(/[^\/]*$/, "");
  var PAGE = 20;
  var state = { tab: "results", q: "", f: "has", shown: PAGE, res: null, ann: null };

  var css = "\
#sh{font-family:Inter,Arial,Helvetica,sans-serif;color:#1f2937;max-width:900px;width:100%;margin:0 auto;font-size:14px;background:#eaeff6;padding:12px;border-radius:12px;overflow-x:hidden}\
#sh *{box-sizing:border-box}\
#sh .sh-title{font-size:22px;font-weight:700;margin:2px 0 4px}\
#sh .sh-upd{font-size:12px;color:#6b7280;margin-bottom:10px}\
#sh .sh-bar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}\
#sh .sh-tab{border:0;background:#fff;color:#5b4fe0;padding:8px 14px;border-radius:20px;font-weight:700;font-size:13px;cursor:pointer}\
#sh .sh-tab.on{background:#5b4fe0;color:#fff}\
#sh .sh-q{width:100%;padding:10px 14px;border:1px solid #d5dbe6;border-radius:10px;font-size:15px;margin-bottom:8px;background:#fff}\
#sh .sh-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}\
#sh .sh-chip{border:1px solid #d5dbe6;background:#fff;color:#444;border-radius:16px;padding:5px 12px;font-size:12px;cursor:pointer}\
#sh .sh-chip.on{background:#5b4fe0;color:#fff;border-color:#5b4fe0}\
#sh .sh-co{margin:18px 2px 8px}\
#sh .sh-name{font-size:21px;font-weight:600;color:#1f2937}\
#sh .sh-ic{display:inline-block;margin-left:8px;color:#5b4fe0;text-decoration:none;font-size:15px;font-weight:600;vertical-align:middle}\
#sh .sh-ic.pdf{color:#6b7280;font-size:13px;border:1px solid #c9d0dc;border-radius:5px;padding:1px 7px;background:#fff}\
#sh .sh-meta{font-size:14px;color:#6b7280;margin-top:5px}\
#sh .sh-meta b{color:#4b5563;font-weight:600;margin-right:10px}\
#sh .sh-card{background:#fff;border-radius:14px;padding:12px 10px 8px;margin:0 0 6px}\
#sh .sh-tw{overflow-x:auto}\
#sh table{width:100%;border-collapse:collapse;font-size:15px}\
#sh th{font-weight:500;color:#6b7280;padding:6px 6px 10px;text-align:right;border-bottom:1px solid #dfe4ec;line-height:1.25;font-size:14px}\
#sh td{padding:12px 6px;text-align:right;color:#374151;white-space:nowrap}\
#sh th:first-child,#sh td:first-child{text-align:left;white-space:normal;color:#374151;width:26%}\
#sh td.sh-yoy,#sh th.sh-yoy{width:20%}\
#sh .sh-g{color:#65a30d;font-weight:600;font-size:13px}\
#sh .sh-r{color:#e5484d;font-weight:600;font-size:13px}\
#sh .sh-i{display:inline-block;width:15px;height:15px;border:1.5px solid #6b7280;border-radius:50%;font-size:10px;line-height:12px;text-align:center;color:#6b7280;margin-right:6px;vertical-align:middle;cursor:help}\
#sh .sh-pend{background:#fff8e6;border:1px solid #f3d58a;color:#7a5200;padding:10px 12px;border-radius:10px;font-size:13px;margin:2px 0 4px}\
#sh .sh-more{display:block;margin:14px auto;background:#5b4fe0;color:#fff;border:0;padding:10px 24px;border-radius:10px;font-weight:700;cursor:pointer}\
#sh .sh-empty{padding:20px;text-align:center;color:#6b7280}\
#sh .sh-row{display:flex;justify-content:space-between;gap:10px;background:#fff;border-radius:12px;padding:12px;margin-bottom:8px}\
#sh .sh-dh{font-size:12px;letter-spacing:.5px;color:#6b7280;margin:16px 2px 8px;text-transform:uppercase}\
#sh .sh-an{background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px}\
#sh .sh-an .cn{font-weight:600;font-size:15px;color:#1f2937}\
#sh .sh-an a.tt,#sh .sh-an span.tt{display:block;color:#5b4fe0;font-size:14px;margin:6px 0 4px;text-decoration:none;line-height:1.35}\
#sh .sh-an .ds{color:#6b7280;font-size:13px;line-height:1.4}\
#sh .sh-tag{font-size:11px;color:#5b4fe0;background:#eeecfd;border-radius:4px;padding:1px 6px;margin-right:6px}\
#sh .sh-foot{font-size:11px;color:#6b7280;margin:14px 2px 0;line-height:1.5}";
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
  /* Screener-style: 3 significant digits (142, 57.2, 93.0, 7.84) */
  function f3(v) {
    if (v === null || v === undefined || isNaN(v)) return "–";
    var a = Math.abs(v);
    if (a >= 100) return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    return Number(v).toPrecision(3);
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function pct(a) {
    if (!a || a[0] == null || a[2] == null || !a[2]) return null;
    return (a[0] - a[2]) / Math.abs(a[2]) * 100;
  }
  function hasNeg(a) { return (a || []).some(function (x) { return x != null && x < 0; }); }
  function yoyCell(a) {
    var p = pct(a);
    if (p === null) return '<td class="sh-yoy">–</td>';
    var up = p >= 0;
    return '<td class="sh-yoy ' + (up ? "sh-g" : "sh-r") + '">' + (up ? "↑ " : "↓ ") + Math.abs(Math.round(p)) + "%</td>";
  }
  function colHead(s) {
    var p = String(s || "-").split(" ");
    return p.length > 1 ? esc(p[0]) + "<br>" + esc(p[1]) : esc(p[0]);
  }

  function resultCard(c) {
    var h = '<div class="sh-co"><div><span class="sh-name">' + esc(c.n) + "</span>" +
      '<a class="sh-ic" title="Screener" target="_blank" rel="noopener noreferrer" href="https://www.screener.in/company/' + encodeURIComponent(c.n) + '/">↗</a>';
    var u = safeUrl(c.u);
    if (u) h += '<a class="sh-ic pdf" target="_blank" rel="noopener noreferrer" href="' + esc(u) + '">PDF</a>';
    h += "</div>";
    var meta = [];
    if (c.p != null) meta.push("Price <b>₹ " + num(c.p, c.p >= 100 ? 0 : 2) + "</b>");
    if (c.m != null) meta.push("M.Cap <b>₹ " + num(c.m) + " Cr</b>");
    if (c.pe != null) meta.push("PE <b>" + num(c.pe, 1) + "</b>");
    if (meta.length) h += '<div class="sh-meta">' + meta.join(" ") + "</div>";
    h += '</div><div class="sh-card">';
    if (c.cols && c.s) {
      h += '<div class="sh-tw"><table><tr><th></th><th class="sh-yoy">YOY</th>';
      for (var i = 0; i < 3; i++) h += "<th>" + colHead(c.cols[i]) + "</th>";
      h += "</tr>";
      [["Sales", "s"], ["EBIDT", "e"], ["Net profit", "np"], ["EPS", "eps"]].forEach(function (r) {
        var a = c[r[1]] || [];
        var info = (r[1] === "np" || r[1] === "eps") && hasNeg(a) ? '<span class="sh-i" title="Loss/negative base: YoY % may not be meaningful">i</span>' : "";
        h += "<tr><td>" + r[0] + "</td>" + yoyCell(a).replace('class="sh-yoy', 'class="sh-yoy').replace(">", ">" + info);
        for (var j = 0; j < 3; j++) {
          var v = a[j];
          h += "<td>" + (r[1] === "eps" && v != null ? "₹ " + Number(v).toFixed(2) : f3(v)) + "</td>";
        }
        h += "</tr>";
      });
      h += "</table></div>";
    } else {
      h += '<div class="sh-pend">Numbers pending: result ta ekhono data source-e ashe ni (1–2 din lagte pare). PDF-e dekhte paro.</div>';
    }
    return h + "</div>";
  }

  function annCard(a) {
    var u = safeUrl(a.u);
    var title = esc(a.t || a.k || "Announcement");
    var h = '<div class="sh-an"><div><span class="cn">' + esc(a.c) + "</span>";
    h += '<a class="sh-ic" title="Screener" target="_blank" rel="noopener noreferrer" href="https://www.screener.in/company/' + encodeURIComponent(a.c) + '/">↗</a></div>';
    h += u ? '<a class="tt" target="_blank" rel="noopener noreferrer" href="' + esc(u) + '">' + title + "</a>" : '<span class="tt">' + title + "</span>";
    if (a.s) h += '<div class="ds">' + esc(a.s) + "</div>";
    return h + "</div>";
  }
  function annList(items) {
    var out = "", last = null;
    items.forEach(function (a) {
      if (a.d !== last) { last = a.d; out += '<div class="sh-dh">' + esc(a.d || "") + "</div>"; }
      out += annCard(a);
    });
    return out;
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
      [["has", "Results"], ["all", "All (PDF only too)"], ["pu", "Profit up"], ["su", "Sales up"], ["pd", "Profit down"]].forEach(function (f) {
        html += '<button class="sh-chip' + (state.f === f[0] ? " on" : "") + '" data-f="' + f[0] + '">' + f[1] + "</button>";
      });
      html += "</div>";
      list = ((res && res.companies) || []).filter(function (c) {
        if (q && (c.n || "").toLowerCase().indexOf(q) < 0) return false;
        if (state.f === "all") return true;
        if (state.f === "has") return !!(c.cols && c.s);
        var g = pct(state.f === "su" ? c.s : c.np);
        if (g === null) return false;
        return state.f === "pd" ? g < 0 : g >= 0;
      });
      body = list.slice(0, state.shown).map(resultCard).join("");
    } else if (state.tab === "ann") {
      html += '<input class="sh-q" placeholder="Company search…" value="' + esc(state.q) + '">';
      list = ((ann && ann.items) || []).filter(function (a) { return !q || (a.c || "").toLowerCase().indexOf(q) > -1; });
      body = annList(list.slice(0, state.shown));
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
