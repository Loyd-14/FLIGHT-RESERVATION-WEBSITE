/* ---------- DATA LAYER ----------
   All reads/writes go through this object. To connect to the Java Swing app's database,
   replace these functions with fetch() calls to a REST API (e.g. /api/flights, /api/bookings). */
const AIRPORTS={JNB:["Johannesburg",-26.14,28.25],CPT:["Cape Town",-33.96,18.6],DUR:["Durban",-29.61,31.12],PLZ:["Gqeberha",-33.98,25.62],BFN:["Bloemfontein",-29.09,26.3],ELS:["East London",-33.04,27.83],NBO:["Nairobi",-1.32,36.93],DXB:["Dubai",25.25,55.36],LHR:["London",51.47,-0.45],LOS:["Lagos",6.58,3.32]};
const AIRLINES=["SkyBook Air","Savanna Wings","Highveld Jet"];
const CLASS_MULT={Economy:1,Business:2.4};
const DB={
  load(){try{return JSON.parse(localStorage.getItem("sb_bookings")||"[]")}catch(e){return[]}},
  save(b){try{localStorage.setItem("sb_bookings",JSON.stringify(b))}catch(e){}},
  flights(from,to,date){
    const a=AIRPORTS[from],b=AIRPORTS[to];
    const km=Math.round(Math.hypot((a[1]-b[1])*111,(a[2]-b[2])*111*Math.cos((a[1]+b[1])*Math.PI/360)));
    const out=[];
    [6,9,13,17,20].forEach((h,i)=>{
      const mins=Math.round(km/(km>2000?800:650)*60)+40, dep=h*60+(i*7%25), arr=dep+mins;
      const id=from+to+date+i;
      const booked=this.load().filter(x=>x.status==="Confirmed"&&x.flight.id===id).reduce((s,x)=>s+x.pax.length,0);
      out.push({id,no:(["SB","SW","HJ"][i%3])+(100+(km+i*37)%900),airline:AIRLINES[i%3],from,to,date,dep,arr,km,
        base:Math.round((650+km*1.15+i*45)/10)*10,seats:Math.max(0,60+(km*3+i*11)%60-booked)});
    });
    return out;
  }
};
/* ---------- HELPERS ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hm=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const dur=f=>Math.floor((f.arr-f.dep)/60)+"h "+(f.arr-f.dep)%60+"m";
const rand=n=>Array.from({length:n},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random()*32)]).join("");
const money=n=>"R "+n.toLocaleString("en-ZA");
const today=()=>new Date().toISOString().slice(0,10);
const fmtDate=d=>new Date(d+"T00:00").toLocaleDateString("en-ZA",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const opts=(sel)=>Object.entries(AIRPORTS).map(([k,v])=>`<option value="${k}"${k===sel?" selected":""}>${v[0]} (${k})</option>`).join("");
let S={q:{from:"JNB",to:"CPT",date:today(),pax:1,cls:"Economy"},results:[],pick:null};
function go(v){document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===v));window.scrollTo(0,0);({home,results,book,manage,admin}[v]||home)()}

/* ---------- VIEWS ---------- */
function home(){
  $("#app").innerHTML=`<div class="hero"><div style="max-width:1040px;margin:auto"><h1>Book your next flight in a few clicks.</h1><p>Search routes across South Africa and beyond, reserve seats, and manage your booking with your reference number.</p></div></div>
  <main style="padding-top:0"><div class="pass"><form id="sf" novalidate>
    <div><label for="f">From</label><select id="f">${opts(S.q.from)}</select></div>
    <div><label for="t">To</label><select id="t">${opts(S.q.to)}</select></div>
    <div><label for="d">Departure date</label><input id="d" type="date" min="${today()}" value="${S.q.date}"></div>
    <div><label for="p">Passengers</label><select id="p">${[1,2,3,4,5,6].map(n=>`<option${n==S.q.pax?" selected":""}>${n}</option>`).join("")}</select></div>
    <div><label for="c">Cabin</label><select id="c">${Object.keys(CLASS_MULT).map(c=>`<option${c==S.q.cls?" selected":""}>${c}</option>`).join("")}</select></div>
    <div style="align-self:end"><button class="btn" style="width:100%">Search flights</button></div>
    <div class="err full" id="e" role="alert"></div>
  </form><div class="stub"><img src="images/plane.svg" alt="" width="56"><div>BOARDING<small>Your journey starts here</small></div></div></div>
  <h2>Popular routes</h2><div class="dests">${[["JNB","CPT"],["JNB","DUR"],["CPT","DUR"],["JNB","DXB"],["JNB","LHR"],["JNB","NBO"]].map(r=>`<button class="dest" onclick="quick('${r[0]}','${r[1]}')"><img src="images/${r[1]}.svg" alt="Illustration of ${AIRPORTS[r[1]][0]}"><b>${AIRPORTS[r[0]][0]} to ${AIRPORTS[r[1]][0]}</b><span style="display:block;padding:0 14px 12px">from ${money(DB.flights(r[0],r[1],today())[0].base)}</span></button>`).join("")}</div></main>`;
  $("#sf").onsubmit=e=>{e.preventDefault();
    const q={from:$("#f").value,to:$("#t").value,date:$("#d").value,pax:+$("#p").value,cls:$("#c").value};
    if(q.from===q.to)return $("#e").textContent="Choose different departure and destination airports.";
    if(!q.date||q.date<today())return $("#e").textContent="Choose a departure date that is today or later.";
    S.q=q;go("results");results()};
}
function quick(a,b){S.q.from=a;S.q.to=b;S.q.date=today();results()}
function results(){
  const q=S.q;S.results=DB.flights(q.from,q.to,q.date);
  $("#app").innerHTML=`<main><button class="btn ghost" onclick="go('home')">Change search</button>
  <div class="banner" style="background-image:url(images/${q.to}.svg)"><span>Flying to ${AIRPORTS[q.to][0]}</span></div><h2>${AIRPORTS[q.from][0]} to ${AIRPORTS[q.to][0]}</h2><p>${fmtDate(q.date)} · ${q.pax} passenger(s) · ${q.cls}</p>
  ${S.results.map((f,i)=>`<div class="card flight"><div><span class="tag">${f.airline}</span><span class="tag">${f.no}</span></div>
   <div style="display:flex;align-items:center;gap:14px;justify-content:center"><div><div class="time">${hm(f.dep)}</div>${f.from}</div><div class="route" style="flex:1">${dur(f)}<i></i>${f.km} km</div><div><div class="time">${hm(f.arr)}</div>${f.to}</div></div>
   <div class="price"><b>${money(Math.round(f.base*CLASS_MULT[q.cls]))}</b><div style="font-size:.8rem">per person · ${f.seats} seats left</div>
   ${f.seats>=q.pax?`<button class="btn" onclick="choose(${i})">Select</button>`:`<span class="bad">Not enough seats</span>`}</div></div>`).join("")}</main>`;
}
function choose(i){S.pick=S.results[i];book()}
function book(){
  const f=S.pick,q=S.q,unit=Math.round(f.base*CLASS_MULT[q.cls]),total=unit*q.pax;
  $("#app").innerHTML=`<main><button class="btn ghost" onclick="results()">Back to results</button><h2>Passenger details</h2>
  <div class="card"><b>${f.no}</b> · ${AIRPORTS[f.from][0]} ${hm(f.dep)} to ${AIRPORTS[f.to][0]} ${hm(f.arr)} · ${fmtDate(f.date)} · ${q.cls}</div>
  <form id="bf" class="card" novalidate>
   ${Array.from({length:q.pax},(_,i)=>`<div class="pax"><b class="full" style="grid-column:1/-1">Passenger ${i+1}</b>
    <div><label>First name</label><input class="fn" maxlength="40"></div><div><label>Surname</label><input class="ln" maxlength="40"></div>
    <div><label>ID or passport number</label><input class="id" maxlength="20"></div></div>`).join("")}
   <div class="pax"><b style="grid-column:1/-1">Contact</b><div><label>Email</label><input id="em" type="email"></div><div><label>Phone</label><input id="ph" type="tel" placeholder="0821234567"></div></div>
   <div class="err" id="be" role="alert" style="margin-top:10px"></div>
   <p><b>Total: ${money(total)}</b> (${q.pax} × ${money(unit)})</p><button class="btn">Confirm booking</button></form></main>`;
  $("#bf").onsubmit=e=>{e.preventDefault();
    const pax=[...document.querySelectorAll(".pax")].slice(0,q.pax).map(p=>({first:p.querySelector(".fn").value.trim(),last:p.querySelector(".ln").value.trim(),id:p.querySelector(".id").value.trim()}));
    const em=$("#em").value.trim(),ph=$("#ph").value.trim();
    for(const [i,p] of pax.entries()){
      if(!/^[A-Za-z' -]{2,}$/.test(p.first)||!/^[A-Za-z' -]{2,}$/.test(p.last))return $("#be").textContent=`Passenger ${i+1}: enter a first name and surname using letters only.`;
      if(!/^[A-Za-z0-9]{6,20}$/.test(p.id))return $("#be").textContent=`Passenger ${i+1}: enter a valid ID or passport number (6–20 letters or digits).`;
    }
    if(!/^\S+@\S+\.\S+$/.test(em))return $("#be").textContent="Enter a valid email address.";
    if(!/^\+?\d{9,13}$/.test(ph.replace(/\s/g,"")))return $("#be").textContent="Enter a valid phone number (9–13 digits).";
    const all=DB.load();let ref;do{ref=rand(6)}while(all.some(x=>x.ref===ref));
    const bk={ref,created:new Date().toISOString(),status:"Confirmed",cls:q.cls,total,flight:f,pax,email:em,phone:ph};
    all.push(bk);DB.save(all);ticket(bk,true)};
}
function ticket(b,isNew){
  const f=b.flight;
  $("#app").innerHTML=`<main><h2>${isNew?"Booking confirmed":"Your booking"}</h2><div class="ticket"><div class="top"><span>${f.airline} · ${f.no}</span><span class="${b.status==="Confirmed"?"":"bad"}">${b.status}</span></div>
  <div class="tkimg" style="background-image:url(images/${f.to}.svg)" role="img" aria-label="${AIRPORTS[f.to][0]}"></div><div class="body"><div>Booking reference</div><div class="pnr">${b.ref}</div>
  <p><b>${AIRPORTS[f.from][0]} (${f.from})</b> ${hm(f.dep)} to <b>${AIRPORTS[f.to][0]} (${f.to})</b> ${hm(f.arr)}<br>${fmtDate(f.date)} · ${b.cls}</p>
  <p><b>Passengers</b><br>${b.pax.map(p=>esc(p.first)+" "+esc(p.last)).join("<br>")}</p>
  <p>Confirmation sent to ${esc(b.email)} · <b>Total ${money(b.total)}</b></p></div></div>
  <p class="noprint" style="margin-top:14px"><button class="btn" onclick="print()">Print ticket</button> ${b.status==="Confirmed"?`<button class="btn danger" onclick="cancel('${b.ref}')">Cancel booking</button>`:""} <button class="btn ghost" onclick="go('home')">Book another</button></p></main>`;
}
function cancel(ref){
  if(!confirm("Cancel booking "+ref+"? This cannot be undone."))return;
  const all=DB.load(),b=all.find(x=>x.ref===ref);b.status="Cancelled";DB.save(all);ticket(b)}
