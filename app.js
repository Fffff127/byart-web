/* Demo/static site logic (client-side only). Real payment verification, secure accounts, and server-side license enforcement require backend services. */
const STORE_KEY = 'byart_site_v1';
function loadState(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); }catch(e){ return {}; }
}
function saveState(s){ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
function getUser(){ const s=loadState(); return s.user||null; }
function setUser(u){ const s=loadState(); s.user=u; saveState(s); }
function ensureAccount(email){
  const s=loadState(); s.accounts=s.accounts||{};
  if(!s.accounts[email]){
    const now=Date.now();
    s.accounts[email]={email, credits:0, plan:null, planUntil:null, trialStart:now, trialUsed:true, permanent:false, createdAt:now, pendingOrders:[]};
  }
  saveState(s); return s.accounts[email];
}
function getAccount(){ const u=getUser(); if(!u) return null; const s=loadState(); return (s.accounts&&s.accounts[u])||ensureAccount(u); }
function updateAccount(patch){ const u=getUser(); if(!u) return null; const s=loadState(); const a=(s.accounts&&s.accounts[u])||ensureAccount(u); Object.assign(a,patch); s.accounts[u]=a; saveState(s); return a; }
function fmtDate(ts){ if(!ts) return '-'; const d=new Date(ts); return d.toLocaleString('th-TH'); }
function msLeft(ts){ return ts? (ts-Date.now()) : 0; }
function trialLeftMs(a){ const end=(a.trialStart||Date.now()) + 3*24*60*60*1000; return end-Date.now(); }
function hasAccess(a){
  if(!a) return false;
  if(a.permanent) return true;
  if(a.planUntil && Date.now() < a.planUntil) return true;
  if(trialLeftMs(a) > 0) return true;
  return false;
}
function accessReason(a){
  if(!a) return 'กรุณาเข้าสู่ระบบ';
  if(a.permanent) return 'แพ็กเกจถาวร (ใช้งานได้ไม่จำกัด)';
  if(a.planUntil && Date.now() < a.planUntil) return 'แพ็กเกจใช้งานอยู่ ถึง '+fmtDate(a.planUntil);
  const t=trialLeftMs(a);
  if(t>0){ const d=Math.ceil(t/86400000); return 'ช่วงทดลองใช้งาน เหลือประมาณ '+d+' วัน (สูงสุด 3 วัน)'; }
  return 'หมดช่วงทดลอง/แพ็กเกจแล้ว — ต้องเติมเครดิตหรือซื้อแพ็กเกจ';
}
function requireAuth(){ if(!getUser()){ location.href='login.html'; return false;} return true; }
function addPendingOrder(order){ const s=loadState(); const u=getUser(); if(!u) return; const a=s.accounts[u]||ensureAccount(u); a.pendingOrders=a.pendingOrders||[]; a.pendingOrders.unshift(order); s.accounts[u]=a; saveState(s); }
function confirmMockPayment(orderId){
  // DEMO ONLY: marks an order as paid locally. Real deployments must verify payment via provider webhook/API on a backend.
  const s=loadState(); const u=getUser(); if(!u) return false; const a=s.accounts[u]; if(!a) return false;
  const o=(a.pendingOrders||[]).find(x=>x.id===orderId); if(!o||o.status==='paid') return false;
  o.status='paid'; o.paidAt=Date.now();
  if(o.type==='plan'){
    const now=Date.now();
    if(o.permanent){ a.permanent=true; a.plan='ถาวร'; a.planUntil=null; }
    else {
      const base = (a.planUntil && a.planUntil>now) ? a.planUntil : now;
      a.planUntil = base + o.days*24*60*60*1000;
      a.plan = o.label;
    }
  } else if(o.type==='credit'){
    a.credits = (a.credits||0) + (o.amountTHB||0);
  }
  s.accounts[u]=a; saveState(s); return true;
}
function logout(){ const s=loadState(); s.user=null; saveState(s); location.href='login.html'; }
function guardDownload(ev){
  const a=getAccount();
  if(!hasAccess(a)){
    ev.preventDefault();
    alert('ยังไม่สามารถดาวน์โหลดได้: '+accessReason(a)+'\n\nกรุณาเข้าสู่ระบบและซื้อแพ็กเกจ/เติมเครดิตก่อน (การตรวจสอบการชำระเงินจริงอัตโนมัติต้องเชื่อมระบบหลังบ้าน)');
    location.href='pricing.html';
    return false;
  }
  return true;
}
