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
  const ADMIN_SESSION_KEY = 'gokulHubAdminSession_v2';
  const $ = id => document.getElementById(id);
  let db = null, role = '', staffName = '', attendanceRef = null, commandRef = null;
  let staffList = [];
  const OFFLINE_KEYS = { staff: 'ghOfflineStaffList_v1', creds: 'ghOfflineStaffCredentials_v1', admin: 'ghOfflineAdminPassword_v1', attendance: 'ghOfflineAttendance_v1', queue: 'ghOfflinePunchQueue_v1' };
  const readLocal = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } };
  const writeLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  function cachedAttendance() { return readLocal(OFFLINE_KEYS.attendance) || {}; }
  function paintPunch(data = {}) { const a=$('gh-punch-in'), b=$('gh-punch-out'); if(!a||!b)return; a.disabled=!!data.in; a.textContent=data.in?`✓ PUNCHED IN · ${data.in}`:'⚡ PUNCH IN'; b.disabled=!data.in||!!data.out; b.textContent=data.out?`✓ PUNCHED OUT · ${data.out}`:'⚡ PUNCH OUT'; }
  function setOfflineStatus() { let el=$('gh-network-status'); if(!el){el=document.createElement('div');el.id='gh-network-status';el.style.cssText='position:fixed;top:0;left:0;right:0;z-index:999999;text-align:center;padding:5px 8px;font:600 12px sans-serif;background:#9a3412;color:white;display:none';document.body.appendChild(el);} const offline=!navigator.onLine; el.textContent=offline?'OFFLINE MODE · Changes will sync when internet returns':'ONLINE · Connected'; el.style.display=offline?'block':'none'; }
  async function flushOfflinePunches() { if(!db||!navigator.onLine)return; const q=readLocal(OFFLINE_KEYS.queue)||[]; if(!q.length)return; const remaining=[]; for(const item of q){try{await db.ref(`magnum_attendance/${item.date}/${item.name}`).update({[item.type]:item.time});}catch(_){remaining.push(item);}} writeLocal(OFFLINE_KEYS.queue,remaining); }
  async function reconnectDb(){try{await initDb();await flushOfflinePunches();if(role==='staff'){listenAttendance();refreshSummary();}if(role==='admin')renderAdminAttendance();}catch(_){}}
  window.addEventListener('online',()=>{setOfflineStatus(); reconnectDb();}); window.addEventListener('offline',setOfflineStatus);

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
    writeLocal(OFFLINE_KEYS.staff, staffList);
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
      // Prefer the saved offline credentials immediately when the device reports offline.
      // If Android reports "online" but the connection has no internet, do not let Firebase
      // hold the login screen indefinitely: fall back to the locally cached credentials.
      if (navigator.onLine) {
        try {
          await Promise.race([
            initDb(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase connection timed out')), 4500))
          ]);
        } catch (connectionError) {
          db = null;
          staffList = readLocal(OFFLINE_KEYS.staff) || [];
        }
      } else {
        db = null;
        staffList = readLocal(OFFLINE_KEYS.staff) || [];
      }
      const password = $('gh-login-password').value;
      if (!password) { showMessage('Enter password.'); return; }
      if (role === 'admin') {
        let current;
        if (db) { const snap = await db.ref('magnum_settings/adminPassword').once('value'); current = snap.val(); if(current) localStorage.setItem(OFFLINE_KEYS.admin, String(current)); }
        else current = localStorage.getItem(OFFLINE_KEYS.admin);
        if (!db && !current) { showMessage('First login needs internet. Login once online to enable offline access.'); return; }
        if (!current) {
          if (password.length < 6) { showMessage('Create an admin password with at least 6 characters.'); return; }
          if (!db) { showMessage('Admin setup needs internet.'); return; }
          await db.ref('magnum_settings/adminPassword').set(password); localStorage.setItem(OFFLINE_KEYS.admin, password);
        } else if (String(current) !== password) { showMessage('Incorrect admin password.'); return; }
        enterAdmin(); return;
      }
      const staffId = $('gh-login-id').value.trim();
      if (!staffId) { showMessage('Enter Staff ID and password.'); return; }
      let credentials;
      if (db) { const snap = await db.ref('magnum_settings/staffCredentials').once('value'); credentials = snap.val() || {}; writeLocal(OFFLINE_KEYS.creds, credentials); }
      else { credentials = readLocal(OFFLINE_KEYS.creds) || {}; if(!Object.keys(credentials).length){showMessage('First staff login needs internet. Login once online to enable offline access.');return;} }
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
  function enterAdmin(remember = true) {
    role = 'admin';
    if (remember) localStorage.setItem(ADMIN_SESSION_KEY, '1');
    setScreen('admin'); setOfflineStatus();
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
    setScreen('staff'); setOfflineStatus();
    if (db) { listenAttendance(); listenCommands(); } else { const all=cachedAttendance(), data=(all[localDate()]||{})[staffName]||{}; paintPunch(data); }
    refreshSummary();
  }
  function listenAttendance() {
    if (attendanceRef) attendanceRef.off();
    const path = `magnum_attendance/${localDate()}/${staffName}`;
    attendanceRef = db.ref(path);
    attendanceRef.on('value', snap => {
      const data = snap.val() || {}; const all=cachedAttendance(); all[localDate()] ||= {}; all[localDate()][staffName]=data; writeLocal(OFFLINE_KEYS.attendance,all); paintPunch(data);
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
    if (!staffName) return;
    const today = localDate(), path = `magnum_attendance/${today}/${staffName}`;
    const button = type === 'in' ? $('gh-punch-in') : $('gh-punch-out');
    button.disabled = true;
    try {
      let all=cachedAttendance(), data=(all[today]||{})[staffName]||{};
      if(db && navigator.onLine){ const snap=await db.ref(path).once('value'); data=snap.val()||data; }
      if (type === 'in' && data.in) throw new Error('You have already punched in today.');
      if (type === 'out' && (!data.in || data.out)) throw new Error('Punch in first. Punch out can be recorded only once.');
      const time=localTime(); data={...data,[type]:time}; all[today] ||= {}; all[today][staffName]=data; writeLocal(OFFLINE_KEYS.attendance,all); paintPunch(data);
      if(db && navigator.onLine) { try { await db.ref(path).update({ [type]: time }); } catch (_) { const q=readLocal(OFFLINE_KEYS.queue)||[]; q.push({date:today,name:staffName,type,time}); writeLocal(OFFLINE_KEYS.queue,q); } }
      else { const q=readLocal(OFFLINE_KEYS.queue)||[]; q.push({date:today,name:staffName,type,time}); writeLocal(OFFLINE_KEYS.queue,q); }
      await refreshSummary();
      if (navigator.vibrate) navigator.vibrate(45);
    } catch (e) { alert(e.message || 'Punch failed. Check your internet connection.'); button.disabled = false; }
  }
  async function refreshSummary() {
    if (!staffName) return;
    try {
      let all=cachedAttendance();
      if(db && navigator.onLine){ const snap=await db.ref('magnum_attendance').once('value'); all=snap.val()||{}; writeLocal(OFFLINE_KEYS.attendance,all); }
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
  async function adminPunch(type, time) {
    if (role !== 'admin') throw new Error('Admin login required.');
    if (type !== 'in' && type !== 'out') throw new Error('Invalid punch type.');
    const date = localDate();
    const path = `magnum_attendance/${date}/Admin`;
    let all=cachedAttendance(), current=(all[date]||{}).Admin||{};
    if(db && navigator.onLine){ const snap=await db.ref(path).once('value'); current=snap.val()||current; }
    if (type === 'in' && current.in) throw new Error('Admin already punched in today.');
    if (type === 'out' && (!current.in || current.out)) throw new Error('Admin must punch in first, and can punch out only once.');
    const value=time||localTime(); all[date] ||= {}; all[date].Admin={...current,[type]:value}; writeLocal(OFFLINE_KEYS.attendance,all);
    if(db && navigator.onLine){try{await db.ref(path).update({[type]:value});}catch(_){const q=readLocal(OFFLINE_KEYS.queue)||[];q.push({date,name:'Admin',type,time:value});writeLocal(OFFLINE_KEYS.queue,q);}}
    else {const q=readLocal(OFFLINE_KEYS.queue)||[];q.push({date,name:'Admin',type,time:value});writeLocal(OFFLINE_KEYS.queue,q);}
    await renderAdminAttendance();
  }

  async function renderAdminAttendance() {
    const panel = $('gh-admin-attendance'); if (!panel) return;
    const dateInput = $('gh-admin-date'); if (!dateInput.value) dateInput.value = localDate();
    const date = dateInput.value;
    try {
      let namesList=staffList, records=(cachedAttendance()[date]||{});
      if(db && navigator.onLine){const [names,rows]=await Promise.all([db.ref('magnum_settings/staffList').once('value'),db.ref('magnum_attendance/'+date).once('value')]);namesList=Array.isArray(names.val())?names.val():[];records=rows.val()||{};staffList=namesList;writeLocal(OFFLINE_KEYS.staff,staffList);const all=cachedAttendance();all[date]=records;writeLocal(OFFLINE_KEYS.attendance,all);}
      // Admin is stored in the same Firebase attendance collection as staff.
      const visibleNames = ['Admin', ...namesList.filter(name => name !== 'Admin')];
      $('gh-admin-attendance-rows').innerHTML = visibleNames.map(name => {
        const r = records[name] || {};
        const safeName = escapeText(name);
        return `<tr>
          <td>${safeName}</td>
          <td><input type="time" value="${escapeText(r.in || '')}" data-name="${safeName}" data-type="in" aria-label="${safeName} Punch In"></td>
          <td><input type="time" value="${escapeText(r.out || '')}" data-name="${safeName}" data-type="out" aria-label="${safeName} Punch Out"></td>
          <td data-status-for="${safeName}">${r.in ? (r.out ? 'Present · Completed' : 'Present · On Duty') : 'Absent'}</td>
          <td><button type="button" class="btn btn-primary gh-save-admin-punch" data-name="${safeName}" style="padding:8px 12px;">Save</button></td>
        </tr>`;
      }).join('');
      $('gh-admin-attendance-rows').querySelectorAll('.gh-save-admin-punch').forEach(button => button.addEventListener('click', async () => {
        if (role !== 'admin') { alert('Admin login required.'); return; }
        const name = button.dataset.name;
        const row = button.closest('tr');
        const inValue = row.querySelector('input[data-type="in"]').value;
        const outValue = row.querySelector('input[data-type="out"]').value;
        if (outValue && !inValue) { alert('Punch In time enter pannitu Punch Out save pannunga.'); return; }
        button.disabled = true;
        try {
          const all=cachedAttendance();all[date] ||= {};all[date][name]={...(all[date][name]||{}),in:inValue||null,out:outValue||null};writeLocal(OFFLINE_KEYS.attendance,all);
          if(db && navigator.onLine){try{await db.ref(`magnum_attendance/${date}/${name}`).update({in:inValue||null,out:outValue||null});}catch(error){const q=readLocal(OFFLINE_KEYS.queue)||[];if(inValue)q.push({date,name,type:'in',time:inValue});if(outValue)q.push({date,name,type:'out',time:outValue});writeLocal(OFFLINE_KEYS.queue,q);}}
          else {const q=readLocal(OFFLINE_KEYS.queue)||[];if(inValue)q.push({date,name,type:'in',time:inValue});if(outValue)q.push({date,name,type:'out',time:outValue});writeLocal(OFFLINE_KEYS.queue,q);}
          const status = row.querySelector('[data-status-for]');
          if (status) status.textContent = inValue ? (outValue ? 'Present · Completed' : 'Present · On Duty') : 'Absent';
          button.textContent = 'Saved ✓';
          setTimeout(() => { button.textContent = 'Save'; button.disabled = false; }, 900);
        } catch (error) {
          alert('Attendance save failed: ' + (error.message || error));
          button.disabled = false;
        }
      }));
    } catch (e) { $('gh-admin-attendance-rows').innerHTML = `<tr><td colspan="4">${escapeText(e.message)}</td></tr>`; }
  }
  function logout(force = false) {
    if (attendanceRef) attendanceRef.off(); if (commandRef) commandRef.off();
    attendanceRef = commandRef = null; staffName = ''; role = '';
    localStorage.removeItem(SESSION_KEY); localStorage.removeItem(ADMIN_SESSION_KEY);
    const b = $('gh-admin-logout'); if (b) b.remove();
    setScreen('gate'); $('gh-role-choice').hidden = false; $('gh-login-form').hidden = true;
  }
  async function boot() {
    setOfflineStatus();
    try {
      if (!navigator.onLine) throw new Error('Device is offline');
      await Promise.race([
        initDb(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase connection timed out')), 4500))
      ]);
      const rememberedAdmin = localStorage.getItem(ADMIN_SESSION_KEY);
      const remembered = localStorage.getItem(SESSION_KEY);
      if (rememberedAdmin === '1') enterAdmin(false);
      else if (remembered && staffList.includes(remembered)) enterStaff(remembered, false);
      else { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(ADMIN_SESSION_KEY); setScreen('gate'); }
    } catch (e) {
      db=null; staffList=readLocal(OFFLINE_KEYS.staff)||[];
      const rememberedAdmin=localStorage.getItem(ADMIN_SESSION_KEY), remembered=localStorage.getItem(SESSION_KEY);
      if(rememberedAdmin==='1' && localStorage.getItem(OFFLINE_KEYS.admin)){enterAdmin(false);}
      else if(remembered && staffList.includes(remembered)){enterStaff(remembered,false);}
      else {setScreen('gate'); showMessage('Offline mode: first login requires internet.');}
    }
  }
  window.GHAuth = { choose, back, submit, logout, punch, adminPunch, openStaffManager, createStaff, renderAdminAttendance, closeStaffManager: () => { $('gh-staff-manager').hidden = true; } };
  document.addEventListener('DOMContentLoaded', () => {
    // Admin tools are embedded in Settings, not a separate Magnum portal.
    const settings = $('attendance-view');
    if (settings && !$('gh-staff-manager')) {
      const box = document.createElement('div'); box.className = 'gh-admin-tools'; box.innerHTML = `<h3>Work Attendance · Admin Controls</h3><p>Edit staff Punch In / Punch Out times for the selected date.</p><button class="btn btn-primary" id="gh-open-staff-manager">Manage Staff Accounts</button><div id="gh-admin-attendance"><div class="gh-admin-date"><input type="date" id="gh-admin-date"><button class="btn btn-primary" id="gh-load-admin-attendance">Load Attendance</button><button class="btn btn-primary" id="gh-print-admin-attendance">Print / Save PDF</button></div><div class="gh-history-wrap"><table><thead><tr><th>Staff</th><th>In</th><th>Out</th><th>Status</th><th>Action</th></tr></thead><tbody id="gh-admin-attendance-rows"></tbody></table></div></div>`;
      settings.appendChild(box);
      const modal = document.createElement('div'); modal.id = 'gh-staff-manager'; modal.className = 'gh-modal'; modal.hidden = true;
      modal.innerHTML = `<div class="gh-modal-card"><h2>Manage Staff Accounts</h2><div class="gh-create-grid"><input id="gh-new-name" placeholder="Staff name"><input id="gh-new-id" placeholder="Staff ID"><input id="gh-new-password" type="password" placeholder="Password"><button id="gh-create-staff">Create Staff</button></div><div id="gh-admin-staff-list"></div><button id="gh-close-staff-manager" class="gh-close">Close</button></div>`;
      document.body.appendChild(modal);
      $('gh-open-staff-manager').onclick = openStaffManager; $('gh-create-staff').onclick = createStaff; $('gh-close-staff-manager').onclick = () => modal.hidden = true;
      $('gh-load-admin-attendance').onclick = renderAdminAttendance; $('gh-admin-date').onchange = renderAdminAttendance;
      $('gh-print-admin-attendance').onclick = () => { const old = document.title; document.title = 'Gokul_Hub_Staff_Attendance_' + $('gh-admin-date').value; window.print(); document.title = old; };
    }
    boot();
  });
})();
