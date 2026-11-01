/* Gokul Hub role-based access + native staff attendance.
   Uses the existing Magnum Firebase paths so historic records remain intact. */
(function () {
  'use strict';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCd3HHP3hHLBnEkqOvK8jgBAGE99_mj_6k',
    authDomain: 'magnum-clothing-attendance.firebaseapp.com',
    projectId: 'magnum-clothing-attendance',
    storageBucket: 'magnum-clothing-attendance.firebasestorage.app',
    messagingSenderId: '762113661744',
    appId: '1:762113661744:web:f9edd4ca012fb0c98106f5'
  };
  const SESSION_KEY = 'gokulHubStaffSession_v2';
  const $ = id => document.getElementById(id);
  let db = null, role = '', staffName = '', attendanceRef = null, commandRef = null;
  let staffList = [];

  function localDate(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function localTime() { return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  function safeKey(name) { return encodeURIComponent(name).replace(/\./g, '%2E'); }
  function showMessage(message, bad = true) { const el = $('gh-login-message'); if (el) { el.textContent = message; el.style.color = bad ? '#ff9b9b' : '#9be7b0'; } }
  function setScreen(screen) {
    const gate = $('gh-auth-gate'), staff = $('gh-staff-app'), shell = document.querySelector('.app-shell');
    document.body.classList.remove('gh-staff-mode', 'gh-admin-mode');
    if (gate) gate.hidden = screen !== 'gate';
    if (staff) staff.hidden = screen !== 'staff';
    if (shell) shell.style.display = screen === 'admin' ? '' : 'none';
    if (screen === 'staff') document.body.classList.add('gh-staff-mode');
    if (screen === 'admin') document.body.classList.add('gh-admin-mode');
  }
  async function initDb() {
    if (!window.firebase || !firebase.database) throw new Error('Firebase SDK failed to load. Check internet connection.');
    let app = firebase.apps.find(a => a.name === 'gokulHubMagnum');
    if (!app) app = firebase.initializeApp(FIREBASE_CONFIG, 'gokulHubMagnum');
    db = app.database();
    const snap = await db.ref('magnum_settings/staffList').once('value');
    const value = snap.val();
    staffList = Array.isArray(value) ? value : [];
  }
  function choose(nextRole) {
    role = nextRole;
    $('gh-role-choice').hidden = true;
    $('gh-login-form').hidden = false;
    $('gh-login-title').textContent = nextRole === 'staff' ? 'Staff Login' : 'Admin Login';
    $('gh-login-id').hidden = nextRole !== 'staff';
    $('gh-login-id').value = '';
    $('gh-login-password').value = '';
    $('gh-login-password').placeholder = 'Password';
    $('gh-login-submit').textContent = 'LOGIN';
    showMessage('', false);
  }
  function back() { $('gh-login-form').hidden = true; $('gh-role-choice').hidden = false; showMessage('', false); }
  async function submit() {
    const button = $('gh-login-submit'); button.disabled = true;
    try {
      await initDb();
      const password = $('gh-login-password').value;
      if (!password) { showMessage('Enter password.'); return; }
      if (role === 'admin') {
        const snap = await db.ref('magnum_settings/adminPassword').once('value');
        const current = snap.val();
        if (!current) {
          if (password.length < 6) { showMessage('Create an admin password with at least 6 characters.'); return; }
          await db.ref('magnum_settings/adminPassword').set(password);
        } else if (String(current) !== password) { showMessage('Incorrect admin password.'); return; }
        enterAdmin(); return;
      }
      const staffId = $('gh-login-id').value.trim();
      if (!staffId) { showMessage('Enter Staff ID and password.'); return; }
      const snap = await db.ref('magnum_settings/staffCredentials').once('value');
      const credentials = snap.val() || {};
      let matched = '';
      for (const [key, item] of Object.entries(credentials)) {
        if (item && String(item.staffId || '').toLowerCase() === staffId.toLowerCase() && String(item.password || '') === password) {
          try { matched = decodeURIComponent(key); } catch (_) { matched = key; }
          break;
        }
      }
      if (!matched || !staffList.includes(matched)) { showMessage('Invalid Staff ID or password. Ask Admin to create your account.'); return; }
      enterStaff(matched, true);
    } catch (error) { showMessage(error.message || 'Login failed. Check connection and Firebase access.'); }
    finally { button.disabled = false; }
  }
  function enterAdmin() {
    role = 'admin'; setScreen('admin');
    addAdminLogout();
    if (typeof window.navTo === 'function') window.navTo('vault-dashboard');
    renderAdminAttendance();
  }
  function addAdminLogout() {
    if ($('gh-admin-logout')) return;
    const b = document.createElement('button'); b.id = 'gh-admin-logout'; b.className = 'gh-admin-logout'; b.textContent = 'ADMIN · LOGOUT';
    b.onclick = logout; document.body.appendChild(b);
  }
  function enterStaff(name, remember) {
    staffName = name; role = 'staff';
    if (remember) localStorage.setItem(SESSION_KEY, name);
    $('gh-staff-name').textContent = name;
    $('gh-staff-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    setScreen('staff');
    listenAttendance(); listenCommands(); refreshSummary();
  }
  function listenAttendance() {
    if (attendanceRef) attendanceRef.off();
    const path = `magnum_attendance/${localDate()}/${staffName}`;
    attendanceRef = db.ref(path);
    attendanceRef.on('value', snap => {
      const data = snap.val() || {}, inBtn = $('gh-punch-in'), outBtn = $('gh-punch-out');
      inBtn.disabled = !!data.in; inBtn.textContent = data.in ? `✓ PUNCHED IN · ${data.in}` : '⚡ PUNCH IN';
      outBtn.disabled = !data.in || !!data.out; outBtn.textContent = data.out ? `✓ PUNCHED OUT · ${data.out}` : '⚡ PUNCH OUT';
    }, err => alert('Attendance read failed: ' + err.message));
  }
  function listenCommands() {
    if (commandRef) commandRef.off();
    commandRef = db.ref('magnum_settings/staffSessionCommands/' + safeKey(staffName));
    commandRef.on('value', snap => {
      const cmd = snap.val();
      if (cmd && cmd.action === 'logout' && Number(cmd.at || 0) > Number(sessionStorage.getItem('ghLastCommand') || 0)) {
        sessionStorage.setItem('ghLastCommand', String(cmd.at)); logout(true);
      }
    });
  }
  async function punch(type) {
    if (!staffName || !db) return;
    const today = localDate(), path = `magnum_attendance/${today}/${staffName}`;
    const button = type === 'in' ? $('gh-punch-in') : $('gh-punch-out');
    button.disabled = true;
    try {
      const snap = await db.ref(path).once('value'), data = snap.val() || {};
      if (type === 'in' && data.in) throw new Error('You have already punched in today.');
      if (type === 'out' && (!data.in || data.out)) throw new Error('Punch in first. Punch out can be recorded only once.');
      await db.ref(path).update({ [type]: localTime() });
      await refreshSummary();
      if (navigator.vibrate) navigator.vibrate(45);
    } catch (e) { alert(e.message || 'Punch failed. Check your internet connection.'); button.disabled = false; }
  }
  async function refreshSummary() {
    if (!db || !staffName) return;
    try {
      const snap = await db.ref('magnum_attendance').once('value'), all = snap.val() || {};
      const now = new Date(), y = now.getFullYear(), m = now.getMonth();
      let present = 0, hours = 0, ot = 0, history = [];
      for (const [date, people] of Object.entries(all)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !people || !people[staffName]) continue;
        const d = new Date(date + 'T00:00:00'), row = people[staffName];
        const hasIn = !!row.in, hasOut = !!row.out;
        let h = 0;
        if (hasIn && hasOut) {
          const [ih, im] = row.in.split(':').map(Number), [oh, om] = row.out.split(':').map(Number);
          let mins = oh * 60 + om - (ih * 60 + im); if (mins < 0) mins += 1440;
          h = Math.max(0, mins / 60 - (mins > 240 ? 0.5 : 0));
        }
        if (d.getFullYear() === y && d.getMonth() === m && d <= new Date(y, m, now.getDate()) && hasIn) { present++; hours += h; ot += Math.max(0, h - 8); }
        history.push({ date, in: row.in || '—', out: row.out || '—', hours: h, present: hasIn });
      }
      let expected = 0;
      for (let day = 1; day <= now.getDate(); day++) if (new Date(y, m, day).getDay() !== 0) expected++;
      $('gh-present').textContent = present;
      $('gh-absent').textContent = Math.max(0, expected - present);
      $('gh-hours').textContent = hours.toFixed(1) + 'h'; $('gh-ot').textContent = ot.toFixed(1) + 'h';
      $('gh-staff-history').innerHTML = history.sort((a,b)=>b.date.localeCompare(a.date)).map(r => `<tr><td>${r.date}</td><td>${r.in}</td><td>${r.out}</td><td>${r.hours.toFixed(1)}h</td><td>${r.present ? 'Present' : 'Absent'}</td></tr>`).join('') || '<tr><td colspan="5">No attendance records yet.</td></tr>';
    } catch (e) { console.warn('Staff summary unavailable', e); }
  }
  async function openStaffManager() {
    if (role !== 'admin') return;
    const modal = $('gh-staff-manager'); if (!modal) return;
    modal.hidden = false; await renderStaffManager();
  }
  async function renderStaffManager() {
    const list = $('gh-admin-staff-list'); if (!list) return;
    try {
      const [namesSnap, credsSnap] = await Promise.all([db.ref('magnum_settings/staffList').once('value'), db.ref('magnum_settings/staffCredentials').once('value')]);
      staffList = Array.isArray(namesSnap.val()) ? namesSnap.val() : [];
      const creds = credsSnap.val() || {};
      list.innerHTML = staffList.map((name, i) => {
        const key = safeKey(name), c = creds[key] || {};
        return `<div class="gh-staff-row"><div><b>${escapeText(name)}</b><small>ID: ${escapeText(c.staffId || 'Not set')}</small></div><div class="gh-row-actions"><button data-edit="${i}">Edit ID/Password</button><button data-force="${i}">Force Logout</button><button data-delete="${i}">Delete</button></div></div>`;
      }).join('') || '<p>No staff accounts created.</p>';
      list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editStaffCredentials(Number(b.dataset.edit)));
      list.querySelectorAll('[data-force]').forEach(b => b.onclick = () => forceLogout(Number(b.dataset.force)));
      list.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => deleteStaff(Number(b.dataset.delete)));
    } catch (e) { list.textContent = 'Could not load staff list: ' + e.message; }
  }
  function escapeText(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function createStaff() {
    const name = $('gh-new-name').value.trim(), staffId = $('gh-new-id').value.trim(), password = $('gh-new-password').value;
    if (!name || !staffId || password.length < 4) return alert('Enter staff name, ID and password (minimum 4 characters).');
    try {
      const key = safeKey(name), existing = await db.ref('magnum_settings/staffCredentials').once('value');
      const duplicate = Object.values(existing.val() || {}).some(c => c && String(c.staffId || '').toLowerCase() === staffId.toLowerCase());
      if (duplicate) return alert('This Staff ID is already used.');
      if (!staffList.includes(name)) staffList.push(name);
      await db.ref('magnum_settings/staffCredentials/' + key).set({ staffId, password });
      await db.ref('magnum_settings/staffList').set(staffList);
      $('gh-new-name').value = $('gh-new-id').value = $('gh-new-password').value = '';
      await renderStaffManager(); alert('Staff account created.');
    } catch (e) { alert('Create failed: ' + e.message); }
  }
  async function editStaffCredentials(i) {
    const name = staffList[i]; if (!name) return;
    const key = safeKey(name), snap = await db.ref('magnum_settings/staffCredentials/' + key).once('value'), old = snap.val() || {};
    const id = prompt('Staff ID:', old.staffId || ''); if (id === null || !id.trim()) return;
    const pass = prompt('New password (leave blank to keep current):', ''); if (pass === null) return;
    await db.ref('magnum_settings/staffCredentials/' + key).update({ staffId: id.trim(), ...(pass ? { password: pass } : {}) });
    renderStaffManager();
  }
  async function forceLogout(i) {
    const name = staffList[i]; if (!name || !confirm('Force logout ' + name + '?')) return;
    await db.ref('magnum_settings/staffSessionCommands/' + safeKey(name)).set({ action: 'logout', at: Date.now() });
    alert('Force logout command sent.');
  }
  async function deleteStaff(i) {
    const name = staffList[i]; if (!name || !confirm('Delete staff login for ' + name + '? Attendance history will be kept.')) return;
    staffList.splice(i, 1);
    await db.ref('magnum_settings/staffList').set(staffList);
    await db.ref('magnum_settings/staffCredentials/' + safeKey(name)).remove();
    await renderStaffManager();
  }
  function hoursFor(row) {
    if (!row || !row.in || !row.out) return 0;
    const [ih, im] = String(row.in).split(':').map(Number), [oh, om] = String(row.out).split(':').map(Number);
    let mins = oh * 60 + om - (ih * 60 + im); if (mins < 0) mins += 1440;
    return Math.max(0, mins / 60 - (mins > 240 ? 0.5 : 0));
  }
  function printAttendance(title, name, records) {
    const rows = Object.entries(records || {}).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,r]) => {
      const h = hoursFor(r);
      return `<tr><td>${escapeText(date)}</td><td>${escapeText(r.in || '—')}</td><td>${escapeText(r.out || '—')}</td><td>${h.toFixed(1)}h</td><td>${r.in ? 'Present' : 'Absent'}</td><td><button type="button" data-pdf="${escapeText(name)}">Download PDF</button></td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to download/print the PDF.'); return; }
    w.document.write(`<!doctype html><html><head><title>${escapeText(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px Arial;padding:24px;color:#111}h1{margin-bottom:4px}p{color:#555}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #999;padding:9px;text-align:left}th{background:#eee}@media print{button{display:none}}</style></head><body><h1>${escapeText(title)}</h1><p>Staff: ${escapeText(name)} · Generated: ${new Date().toLocaleString()}</p><button onclick="window.print()">Print / Save as PDF</button><table><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No attendance records</td></tr>'}</tbody></table></body></html>`);
    w.document.close();
  }
  async function downloadMyPDF() {
    if (!db || !staffName) return;
    const snap = await db.ref('magnum_attendance').once('value'), all = snap.val() || {}, mine = {};
    Object.entries(all).forEach(([date, people]) => { if (people && people[staffName]) mine[date] = people[staffName]; });
    printAttendance('Gokul Hub · Full Attendance Report', staffName, mine);
  }
  async function downloadStaffPDF(name) {
    if (role !== 'admin' || !name) return;
    const snap = await db.ref('magnum_attendance').once('value'), all = snap.val() || {}, records = {};
    Object.entries(all).forEach(([date, people]) => { if (people && people[name]) records[date] = people[name]; });
    printAttendance('Gokul Hub · Full Attendance Report', name, records);
  }
  async function renderAdminAttendance() {
    if (!db) return;
    const panel = $('gh-admin-attendance'); if (!panel) return;
    const dateInput = $('gh-admin-date'); if (!dateInput.value) dateInput.value = localDate();
    const date = dateInput.value;
    try {
      const [names, rows] = await Promise.all([db.ref('magnum_settings/staffList').once('value'), db.ref('magnum_attendance/' + date).once('value')]);
      const namesList = Array.isArray(names.val()) ? names.val() : [], records = rows.val() || {};
      $('gh-admin-attendance-rows').innerHTML = namesList.map(name => {
        const r = records[name] || {};
        return `<tr><td>${escapeText(name)}</td><td><input type="time" value="${escapeText(r.in || '')}" data-name="${escapeText(name)}" data-type="in"></td><td><input type="time" value="${escapeText(r.out || '')}" data-name="${escapeText(name)}" data-type="out"></td><td>${r.in ? 'Present' : 'Absent'}</td><td><button type="button" data-pdf="${escapeText(name)}">Download PDF</button></td></tr>`;
      }).join('');
      $('gh-admin-attendance-rows').querySelectorAll('input').forEach(input => input.addEventListener('change', async () => {
        const name = input.dataset.name, type = input.dataset.type;
        await db.ref(`magnum_attendance/${date}/${name}`).update({ [type]: input.value || null });
        await renderAdminAttendance();
      }));
      $('gh-admin-attendance-rows').querySelectorAll('[data-pdf]').forEach(b => b.onclick = () => downloadStaffPDF(b.dataset.pdf));
    } catch (e) { $('gh-admin-attendance-rows').innerHTML = `<tr><td colspan="4">${escapeText(e.message)}</td></tr>`; }
  }
  function logout(force = false) {
    if (attendanceRef) attendanceRef.off(); if (commandRef) commandRef.off();
    attendanceRef = commandRef = null; staffName = ''; role = '';
    if (!force) localStorage.removeItem(SESSION_KEY);
    const b = $('gh-admin-logout'); if (b) b.remove();
    setScreen('gate'); $('gh-role-choice').hidden = false; $('gh-login-form').hidden = true;
  }
  async function boot() {
    try {
      await initDb();
      const remembered = localStorage.getItem(SESSION_KEY);
      if (remembered && staffList.includes(remembered)) enterStaff(remembered, false);
      else { localStorage.removeItem(SESSION_KEY); setScreen('gate'); }
    } catch (e) { setScreen('gate'); showMessage('Firebase connection unavailable. ' + e.message); }
  }
  window.GHAuth = { choose, back, submit, logout, punch, openStaffManager, createStaff, renderAdminAttendance, closeStaffManager: () => { $('gh-staff-manager').hidden = true; }, downloadMyPDF, downloadStaffPDF };
  document.addEventListener('DOMContentLoaded', () => {
    // Admin tools are embedded in Settings, not a separate Magnum portal.
    const settings = $('settings-view');
    if (settings) {
      // The attendance panel already exists in index.html. Do not inject a second copy.
      // Keep a fallback only for older HTML versions that do not contain the panel.
      if (!$('gh-admin-attendance') ) {
        const box = document.createElement('div');
        box.className = 'gh-admin-tools';
        box.innerHTML = `<h3>Staff & Attendance Management</h3><p>Manage staff accounts and review daily punches.</p><button class="btn btn-primary" id="gh-open-staff-manager">Manage Staff Accounts</button><div id="gh-admin-attendance"><div class="gh-admin-date"><input type="date" id="gh-admin-date"><button class="btn btn-primary" onclick="GHAuth.renderAdminAttendance()">Load Attendance</button><button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button></div><div class="gh-history-wrap"><table><thead><tr><th>Staff</th><th>In</th><th>Out</th><th>Status</th><th>Full PDF</th></tr></thead><tbody id="gh-admin-attendance-rows"></tbody></table></div></div>`;
        settings.appendChild(box);
      }
      if (!$('gh-staff-manager')) {
        const modal = document.createElement('div'); modal.id = 'gh-staff-manager'; modal.className = 'gh-modal'; modal.hidden = true;
        modal.innerHTML = `<div class="gh-modal-card"><h2>Manage Staff Accounts</h2><div class="gh-create-grid"><input id="gh-new-name" placeholder="Staff name"><input id="gh-new-id" placeholder="Staff ID"><input id="gh-new-password" type="password" placeholder="Password"><button id="gh-create-staff">Create Staff</button></div><div id="gh-admin-staff-list"></div><button id="gh-close-staff-manager" class="gh-close">Close</button></div>`;
        document.body.appendChild(modal);
      }
      const openBtn = $('gh-open-staff-manager');
      if (openBtn) openBtn.onclick = openStaffManager;
      const createBtn = $('gh-create-staff');
      if (createBtn) createBtn.onclick = createStaff;
      const closeBtn = $('gh-close-staff-manager');
      if (closeBtn) closeBtn.onclick = () => $('gh-staff-manager').hidden = true;
      const dateInput = $('gh-admin-date');
      if (dateInput) dateInput.onchange = renderAdminAttendance;
    }
    boot();
  });
})();
