let companies = [];
let jobs = [];
let state = { category:"全部", q:"", status:"all", sort:"priority", only27:true, onlyCs:false, onlyFj:false, onlyFav:false, shown:36 };
const favKey = "offer-radar-27-fav-complete";
let favs = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));
const $ = (id) => document.getElementById(id);

const meta = {
  "全部": {emoji:"🌐", cls:"g-tech", desc:"全部监控企业"},
  "科技企业": {emoji:"💻", cls:"g-tech", desc:"互联网、AI、硬件、芯片、云计算"},
  "央国企": {emoji:"🏛️", cls:"g-soe", desc:"能源、电网、通信、军工、建筑、制造"},
  "快消企业": {emoji:"🛒", cls:"g-fmcg", desc:"食品饮料、美妆日化、服饰零售"},
  "外企": {emoji:"🌍", cls:"g-foreign", desc:"咨询、医药、工业、汽车、物流"},
  "金融机构": {emoji:"🏦", cls:"g-finance", desc:"银行、券商、保险、基金、金融科技"},
  "福建本地": {emoji:"🌊", cls:"g-fujian", desc:"base 福建的高薪/优质/本地重点企业"}
};

async function loadData(){
  try{
    const [cRes, jRes] = await Promise.all([
      fetch("./data/companies.json?ts=" + Date.now()),
      fetch("./data/jobs.json?ts=" + Date.now())
    ]);
    companies = await cRes.json();
    const jobPayload = await jRes.json();
    jobs = Array.isArray(jobPayload) ? jobPayload : (jobPayload.jobs || []);
    $("updatedAt").textContent = jobPayload.generated_at ? "更新：" + jobPayload.generated_at.slice(0,16).replace("T"," ") : "已加载";
  }catch(e){
    $("updatedAt").textContent = "加载失败";
    console.error(e);
  }
  renderAll();
}