function manage(){
  $("#app").innerHTML=`<main><h2>Manage your booking</h2><form id="mf" class="card" style="max-width:420px" novalidate>
  <label for="r">Booking reference</label><input id="r" maxlength="6" style="text-transform:uppercase"><br><br>
  <label for="s">Surname of any passenger</label><input id="s"><div class="err" id="me" role="alert"></div>
  <button class="btn">Find booking</button></form></main>`;
  $("#mf").onsubmit=e=>{e.preventDefault();
    const r=$("#r").value.trim().toUpperCase(),s=$("#s").value.trim().toLowerCase();
    const b=DB.load().find(x=>x.ref===r&&x.pax.some(p=>p.last.toLowerCase()===s));
    if(!b)return $("#me").textContent="No booking matches that reference and surname. Check both and try again.";
    ticket(b)};
}
function admin(){
  const all=DB.load();
  $("#app").innerHTML=`<main><h2>Bookings data</h2><p>These records are what the Java Swing application reads and updates. Export them to share data between the two parts of the system.</p>
  <p><button class="btn" onclick="exp('csv')">Export CSV</button> <button class="btn ghost" onclick="exp('json')">Export JSON</button> <label class="btn ghost" style="display:inline-block;margin:0">Import JSON<input type="file" accept=".json" hidden onchange="imp(this)"></label></p>
  <div class="card" style="overflow-x:auto">${all.length?`<table style="width:100%;border-collapse:collapse"><tr style="text-align:left"><th>Ref</th><th>Flight</th><th>Date</th><th>Passengers</th><th>Total</th><th>Status</th></tr>
  ${all.map(b=>`<tr style="border-top:1px solid var(--line)"><td>${b.ref}</td><td>${b.flight.from}-${b.flight.to} ${b.flight.no}</td><td>${b.flight.date}</td><td>${b.pax.length}</td><td>${money(b.total)}</td><td class="${b.status==="Confirmed"?"ok":"bad"}">${b.status}</td></tr>`).join("")}</table>`:"No bookings yet. Search for a flight and make your first booking."}</div></main>`;
}
function dl(name,txt,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;a.click()}
function exp(kind){const all=DB.load();
  if(kind==="json")return dl("bookings.json",JSON.stringify(all,null,2),"application/json");
  const rows=[["ref","status","flight_no","from","to","date","cabin","passengers","total","email","phone"]].concat(all.map(b=>[b.ref,b.status,b.flight.no,b.flight.from,b.flight.to,b.flight.date,b.cls,b.pax.map(p=>p.first+" "+p.last).join("; "),b.total,b.email,b.phone]));
  dl("bookings.csv",rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\n"),"text/csv")}
function imp(i){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d))throw 0;DB.save(d);admin()}catch(e){alert("That file is not a valid bookings JSON export.")}};r.readAsText(i.files[0])}
go("home");