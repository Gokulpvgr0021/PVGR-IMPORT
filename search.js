/* Gokul Hub universal search and quick navigation - reliable panel routing */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
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
    {name:'Profile', terms:'profile edit name avatar photo user account', action:'profile', icon:'fa-user'}
  ];
  function normalize(value) {
    return String(value || '').toLocaleLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0B80-\u0BFF]+/g, ' ').trim();
  }
  function allItems() {
    const items = routes.slice();
    document.querySelectorAll('.view-panel').forEach(panel => {
      const panelId = panel.id.replace(/-view$/, '');
      panel.querySelectorAll('h1,h2,h3,h4,button,label,[role="button"]').forEach(el => {
        const name = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
        if (name.length < 2 || name.length > 75) return;
        if (items.some(item => normalize(item.name) === normalize(name))) return;
        const nearest = el.closest('[id]');
        const target = el.id || (nearest && nearest.id) || '';
        items.push({name, terms: normalize(name), panel: panelId, target: target === panel.id ? '' : target, icon: 'fa-arrow-right'});
      });
    });
    return items;
  }
  function navigate(item) {
    const box = byId('gh-global-search-results');
    const input = byId('gh-global-search-input');
    if (item.action === 'profile') {
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
    } else {
      const panel = item.panel || 'vault-dashboard';
      if (typeof window.navTo === 'function') window.navTo(panel);
      else {
        document.querySelectorAll('.view-panel').forEach(el => el.classList.toggle('active', el.id === panel + '-view'));
      }
      if (item.target) {
        window.setTimeout(() => {
          const target = byId(item.target);
          if (target && target.getClientRects().length) {
            target.scrollIntoView({behavior: 'smooth', block: 'center'});
            target.classList.add('gh-search-focus');
            window.setTimeout(() => target.classList.remove('gh-search-focus'), 1400);
          }
        }, 180);
      } else {
        const stage = document.querySelector('.main-stage');
        if (stage) stage.scrollTo({top: 0, behavior: 'smooth'});
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    }
    if (box) box.hidden = true;
    if (input) input.blur();
  }
  function render(query) {
    const box = byId('gh-global-search-results');
    const clear = byId('gh-search-clear');
    if (!box) return;
    const q = normalize(query);
    if (clear) clear.hidden = !q;
    if (!q) { box.hidden = true; box.replaceChildren(); return; }
    const words = q.split(/\s+/).filter(Boolean);
    const matches = allItems().map(item => {
      const hay = normalize(item.name + ' ' + (item.terms || ''));
      let score = hay === q ? 100 : hay.startsWith(q) ? 60 : hay.includes(q) ? 35 : 0;
      if (!score) words.forEach(word => { if (hay.includes(word)) score += 8; });
      return {item, score};
    }).filter(entry => entry.score > 0).sort((a,b) => b.score - a.score).slice(0, 12);
    box.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'gh-search-empty';
      empty.textContent = 'No matching feature found. Try another keyword.';
      box.append(empty); box.hidden = false; return;
    }
    matches.forEach(({item}) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'gh-search-result'; button.setAttribute('role', 'option');
      const icon = document.createElement('i'); icon.className = 'fas ' + (item.icon || 'fa-arrow-right'); icon.setAttribute('aria-hidden','true');
      const text = document.createElement('span');
      const title = document.createElement('strong'); title.textContent = item.name;
      const sub = document.createElement('small'); sub.textContent = item.action === 'profile' ? 'Open profile' : (item.panel === 'attendance' ? 'Open Work section' : item.panel === 'settings' ? 'Open Settings' : 'Open section');
      text.append(title, sub); button.append(icon, text);
      button.addEventListener('click', () => navigate(item));
      box.append(button);
    });
    box.hidden = false;
  }
  function init() {
    const input = byId('gh-global-search-input');
    const clear = byId('gh-search-clear');
    const box = byId('gh-global-search-results');
    if (!input || input.dataset.ghSearchReady === '1') return;
    input.dataset.ghSearchReady = '1';
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { input.value = ''; render(''); input.blur(); }
      if (event.key === 'Enter') { const first = box && box.querySelector('.gh-search-result'); if (first) first.click(); }
    });
    if (clear) clear.addEventListener('click', () => { input.value = ''; render(''); input.focus(); });
    document.addEventListener('click', event => {
      if (!event.target.closest('#gh-global-search') && box) box.hidden = true;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