function initials(name){
  const n = String(name || "").replace(/[（(].*?[）)]/g,"");
  return /^[A-Za-z0-9]/.test(n) ? n.slice(0,2).toUpperCase() : n.slice(0,2);
}
function statusClass(s){
  return {
    "27届校招开放中":"s1",
    "27届实习转正":"s2",
    "27届提前批预热":"s3",
    "27届秋招预热":"s4",
    "待官网确认":"s5",
    "抓取失败":"s6"
  }[s] || "s5";
}
function daysLeft(d){
  if(!d) return null;
  const now = new Date();
  const end = new Date(d + "T00:00:00");
  return Math.ceil((end-now)/86400000);
}
function is27(item){
  const t = [item.status,item.title,item.recruit_type,item.graduate,item.note,...(item.matched_keywords||[])].join(" ");
  return /2027|27届|校园招聘|校招|秋招|提前批|实习/.test(t);
}
function isCs(item){
  const t = [item.title,item.recruit_type,item.company,item.note,...(item.roles||[]),...(item.matched_keywords||[])].join(" ");
  return (item.match_score || 0) >= 78 || /软件|算法|机器|数据|IT|科技|开发|信息|安全|量化|AI|云|芯片|半导体|计算机/.test(t);
}
function enrichJobs(){
  const map = new Map(companies.map(c => [c.id, c]));
  return jobs.map(j => {
    const c = map.get(j.company_id) || companies.find(x => x.name === j.company) || {};
    return {
      ...j,
      company_id: j.company_id || c.id,
      company: j.company || c.name,
      category: j.category || c.category,
      logo: c.logo || `https://www.google.com/s2/favicons?domain=${c.domain || ""}&sz=128`,
      domain: c.domain || "",
      url: j.url || c.career_url || "#",
      roles: j.roles || c.target_roles || [],
      city: j.city || c.target_cities || [],
      match_score: j.match_score || c.priority || 60
    };
  });
}
function getFiltered(){
  const q = state.q.trim().toLowerCase();
  let list = enrichJobs().filter(x => {
    const text = [x.company,x.category,x.status,x.title,x.recruit_type,x.note,x.domain,...(x.roles||[]),...(x.city||[]),...(x.matched_keywords||[])].join(" ").toLowerCase();
    return (state.category==="全部" || x.category===state.category)
      && (!q || text.includes(q))
      && (state.status==="all" || x.status===state.status)
      && (!state.only27 || is27(x))
      && (!state.onlyCs || isCs(x))
      && (!state.onlyFj || x.category==="福建本地")
      && (!state.onlyFav || favs.has(x.company_id || x.id));
  });
  list.sort((a,b) => {
    const rank = {"27届校招开放中":1,"27届实习转正":2,"27届提前批预热":3,"27届秋招预热":4,"待官网确认":5,"抓取失败":6};
    if(state.sort==="priority") return (rank[a.status]||9)-(rank[b.status]||9) || (b.match_score||0)-(a.match_score||0);
    if(state.sort==="fit") return (b.match_score||0)-(a.match_score||0);
    if(state.sort==="deadline") return (a.deadline||"2999-12-31").localeCompare(b.deadline||"2999-12-31");
    return String(a.company).localeCompare(String(b.company),"zh-CN");
  });
  return list;
}
function renderStats(){
  $("companyCount").textContent = companies.length || "—";
  $("fujianCount").textContent = companies.filter(c=>c.category==="福建本地").length || "—";
  $("openCount").textContent = jobs.filter(j => /开放|预热|实习/.test(j.status || "")).length || "—";
}
function renderBoards(){
  const cats = ["科技企业","央国企","快消企业","外企","金融机构","福建本地"];
  $("boardGrid").innerHTML = cats.map(cat => {
    const m = meta[cat];
    const count = companies.filter(c=>c.category===cat).length;
    return `<article class="board ${m.cls}" data-cat="${cat}">
      <div class="board-top">
        <h3 class="board-title"><span class="emoji">${m.emoji}</span><span>${cat}</span></h3>
        <p class="board-desc">${m.desc}</p>
      </div>
      <div class="board-count"><b>${count}</b><span>家公司</span></div>
    </article>`;
  }).join("");
  document.querySelectorAll(".board").forEach(el=>el.onclick=()=>{
    state.category = el.dataset.cat;
    state.onlyFj = state.category === "福建本地";
    state.shown = 36;
    renderAll();
    $("list").scrollIntoView({behavior:"smooth"});
  });
}
function renderChips(){
  const cats = ["全部","科技企业","央国企","快消企业","外企","金融机构","福建本地"];
  $("chips").innerHTML = cats.map(cat => `<button class="chip ${state.category===cat?'active':''}" data-cat="${cat}">${meta[cat].emoji} ${cat}</button>`).join("");
  document.querySelectorAll(".chip").forEach(btn=>btn.onclick=()=>{
    state.category = btn.dataset.cat;
    state.onlyFj = state.category === "福建本地" ? true : false;
    state.shown = 36;
    renderAll();
  });
}
function renderCards(){
  const list = getFiltered();
  $("countText").textContent = `显示 ${Math.min(state.shown,list.length)} / ${list.length}`;
  const show = list.slice(0,state.shown);
  $("companyList").innerHTML = show.map(x => {
    const left = daysLeft(x.deadline);
    const deadline = x.deadline ? (left !== null && left <= 14 ? `剩${left}天 · ${x.deadline}` : x.deadline) : "待官网确认";
    const key = x.company_id || x.id;
    const faved = favs.has(key);
    const city = (x.city||[]).slice(0,3).join(" / ") + ((x.city||[]).length>3 ? " 等" : "");
    const roles = (x.roles||[]).slice(0,4);
    return `<article class="card">
      <div class="card-top">
        <div class="company">
          <div class="logo">
            <img src="${x.logo}" alt="${x.company} logo" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'logo-fallback',textContent:'${initials(x.company)}'}))">
          </div>
          <div class="name">
            <h3 title="${x.company}">${x.company}</h3>
            <p>${x.category} · 匹配度 ${x.match_score || 60}%</p>
          </div>
        </div>
        <span class="badge ${statusClass(x.status)}" title="${x.status || '待官网确认'}">${x.status || '待官网确认'}</span>
      </div>
      <div class="meta"><span>⏳ ${deadline}</span><span>📍 ${city || "以官网为准"}</span><span>🎓 ${x.recruit_type || "2027届监控"}</span></div>
      <div class="roles">${roles.map(r=>`<span>${r}</span>`).join("")}</div>
      <p class="note">${x.title || "官网入口监控"} · 来源：${x.source_type || "official"}</p>
      <div class="actions">
        <a class="link" href="${x.url}" target="_blank" rel="noopener">进入官网入口</a>
        <button class="fav ${faved?'on':''}" data-id="${key}">${faved?'♥':'♡'}</button>
      </div>
    </article>`;
  }).join("");
  $("empty").style.display = list.length ? "none" : "block";
  $("loadMore").style.display = list.length > state.shown ? "block" : "none";
  $("loadMore").textContent = `加载更多（${Math.min(state.shown,list.length)} / ${list.length}）`;
  document.querySelectorAll(".fav").forEach(btn=>btn.onclick=()=>{
    const id = btn.dataset.id;
    favs.has(id) ? favs.delete(id) : favs.add(id);
    localStorage.setItem(favKey, JSON.stringify([...favs]));
    renderCards();
  });
}
function syncBtns(){
  $("filter27").classList.toggle("active", state.only27);
  $("filterCs").classList.toggle("active", state.onlyCs);
  $("filterFj").classList.toggle("active", state.onlyFj);
  $("filterFav").classList.toggle("active", state.onlyFav);
  $("statusSelect").value = state.status;
  $("sortSelect").value = state.sort;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  if(state.onlyFav) document.querySelector('[data-nav="fav"]').classList.add("active");
  else if(state.onlyFj || state.category==="福建本地") document.querySelector('[data-nav="福建本地"]').classList.add("active");
  else if(state.only27) document.querySelector('[data-nav="27"]').classList.add("active");
  else document.querySelector('[data-nav="home"]').classList.add("active");
}
function renderAll(){
  renderStats(); renderBoards(); renderChips(); renderCards(); syncBtns();
}

