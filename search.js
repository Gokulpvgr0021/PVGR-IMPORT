/* Gokul Hub universal search and quick navigation */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const routes = [
    {name:'Savings Dashboard', terms:'home savings vault balance money wallet', panel:'vault-dashboard', icon:'fa-piggy-bank'},
    {name:'Work & Salary', terms:'work salary attendance punch in punch out present absent overtime ot working hours break', panel:'attendance', icon:'fa-business-time'},
    {name:'Government Holidays', terms:'government holiday public holiday national holiday absent holiday dates', panel:'attendance', target:'government-holidays-card', icon:'fa-calendar-check'},
    {name:'EMI Tracker', terms:'emi loan installment interest principal repayment', panel:'emi-dashboard', icon:'fa-calculator'},
    {name:'History / Time List', terms:'history time list records past attendance shifts', panel:'history', icon:'fa-clock-rotate-left'},
    {name:'Settings', terms:'settings customization preferences app settings', panel:'settings', icon:'fa-gear'},
    {name:'App Icon Changer', terms:'app icon logo change icon gallery crop square preview', panel:'settings', target:'gh-app-icon-customizer', icon:'fa-icons'},
    {name:'Wallpaper & Background', terms:'wallpaper background photo image dimmer', panel:'settings', target:'master-image-file', icon:'fa-image'},
    {name:'Themes & Appearance', terms:'theme color appearance font typography blur opacity', panel:'settings', target:'theme-gallery', icon:'fa-palette'},
    {name:'Backup & Restore', terms:'backup restore export import data recovery', panel:'settings', target:'import-file', icon:'fa-database'},
    {name:'PDF & Reports', terms:'pdf print report download timesheet', panel:'attendance', target:'attendance-table', icon:'fa-file-pdf'},
    {name:'Profile', terms:'profile edit name avatar photo user account', action:'profile', icon:'fa-user'},
    {name:'Staff / Admin Attendance', terms:'staff admin staff management attendance edit delete punching', panel:'attendance', target:'gh-admin-attendance', icon:'fa-users'}
  ];
  function normalize(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\u0B80-\u0BFF]+/g,' ').trim();}
  function collectItems(){
    const items = routes.slice();
    document.querySelectorAll('.view-panel').forEach(panel=>{
      const panelId = panel.id.replace(/-view$/,'');
      panel.querySelectorAll('h1,h2,h3,h4,button,label,[role="button"]').forEach(el=>{
        const name=(el.innerText||el.textContent||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ');
        if(name.length<2 || name.length>75) return;
        if(items.some(x=>normalize(x.name)===normalize(name))) return;
        const target=el.id || (el.closest('[id]') && el.closest('[id]').id) || panel.id;
        items.push({name,terms:normalize(name),panel:panelId,target:target===panel.id?'':target,icon:'fa-arrow-right'});
      });
    });
    return items;
  }
  function navigate(item){
    const results=$('gh-global-search-results'), input=$('gh-global-search-input');
    if(item.action==='profile' && typeof window.openProfileModal==='function') window.openProfileModal();
    else {
      if(typeof window.navTo==='function') window.navTo(item.panel||'vault-dashboard');
      if(item.target){
        setTimeout(()=>{
          const el=$(item.target);
          if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('gh-search-focus');setTimeout(()=>el.classList.remove('gh-search-focus'),1400);}
        },100);
      } else window.scrollTo({top:0,behavior:'smooth'});
    }
    if(results) results.hidden=true;
    if(input) input.blur();
  }
  function render(query){
    const box=$('gh-global-search-results'), clear=$('gh-search-clear');
    if(!box) return;
    const q=normalize(query);
    if(clear) clear.hidden=!q;
    if(!q){box.hidden=true;box.innerHTML='';return;}
    const matches=collectItems().map(item=>{
      const hay=normalize(item.name+' '+(item.terms||''));
      let score=hay===q?100:hay.startsWith(q)?50:hay.includes(q)?25:0;
      if(!score) q.split(' ').forEach(word=>{if(word && hay.includes(word))score+=5;});
      return {item,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
    box.innerHTML='';
    if(!matches.length){box.innerHTML='<div class="gh-search-empty">No matching feature found. Try another keyword.</div>';box.hidden=false;return;}
    matches.forEach(({item})=>{
      const btn=document.createElement('button');btn.type='button';btn.className='gh-search-result';btn.setAttribute('role','option');
      const icon=document.createElement('i');icon.className='fas '+(item.icon||'fa-arrow-right');
      const text=document.createElement('span');const title=document.createElement('strong');title.textContent=item.name;
      const sub=document.createElement('small');sub.textContent=item.action==='profile'?'Open profile':(item.panel==='attendance'?'Work':'Open section');
      text.append(title,sub);btn.append(icon,text);btn.addEventListener('click',()=>navigate(item));box.append(btn);
    });
    box.hidden=false;
  }
  function init(){
    const input=$('gh-global-search-input'), clear=$('gh-search-clear'), box=$('gh-global-search-results');
    if(!input) return;
    input.addEventListener('input',()=>render(input.value));
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){input.value='';render('');input.blur();}
      if(e.key==='Enter'){const first=box && box.querySelector('.gh-search-result');if(first)first.click();}
    });
    if(clear)clear.addEventListener('click',()=>{input.value='';render('');input.focus();});
    document.addEventListener('click',e=>{if(!e.target.closest('#gh-global-search') && box)box.hidden=true;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
