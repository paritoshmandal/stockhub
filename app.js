/* StockHub: Blogger-e ekta line diye load hoy. Notun feature dite shudhu ei file bodlao. */
(function(){
var S=document.currentScript,B=S.src.replace(/[^\/]*$/,''),R=document.getElementById('sh');
if(!R)return;
var vars='#sh{--bg:#eaeef6;--card:#fff;--tx:#1d2333;--mu:#6b7385;--ln:#dfe4ee;--ac:#5b57e8;--up:#4caf12;--dn:#e5484d}#sh[data-theme="dark"]{--bg:#171a24;--card:#222634;--tx:#e8ebf3;--mu:#9aa2b5;--ln:#323849;--ac:#8c89ff;--up:#5fd02a;--dn:#ff6b70}';
var css='{box-sizing:border-box}.root{background:var(--bg);color:var(--tx);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:14px;border-radius:12px}'+
'.top{display:flex;justify-content:space-between;align-items:center}.top h2{font-size:22px;margin:0;color:var(--tx)}'+
'.tg,.chip{border:1px solid var(--ln);background:var(--card);color:var(--tx);border-radius:20px;padding:6px 12px;font-size:13px;cursor:pointer}'+
'.tabs{display:flex;border-bottom:2px solid var(--ln);margin:12px 0}.tab{flex:1;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-2px;padding:10px;font-size:16px;font-weight:600;color:var(--mu);cursor:pointer}.tab.on{color:var(--ac);border-color:var(--ac)}'+
'.q{width:100%;padding:10px 12px;border:1px solid var(--ln);border-radius:8px;background:var(--card);color:var(--tx);font-size:15px;margin-bottom:10px}'+
'.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}.chip{flex:none;color:var(--ac);font-size:14px}.chip.on{background:var(--ac);color:#fff;border-color:var(--ac)}'+
'.co{margin:20px 0 8px;display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline}.co h3{margin:0;font-size:18px;width:100%;color:var(--tx)}.co span{color:var(--mu)}.co b{color:var(--tx)}'+
'.card{background:var(--card);border-radius:14px;padding:6px 14px;overflow-x:auto}table{width:100%;border-collapse:collapse;border:0}th{color:var(--mu);font-weight:500;text-align:right;padding:10px 6px;border:0;border-bottom:1px solid var(--ln);font-size:13px;background:none}td{text-align:right;padding:11px 6px;border:0;background:none}th:first-child,td:first-child{text-align:left}'+
'.yoy{font-size:13px;font-weight:600;white-space:nowrap}.up{color:var(--up)}.dn{color:var(--dn)}'+
'.box{background:var(--card);border-radius:14px;padding:4px 14px}.r{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--ln);font-size:14px}.r:last-child{border:0}'+
'.dt{color:var(--mu);font-size:12px;font-weight:600;text-transform:uppercase;margin:20px 0 8px}'+
'.an{background:var(--card);border-radius:10px;padding:12px 14px;margin-bottom:10px}.an .c{font-weight:600}.an .t{color:var(--ac);font-size:13.5px;margin:3px 0}.an .s{color:var(--mu);font-size:13.5px}.an a{font-size:12.5px;color:var(--ac);text-decoration:none;display:inline-block;margin-top:6px}'+
'.tag{display:inline-block;font-size:11px;border-radius:5px;padding:1px 7px;margin-left:6px;background:var(--bg);color:var(--mu);font-weight:500}'+
'.ft{color:var(--mu);font-size:12px;text-align:center;margin:20px 0 4px}.emp{text-align:center;color:var(--mu);padding:28px}.hid{display:none}';
css=css.replace(/([^{}]+)\{/g,function(m,s){return s.split(',').map(function(x){return'#sh '+x.trim()}).join(',')+'{'}).replace('#sh {box-sizing:border-box}','#sh,#sh *{box-sizing:border-box}');
var st=document.createElement('style');st.textContent=vars+css;document.head.appendChild(st);
R.setAttribute('data-theme',matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function f(v){return v>=100?Math.round(v):v>=10?v.toFixed(1):v.toFixed(2)}
function yoy(a){var c=a[0],b=a[2];if(!(b>0))return'<span class="yoy">—</span>';var d=(c-b)/b*100,u=d>=0;return'<span class="yoy '+(u?'up':'dn')+'">'+(u?'↑ ':'↓ ')+Math.abs(Math.round(d))+'%</span>'}
function row(l,a,r){return'<tr><td>'+l+'</td><td>'+yoy(a)+'</td>'+a.map(function(v){return'<td>'+(r?'₹ ':'')+f(v)+'</td>'}).join('')+'</tr>'}
function g(a){return a[2]>0?(a[0]-a[2])/a[2]:0}
R.innerHTML='<div class="root"><div class="top"><h2>Stock Updates</h2><button class="tg" id="shtg">Light / Dark</button></div><div class="tabs" id="shtabs"><button class="tab on" data-t="res">Results</button><button class="tab" data-t="ann">Announcements</button></div>'+
'<div id="shres"><input class="q" id="shq" type="search" placeholder="Company search..."><div class="chips" id="shrch"><button class="chip on" data-f="all">All</button><button class="chip" data-f="np">Profit up</button><button class="chip" data-f="sales">Sales up</button><button class="chip" data-f="dn">Profit down</button></div><div id="shrl"><div class="emp">Loading...</div></div></div>'+
'<div id="shann" class="hid"><div class="dt">Upcoming results</div><div class="box" id="shupc"></div><div class="chips" id="shach" style="margin-top:14px"><button class="chip on" data-f="all">All</button><button class="chip" data-f="Result">Results</button><button class="chip" data-f="Dividend">Dividend</button><button class="chip" data-f="Investor Meet">Investor Meet</button><button class="chip" data-f="Earnings Call">Earnings Call</button></div><div id="shal"></div></div>'+
'<p class="ft">Informational purpose only, not investment advice. Data: BSE/NSE filings.</p></div>';
var $=function(i){return document.getElementById(i)},RD={cols:[],companies:[]},AD={upcoming:[],items:[]},rf='all',af='all';
function renderR(){var t=$('shq').value.toLowerCase(),h='';
RD.companies.filter(function(d){if(t&&d.n.toLowerCase().indexOf(t)<0)return false;if(rf==='np')return g(d.np)>0;if(rf==='sales')return g(d.s)>0;if(rf==='dn')return g(d.np)<0;return true}).forEach(function(d){
h+='<div class="co"><h3>'+esc(d.n)+'</h3><span>Price <b>₹ '+esc(d.p)+'</b></span><span>M.Cap <b>₹ '+Number(d.m).toLocaleString('en-IN')+' Cr</b></span><span>PE <b>'+esc(d.pe)+'</b></span></div><div class="card"><table><tr><th></th><th>YOY</th>'+RD.cols.map(function(c){return'<th>'+esc(c)+'</th>'}).join('')+'</tr>'+row('Sales',d.s)+row('EBIDT',d.e)+row('Net profit',d.np)+row('EPS',d.eps,1)+'</table></div>'});
$('shrl').innerHTML=h||'<div class="emp">Kichu pawa jayni</div>'}
function renderA(){var h='',last='';
AD.items.filter(function(a){return af==='all'||a.k===af}).forEach(function(a){if(a.d!==last){h+='<div class="dt">'+esc(a.d)+'</div>';last=a.d}
h+='<div class="an"><div class="c">'+esc(a.c)+'<span class="tag">'+esc(a.k)+'</span></div><div class="t">'+esc(a.t)+'</div>'+(a.s?'<div class="s">'+esc(a.s)+'</div>':'')+(/^https:\/\//.test(a.u||'')?'<a href="'+esc(a.u)+'" target="_blank" rel="noopener">BSE/NSE PDF ↗</a>':'')+'</div>'});
$('shal').innerHTML=h||'<div class="emp">Kichu pawa jayni</div>';
$('shupc').innerHTML=AD.upcoming.map(function(u){return'<div class="r"><span>'+esc(u[0])+' · '+esc(u[1])+'</span><span style="color:var(--mu)">'+esc(u[2])+'</span></div>'}).join('')||'<div class="emp">Kichu nei</div>'}
function chips(id,cb){$(id).addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;cb(b.dataset.f);[].forEach.call(this.children,function(c){c.classList.toggle('on',c===b)})})}
chips('shrch',function(v){rf=v;renderR()});chips('shach',function(v){af=v;renderA()});
$('shq').addEventListener('input',renderR);
$('shtabs').addEventListener('click',function(e){var b=e.target.closest('.tab');if(!b)return;[].forEach.call(this.children,function(c){c.classList.toggle('on',c===b)});$('shres').classList.toggle('hid',b.dataset.t!=='res');$('shann').classList.toggle('hid',b.dataset.t!=='ann')});
$('shtg').addEventListener('click',function(){R.setAttribute('data-theme',R.getAttribute('data-theme')==='dark'?'light':'dark')});
function load(n){return fetch(B+n+'.json').then(function(r){if(!r.ok)throw 0;return r.json()})}
load('results').then(function(d){RD=d;renderR()}).catch(function(){$('shrl').innerHTML='<div class="emp">Data load hoyni</div>'});
load('announcements').then(function(d){AD=d;renderA()}).catch(function(){$('shal').innerHTML='<div class="emp">Data load hoyni</div>'});
})();