$("searchInput").addEventListener("input", e => { state.q=e.target.value; state.shown=36; renderCards(); });
$("filter27").onclick = () => { state.only27=!state.only27; state.shown=36; renderAll(); };
$("filterCs").onclick = () => { state.onlyCs=!state.onlyCs; state.shown=36; renderAll(); };
$("filterFj").onclick = () => { state.onlyFj=!state.onlyFj; state.category=state.onlyFj?"福建本地":"全部"; state.shown=36; renderAll(); };
$("filterFav").onclick = () => { state.onlyFav=!state.onlyFav; state.shown=36; renderAll(); };
$("statusSelect").onchange = e => { state.status=e.target.value; state.shown=36; renderCards(); syncBtns(); };
$("sortSelect").onchange = e => { state.sort=e.target.value; renderCards(); syncBtns(); };
$("loadMore").onclick = () => { state.shown += 36; renderCards(); };

document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>{
  const nav = btn.dataset.nav;
  if(nav==="home"){ state.category="全部"; state.onlyFj=false; state.onlyFav=false; state.only27=true; $("home").scrollIntoView({behavior:"smooth"}); }
  if(nav==="27"){ state.only27=true; state.onlyFj=false; state.onlyFav=false; state.category="全部"; $("list").scrollIntoView({behavior:"smooth"}); }
  if(nav==="福建本地"){ state.category="福建本地"; state.onlyFj=true; state.onlyFav=false; $("list").scrollIntoView({behavior:"smooth"}); }
  if(nav==="fav"){ state.onlyFav=true; $("list").scrollIntoView({behavior:"smooth"}); }
  state.shown=36; renderAll();
});

loadData();
