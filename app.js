/* StockHub front-end. Put <div id="sh"></div> + this script in a Blogger HTML post/page.
   Reads results.json and announcements.json from the same folder as this file. */
(function () {
  var root = document.getElementById("sh");
  if (!root) return;
  var src = (document.currentScript && document.currentScript.src) || "";
  var BASE = src.replace(/[^\/]*$/, "");
  var PAGE = 20;
  var state = { tab: "results", q: "", shown: PAGE, res: null, ann: null };

  var css = "\
#sh{font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:900px;margin:0 auto}\
#sh *{box-sizing:border-box}\
#sh .sh-head{background:linear-gradient(90deg,#034f84,#6290b1);color:#fff;padding:14px 16px;border-radius:12px 12px 0 0}\
#sh .sh-head h2{margin:0;font-size:20px;color:#fff}\
#sh .sh-head small{opacity:.9}\
#sh .sh-tabs{display:flex;gap:6px;background:#eaf2f8;padding:8px}\
#sh .sh-tab{flex:1;border:0;background:#fff;color:#034f84;padding:9px 4px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer}\
#sh .sh-tab.on{background:#034f84;color:#fff}\
#sh .sh-q{width:100%;padding:10px 12px;border:1px solid #c5d5e2;border-radius:8px;font-size:15px;margin:8px 0}\
#sh .sh-card{border:1px solid #d6e3ee;border-radius:10px;margin:10px 0;padding:12px;background:#fff}\
#sh .sh-top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}\
#sh .sh-name{font-weight:700;color:#034f84;font-size:16px}\
#sh .sh-date{font-size:12px;color:#6b7280}\
#sh .sh-meta{font-size:13px;color:#374151;margin:6px 0}\
#sh table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}\
#sh th{background:#eaf2f8;color:#034f84;padding:6px;text-align:right}\
#sh th:first-child,#sh td:first-child{text-align:left}\
#sh td{padding:6px;border-bottom:1px solid #eef2f6;text-align:right}\
#sh .sh-pend{background:#fff7e6;border:1px solid #f5d79a;color:#8a5a00;padding:8px;border-radius:8px;font-size:13px;margin-top:6px}\
#sh a.sh-pdf{display:inline-block;margin-top:8px;background:#034f84;color:#fff;padding:7px 12px;border-radius:8px;text-decoration:none;font-size:13px}\
#sh .sh-tag{display:inline-block;background:#eaf2f8;color:#034f84;border-radius:6px;padding:2px 7px;font-size:12px;font-weight:700;margin-right:6px}\
#sh .sh-more{display:block;margin:12px auto;background:#16a34a;color:#fff;border:0;padding:10px 22px;border-radius:8px;font-weight:700;cursor:pointer}\
#sh .sh-empty{padding:20px;text-align:center;color:#6b7280}\
#sh .sh-foot{font-size:11px;color:#6b7280;margin-top:14px;line-height:1.5}\
#sh .sh-up{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #d6e3ee;border-radius:10px;margin:8px 0;font-size:14px}";
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

  function resultCard(c) {
    var h = '<div class="sh-card"><div class="sh-top"><span class="sh-name">' + esc(c.n) +
      '</span><span class="sh-date">' + esc(c.rd || "") + "</span></div>";
    var meta = [];
    if (c.p != null) meta.push("Price ₹" + num(c.p, 2));
    if (c.m != null) meta.push("Mkt Cap ₹" + num(c.m) + " Cr");
    if (c.pe != null) meta.push("P/E " + num(c.pe, 1));
    if (meta.length) h += '<div class="sh-meta">' + meta.join(" &nbsp;|&nbsp; ") + "</div>";
    if (c.cols && c.s) {
      h += "<table><tr><th>₹ Cr</th>";
      for (var i = 0; i < 3; i++) h += "<th>" + esc(c.cols[i] || "-") + "</th>";
      h += "</tr>";
      [["Sales", "s", 1], ["EBITDA", "e", 1], ["Net Profit", "np", 1], ["EPS (₹)", "eps", 2]].forEach(function (r) {
        var a = c[r[1]] || [];
        h += "<tr><td>" + r[0] + "</td>";
        for (var j = 0; j < 3; j++) h += "<td>" + num(a[j], r[2]) + "</td>";
        h += "</tr>";
      });
      h += "</table>";
    } else {
      h += '<div class="sh-pend">Numbers pending — result ta ekhono data source-e ashe ni (1–2 din lagte pare). PDF-e dekhte paro.</div>';
    }
    var u = safeUrl(c.u);
    if (u) h += '<a class="sh-pdf" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Result PDF</a>';
    return h + "</div>";
  }

  function annCard(a) {
    var h = '<div class="sh-card"><div class="sh-top"><span class="sh-name">' + esc(a.c) +
      '</span><span class="sh-date">' + esc(a.d) + '</span></div><div class="sh-meta"><span class="sh-tag">' +
      esc(a.k) + "</span>" + esc(a.t) + "</div>";
    if (a.s) h += '<div class="sh-meta">' + esc(a.s) + "</div>";
    var u = safeUrl(a.u);
    if (u) h += '<a class="sh-pdf" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">PDF</a>';
    return h + "</div>";
  }

  function render() {
    var res = state.res, ann = state.ann;
    var q = state.q.trim().toLowerCase();
    var html = '<div class="sh-head"><h2>StockHub</h2><small>' +
      (res && res.updated ? "Updated: " + esc(res.updated) : "Loading…") + "</small></div>";
    html += '<div class="sh-tabs">';
    [["results", "Results"], ["ann", "Updates"], ["up", "Upcoming"]].forEach(function (t) {
      html += '<button class="sh-tab' + (state.tab === t[0] ? " on" : "") + '" data-t="' + t[0] + '">' + t[1] + "</button>";
    });
    html += "</div>";
    if (state.tab !== "up") html += '<input class="sh-q" placeholder="Company search…" value="' + esc(state.q) + '">';

    var list = [], body = "";
    if (state.tab === "results") {
      list = ((res && res.companies) || []).filter(function (c) { return !q || (c.n || "").toLowerCase().indexOf(q) > -1; });
      body = list.slice(0, state.shown).map(resultCard).join("");
    } else if (state.tab === "ann") {
      list = ((ann && ann.items) || []).filter(function (a) { return !q || (a.c || "").toLowerCase().indexOf(q) > -1; });
      body = list.slice(0, state.shown).map(annCard).join("");
    } else {
      list = (ann && ann.upcoming) || [];
      body = list.map(function (u) {
        return '<div class="sh-up"><span><b>' + esc(u[1]) + "</b></span><span>" + esc(u[0]) + " · " + esc(u[2]) + "</span></div>";
      }).join("");
    }
    html += body || '<div class="sh-empty">' + (res || ann ? "Kichu paoa jayni." : "Data load hocche…") + "</div>";
    if (state.tab !== "up" && list.length > state.shown) html += '<button class="sh-more">Show more</button>';
    html += '<div class="sh-foot">Source: BSE public announcements, Yahoo Finance (unofficial, deri hote pare). Eta shudhu tothyer jonno, invest korar poramorsho noy. Invest korar age official filing dekhe nao.</div>';
    root.innerHTML = html;

    Array.prototype.forEach.call(root.querySelectorAll(".sh-tab"), function (b) {
      b.onclick = function () { state.tab = b.getAttribute("data-t"); state.shown = PAGE; render(); };
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
