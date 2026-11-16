/* Gokul Hub - upgrades layer (loaded LAST).
   Additive only: reads the existing localStorage data, never renames keys or Firebase paths.
   New localStorage key introduced: "gokulHolidays" (see holidays.js). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  // app.js declares these with top-level `let`; they are visible by bare name, guarded with typeof.
  function getTx() { return (typeof transactions !== 'undefined' && Array.isArray(transactions)) ? transactions : []; }
  function getShifts() { return (typeof shifts !== 'undefined' && Array.isArray(shifts)) ? shifts : []; }
  function getEmi() { return (typeof emiRegistry !== 'undefined' && Array.isArray(emiRegistry)) ? emiRegistry : []; }
  function money(n) { return '\u20B9' + (Number(n) || 0).toFixed(2); }

  /* ---------- date helpers ---------- */
  function txDateKey(raw) {            // "dd/mm/yyyy, hh:mm:ss" (en-GB) or ISO -> "yyyy-mm-dd"
    var s = String(raw || '');
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    var t = Date.parse(s);
    if (!isNaN(t)) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    return '';
  }
  function localDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------- top bar (search + admin logout, never overlaps page content) ---------- */
  function mountTopbar() {
    var bar = $('gh-topbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'gh-topbar';
      bar.innerHTML = '<span class="gh-top-brand">GOKUL HUB</span>' +
        '<button type="button" id="gh-search-btn" aria-label="Search everything"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search</span></button>';
      document.body.appendChild(bar);
      $('gh-search-btn').addEventListener('click', openSearch);
    }
    return bar;
  }

  /* ---------- global search ---------- */
  var PAGES = [
    { label: 'Savings / Vault', view: 'vault-dashboard', kw: 'savings vault balance income expense cashback dream goal ledger home dashboard' },
    { label: 'Work & Attendance', view: 'attendance', kw: 'work attendance punch in out shift overtime ot break present absent staff admin holiday' },
    { label: 'EMI Tracker', view: 'emi-dashboard', kw: 'emi loan payment tracker installment' },
    { label: 'History & Reports', view: 'history', kw: 'history reports timesheet pdf records filter sort date range' },
    { label: 'Settings', view: 'settings', kw: 'settings theme wallpaper font icon pdf backup restore profile appearance' },
    { label: 'Backup & Restore', view: 'settings', target: 'gokul-extra-tools', kw: 'backup restore export import data safe' },
    { label: 'Holiday calendar', view: 'attendance', target: 'gh-holidays-card', kw: 'holiday government calendar absent' },
    { label: 'Staff accounts (Admin)', view: 'attendance', target: 'gh-open-staff-manager', kw: 'staff accounts login password manage admin' }
  ];

  function buildSearchOverlay() {
    var ov = $('gh-search-overlay'); if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'gh-search-overlay'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Search Gokul Hub');
    ov.innerHTML = '<div class="gh-search-card">' +
      '<div class="gh-search-head"><input id="gh-search-input" type="search" placeholder="Search savings, shifts, EMI, settings\u2026" autocomplete="off">' +
      '<button type="button" id="gh-search-close" aria-label="Close search">\u2715</button></div>' +
      '<div id="gh-search-results" class="gh-search-results"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeSearch(); });
    $('gh-search-close').addEventListener('click', closeSearch);
    var t = null;
    $('gh-search-input').addEventListener('input', function () { clearTimeout(t); t = setTimeout(runSearch, 120); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) closeSearch(); });
    return ov;
  }
  function openSearch() { var ov = buildSearchOverlay(); ov.hidden = false; $('gh-search-input').value = ''; runSearch(); setTimeout(function () { $('gh-search-input').focus(); }, 30); }
  function closeSearch() { var ov = $('gh-search-overlay'); if (ov) ov.hidden = true; }

  function goTo(view, target, after) {
    closeSearch();
    if (typeof navTo === 'function') navTo(view);
    setTimeout(function () {
      if (target && $(target)) $(target).scrollIntoView({ behavior: 'smooth', block: 'center' });
      else scrollTop();
      if (after) after();
    }, 60);
  }

  function runSearch() {
    var q = ($('gh-search-input').value || '').trim().toLowerCase();
    var box = $('gh-search-results'); var html = ''; var actions = [];
    function add(group, icon, title, sub, fn) {
      actions.push(fn);
      html += '<button type="button" class="gh-sr" data-i="' + (actions.length - 1) + '"><i class="fas ' + icon + '"></i><span><b>' + esc(title) + '</b><small>' + esc(group) + (sub ? ' \u00B7 ' + esc(sub) : '') + '</small></span></button>';
    }
    var count = 0, LIMIT = 40;
    // pages and settings sections
    PAGES.forEach(function (p) {
      if (count >= LIMIT) return;
      if (!q || (p.label + ' ' + p.kw).toLowerCase().indexOf(q) !== -1) { count++; add('Go to', 'fa-compass', p.label, '', function () { goTo(p.view, p.target); }); }
    });
    if (q) {
      getTx().forEach(function (t, idx) {
        if (count >= LIMIT) return;
        var hay = [t.category, t.type, t.amount, t.date].join(' ').toLowerCase();
        if (hay.indexOf(q) !== -1) { count++; add('Savings', t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down', (t.category || '(no note)') + ' ' + (t.type === 'income' ? '+' : '-') + money(t.amount), String(t.date || '').split(',')[0], function () { goTo('vault-dashboard', 'ledger-table-body', function () { if (typeof openEditTxModal === 'function') openEditTxModal(idx); }); }); }
      });
      getShifts().forEach(function (s, idx) {
        if (count >= LIMIT) return;
        var hay = [s.date, s.jobType, s.timing, s.net, s.otHours].join(' ').toLowerCase();
        if (hay.indexOf(q) !== -1) { count++; add('Shift', 'fa-business-time', (s.date || '') + ' \u00B7 ' + (s.jobType || 'Job'), (Number(s.net) || 0).toFixed(1) + 'h', function () { goTo('history', null, function () { if (typeof openEditShiftModal === 'function') openEditShiftModal(idx); }); }); }
      });
      getEmi().forEach(function (l) {
        if (count >= LIMIT) return;
        var hay = [l.name, l.startDate, l.endDate].join(' ').toLowerCase();
        if (hay.indexOf(q) !== -1) { count++; add('EMI', 'fa-calculator', l.name || 'EMI', (l.paidMonths || 0) + '/' + (l.totalMonths || 0) + ' months paid', function () { goTo('emi-dashboard'); }); }
      });
    }
    box.innerHTML = html || '<p class="gh-sr-empty">No matches. Try a note, date, job or EMI name.</p>';
    box.querySelectorAll('.gh-sr').forEach(function (b) { b.addEventListener('click', function () { actions[Number(b.dataset.i)](); }); });
  }

  /* ---------- scroll to top on screen change ---------- */
  function scrollTop() {
    var st = document.querySelector('.main-stage'); if (st) st.scrollTop = 0;
    document.querySelectorAll('.view-panel.active').forEach(function (p) { p.scrollTop = 0; });
    window.scrollTo(0, 0);
  }
  function wrapNavTo() {
    if (typeof window.navTo !== 'function' || window.navTo.__ghWrapped) return;
    var orig = window.navTo;
    window.navTo = function () { var r = orig.apply(this, arguments); scrollTop(); return r; };
    window.navTo.__ghWrapped = true;
  }

  /* ---------- History: search / filter / sort / date range ---------- */
  var H = { q: '', from: '', to: '', type: 'all', sort: 'new' };

  function buildHistoryTools() {
    var view = $('history-view'); if (!view || $('gh-hist-tools')) return;
    var heading = view.querySelector('.panel-heading');
    var tools = document.createElement('div');
    tools.id = 'gh-hist-tools'; tools.className = 'form-card gh-hist-tools';
    tools.innerHTML =
      '<input id="gh-hist-q" type="search" class="form-control" placeholder="Search notes, jobs, dates\u2026" aria-label="Search history">' +
      '<div class="gh-hist-row"><label>From<input id="gh-hist-from" type="date" class="form-control"></label>' +
      '<label>To<input id="gh-hist-to" type="date" class="form-control"></label></div>' +
      '<div class="gh-hist-row"><label>Show<select id="gh-hist-type" class="form-control"><option value="all">All records</option><option value="shifts">Shifts only</option><option value="tx">Savings only</option></select></label>' +
      '<label>Sort<select id="gh-hist-sort" class="form-control"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="high">Highest hours / amount</option><option value="low">Lowest hours / amount</option></select></label></div>' +
      '<div class="gh-hist-foot"><span id="gh-hist-count" role="status"></span><button type="button" id="gh-hist-reset" class="btn btn-primary">Reset filters</button></div>';
    if (heading && heading.nextSibling) view.insertBefore(tools, heading.nextSibling); else view.insertBefore(tools, view.firstChild);

    // Savings section (new) placed after the existing shift table
    var shiftWrap = view.querySelector('.table-wrap');
    var sec = document.createElement('div'); sec.id = 'gh-hist-tx-section';
    sec.innerHTML = '<div class="panel-heading"><span>Savings Transactions</span></div>' +
      '<div class="table-wrap"><table id="gh-hist-tx-table"><thead><tr><th>Date</th><th>Note</th><th>Type</th><th>Amount</th><th style="width:80px">Action</th></tr></thead><tbody id="gh-hist-tx-body"></tbody></table></div>';
    if (shiftWrap && shiftWrap.parentNode) shiftWrap.parentNode.insertBefore(sec, shiftWrap.nextSibling);
    var shiftHeading = view.querySelectorAll('.panel-heading')[0];
    if (shiftHeading) shiftHeading.id = 'gh-hist-shift-heading';
    // keep a handle on the shift table wrapper so "Savings only" can hide it
    if (shiftWrap) shiftWrap.id = 'gh-hist-shift-wrap';

    var bind = function (id, key, ev) { $(id).addEventListener(ev || 'input', function () { H[key] = $(id).value; renderHistory(); }); };
    bind('gh-hist-q', 'q'); bind('gh-hist-from', 'from', 'change'); bind('gh-hist-to', 'to', 'change');
    bind('gh-hist-type', 'type', 'change'); bind('gh-hist-sort', 'sort', 'change');
    $('gh-hist-reset').addEventListener('click', function () {
      H = { q: '', from: '', to: '', type: 'all', sort: 'new' };
      ['gh-hist-q', 'gh-hist-from', 'gh-hist-to'].forEach(function (i) { $(i).value = ''; });
      $('gh-hist-type').value = 'all'; $('gh-hist-sort').value = 'new'; renderHistory();
    });
  }

  function inRange(key) {
    if (!H.from && !H.to) return true;
    if (!key) return false;
    if (H.from && key < H.from) return false;
    if (H.to && key > H.to) return false;
    return true;
  }
  function sortList(list, valueFn) {
    var dir = H.sort;
    list.sort(function (a, b) {
      if (dir === 'high') return valueFn(b) - valueFn(a) || b.idx - a.idx;
      if (dir === 'low') return valueFn(a) - valueFn(b) || a.idx - b.idx;
      var c = a.key < b.key ? -1 : a.key > b.key ? 1 : a.idx - b.idx;   // same day: later record = newer
      return dir === 'old' ? c : -c;
    });
  }

  function renderHistory() {
    var body = $('history-table-body'), txBody = $('gh-hist-tx-body');
    if (!body || !txBody || !$('gh-hist-tools')) return;
    var q = H.q.trim().toLowerCase();

    var sList = [];
    getShifts().forEach(function (s, idx) {
      var key = s.date || '';
      var hay = [s.date, s.jobType, s.timing, s.net, s.otHours].join(' ').toLowerCase();
      if ((!q || hay.indexOf(q) !== -1) && inRange(key)) sList.push({ s: s, idx: idx, key: key });
    });
    sortList(sList, function (x) { return Number(x.s.net) || 0; });

    var tList = [];
    getTx().forEach(function (t, idx) {
      var key = txDateKey(t.date);
      var hay = [t.date, t.category, t.type, t.amount].join(' ').toLowerCase();
      if ((!q || hay.indexOf(q) !== -1) && inRange(key)) tList.push({ t: t, idx: idx, key: key });
    });
    sortList(tList, function (x) { return Number(x.t.amount) || 0; });

    // Every action button carries the ORIGINAL array index, so edit/delete always hit the right record.
    body.innerHTML = sList.map(function (r) {
      var s = r.s, i = r.idx;
      var job = String(s.jobType || 'Job'); var shortJob = job.length > 12 ? job.slice(0, 12) + '..' : job;
      var timing = s.timing || ((s.inTime || '00:00') + ' - ' + (s.outTime || '00:00'));
      var hol = window.GHHolidays && window.GHHolidays.name(s.date);
      return '<tr><td>' + esc(s.date || '') + (hol ? ' <small title="' + esc(hol) + '">\uD83C\uDF89</small>' : '') + '</td><td style="font-weight:700;font-size:11px;">' + esc(shortJob) + '</td><td style="font-size:11px;">' + esc(timing) + '</td><td>' + (Number(s.net) || 0).toFixed(1) + 'h</td><td style="color:var(--text-accent);font-weight:700;">' + (Number(s.otHours) || 0).toFixed(1) + 'h</td>' +
        '<td><div style="display:flex;gap:8px;justify-content:center;"><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;margin:0;width:auto;" aria-label="Edit shift" onclick="openEditShiftModal(' + i + ')"><i class="fas fa-edit"></i></button><button class="btn btn-danger" style="padding:4px 8px;font-size:11px;margin:0;width:auto;" aria-label="Delete shift" onclick="deleteShift(' + i + ')"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('') || '<tr><td colspan="6" class="gh-empty">No shifts match.</td></tr>';

    txBody.innerHTML = tList.map(function (r) {
      var t = r.t, i = r.idx, inc = t.type === 'income';
      var col = inc ? 'var(--text-accent)' : 'var(--danger)';
      return '<tr><td style="font-size:11px;">' + esc(String(t.date || '').split(',')[0]) + '</td><td style="font-weight:700;text-align:left;">' + esc(t.category || '') + '</td>' +
        '<td style="text-transform:capitalize;color:' + col + '">' + esc(t.type) + '</td><td style="font-weight:700;color:' + col + '">' + (inc ? '+' : '-') + money(t.amount) + '</td>' +
        '<td><div style="display:flex;gap:8px;justify-content:center;"><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;margin:0;width:auto;" aria-label="Edit transaction" onclick="openEditTxModal(' + i + ')"><i class="fas fa-edit"></i></button><button class="btn btn-danger" style="padding:4px 8px;font-size:11px;margin:0;width:auto;" aria-label="Delete transaction" onclick="deleteLedgerTx(' + i + ')"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('') || '<tr><td colspan="5" class="gh-empty">No transactions match.</td></tr>';

    var showShifts = H.type !== 'tx', showTx = H.type !== 'shifts';
    var sw = $('gh-hist-shift-wrap'), sh = $('gh-hist-shift-heading'), ts = $('gh-hist-tx-section');
    if (sw) sw.style.display = showShifts ? '' : 'none';
    if (sh) sh.style.display = showShifts ? '' : 'none';
    if (ts) ts.style.display = showTx ? '' : 'none';
    var parts = [];
    if (showShifts) parts.push(sList.length + ' of ' + getShifts().length + ' shifts');
    if (showTx) parts.push(tList.length + ' of ' + getTx().length + ' transactions');
    $('gh-hist-count').textContent = parts.join(' \u00B7 ');
  }

  function wrapRenderers() {
    ['updateShiftStats', 'updateVaultStats'].forEach(function (name) {
      var orig = window[name];
      if (typeof orig !== 'function' || orig.__ghWrapped) return;
      window[name] = function () { var r = orig.apply(this, arguments); try { renderHistory(); } catch (e) { console.warn('History render failed', e); } return r; };
      window[name].__ghWrapped = true;
    });
  }

  /* ---------- holiday calendar card (Work & Attendance) ---------- */
  function buildHolidayCard() {
    var host = $('attendance-view'); if (!host || $('gh-holidays-card') || !window.GHHolidays) return;
    var card = document.createElement('div');
    card.id = 'gh-holidays-card'; card.className = 'form-card';
    card.innerHTML = '<h3 style="margin-bottom:8px"><i class="fas fa-calendar-day"></i> Holidays (never counted as absent)</h3>' +
      '<p class="gh-note">Built in: Republic Day (26 Jan), Independence Day (15 Aug), Gandhi Jayanti (2 Oct). Add any other government or state holiday below.</p>' +
      '<div class="gh-hol-add"><input id="gh-hol-date" type="date" class="form-control" aria-label="Holiday date"><input id="gh-hol-name" type="text" class="form-control" placeholder="Holiday name" maxlength="60" aria-label="Holiday name"><button type="button" id="gh-hol-save" class="btn btn-primary">Add</button></div>' +
      '<div id="gh-hol-list"></div>';
    // place just before the admin controls when present, else at the end
    var admin = host.querySelector('.gh-admin-tools');
    if (admin) host.insertBefore(card, admin); else host.appendChild(card);
    $('gh-hol-save').addEventListener('click', function () {
      var d = $('gh-hol-date').value; if (!d) return alert('Pick the holiday date.');
      window.GHHolidays.add(d, $('gh-hol-name').value.trim() || 'Holiday');
      $('gh-hol-date').value = ''; $('gh-hol-name').value = '';
      renderHolidayList(); refreshStats();
    });
    renderHolidayList();
  }
  function renderHolidayList() {
    var el = $('gh-hol-list'); if (!el) return;
    var list = window.GHHolidays.listCustom();
    el.innerHTML = list.length ? list.map(function (h) {
      return '<div class="gh-hol-row"><span><b>' + esc(h.name) + '</b><small>' + esc(h.date) + '</small></span><button type="button" class="btn btn-danger" data-d="' + esc(h.date) + '" aria-label="Remove holiday">\u2715</button></div>';
    }).join('') : '<p class="gh-note">No custom holidays added.</p>';
    el.querySelectorAll('button[data-d]').forEach(function (b) {
      b.addEventListener('click', function () { window.GHHolidays.remove(b.dataset.d); renderHolidayList(); refreshStats(); });
    });
  }
  function refreshStats() { if (typeof updateShiftStats === 'function') updateShiftStats(); }

  /* ---------- PDF helpers ---------- */
  function pdfStyle() {
    var rgb = typeof hexToRgb === 'function' ? hexToRgb : function () { return [30, 41, 59]; };
    return {
      brand: localStorage.getItem('gokulPdfBrand') || 'GOKUL HUB INC.',
      primary: rgb(localStorage.getItem('gokulPdfPrimary') || '#1e293b'),
      accent: rgb(localStorage.getItem('gokulPdfAccent') || '#d4af37')
    };
  }
  function pdfReady() {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF engine is not loaded yet. Connect to the internet once so it can be cached, then try again.'); return false; }
    return true;
  }
  // In the Android APK, blob downloads are not handled by the WebView; use the native Filesystem + Share plugins when present.
  function savePdf(doc, name) {
    var C = window.Capacitor, P = C && C.Plugins;
    if (C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && P && P.Filesystem && P.Share) {
      try {
        var b64 = doc.output('datauristring').split(',')[1];
        return P.Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' })
          .then(function (r) { return P.Share.share({ title: name, url: r.uri, dialogTitle: 'Save or share PDF' }); })
          .catch(function (e) { console.warn('Native PDF save failed, using browser download', e); doc.save(name); });
      } catch (e) { console.warn('Native PDF save failed', e); }
    }
    doc.save(name);
  }
  function pdfHeader(doc, st, title, sub) {
    doc.setFillColor(st.primary[0], st.primary[1], st.primary[2]); doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(st.brand, 14, 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(title, 14, 22);
    doc.setFontSize(9); doc.text(sub, 196, 22, { align: 'right' });
    doc.setTextColor(40, 40, 40);
  }
  function calcHours(inT, outT) {
    if (!inT || !outT) return 0;
    var a = String(inT).split(':').map(Number), b = String(outT).split(':').map(Number);
    if (a.length < 2 || b.length < 2 || a.some(isNaN) || b.some(isNaN)) return 0;
    var mins = b[0] * 60 + b[1] - (a[0] * 60 + a[1]); if (mins < 0) mins += 1440;
    return Math.max(0, mins / 60 - (mins > 240 ? 0.5 : 0));
  }

  // Daily report: exactly what the Admin sees for the selected date.
  function exportDayPdf(date) {
    if (!pdfReady()) return true;   // handled (alerted) - do not fall back to print
    var rows = [];
    document.querySelectorAll('#gh-admin-attendance-rows tr').forEach(function (tr) {
      var tds = tr.querySelectorAll('td'); if (tds.length < 4) return;
      var inEl = tr.querySelector('input[data-type="in"]'), outEl = tr.querySelector('input[data-type="out"]');
      var inV = inEl ? inEl.value : '', outV = outEl ? outEl.value : '';
      var h = calcHours(inV, outV);
      var hol = window.GHHolidays && window.GHHolidays.name(date);
      rows.push([tds[0].textContent.trim(), inV || '-', outV || '-', h ? h.toFixed(1) + 'h' : '-', inV ? (outV ? 'Present' : 'On duty') : (hol ? 'Holiday' : 'Absent')]);
    });
    if (!rows.length) { alert('Load attendance for the date first.'); return true; }
    var st = pdfStyle(); var jsPDF = window.jspdf.jsPDF; var doc = new jsPDF('p', 'mm', 'a4');
    var hol = window.GHHolidays && window.GHHolidays.name(date);
    pdfHeader(doc, st, 'DAILY ATTENDANCE REPORT', date + (hol ? '  \u00B7  ' + hol : ''));
    doc.autoTable({ startY: 38, head: [['Name', 'Punch In', 'Punch Out', 'Hours', 'Status']], body: rows, theme: 'striped',
      headStyles: { fillColor: st.primary, textColor: 255, halign: 'center' }, bodyStyles: { halign: 'center' }, columnStyles: { 0: { halign: 'left' } } });
    savePdf(doc, 'Gokul_Hub_Attendance_' + date + '.pdf');
    return true;
  }

  // Monthly report per person: present, absent (holidays/Sundays excluded), hours, OT + daily detail.
  async function exportMonthPdf(ym) {
    if (!pdfReady()) return;
    if (!window.GHAuth || !window.GHAuth.monthAttendance) return alert('Attendance service not ready.');
    var data = await window.GHAuth.monthAttendance(ym);
    var parts = ym.split('-'), y = Number(parts[0]), m = Number(parts[1]) - 1;
    var today = new Date(), last = (y === today.getFullYear() && m === today.getMonth()) ? today.getDate() : new Date(y, m + 1, 0).getDate();
    var expected = []; var holidays = [];
    for (var d = 1; d <= last; d++) {
      var ds = ym + '-' + ('0' + d).slice(-2);
      if (new Date(y, m, d).getDay() === 0) continue;
      var hn = window.GHHolidays && window.GHHolidays.name(ds);
      if (hn) { holidays.push(ds + ' ' + hn); continue; }
      expected.push(ds);
    }
    var summary = [], detail = [];
    data.names.forEach(function (name) {
      var present = 0, presentWork = 0, hours = 0, ot = 0;
      Object.keys(data.rows).sort().forEach(function (date) {
        var r = (data.rows[date] || {})[name]; if (!r || !r.in) return;
        var h = calcHours(r.in, r.out);
        present++; if (expected.indexOf(date) !== -1) presentWork++;
        hours += h; ot += Math.max(0, h - 8);
        detail.push([date, name, r.in, r.out || '-', h ? h.toFixed(1) + 'h' : '-']);
      });
      summary.push([name, present, Math.max(0, expected.length - presentWork), hours.toFixed(1) + 'h', ot.toFixed(1) + 'h']);
    });
    var st = pdfStyle(); var doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    pdfHeader(doc, st, 'MONTHLY ATTENDANCE REPORT', ym + (data.source === 'cache' ? '  \u00B7  offline data' : ''));
    doc.autoTable({ startY: 38, head: [['Name', 'Present', 'Absent', 'Hours', 'OT']], body: summary, theme: 'striped',
      headStyles: { fillColor: st.primary, textColor: 255, halign: 'center' }, bodyStyles: { halign: 'center' }, columnStyles: { 0: { halign: 'left' } } });
    var y2 = (doc.lastAutoTable && doc.lastAutoTable.finalY || 60) + 6;
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Absent = working days (Mon\u2013Sat) with no punch-in, excluding holidays. Holidays this month: ' + (holidays.join('; ') || 'none'), 14, y2, { maxWidth: 182 });
    doc.setTextColor(40, 40, 40);
    if (detail.length) doc.autoTable({ startY: y2 + 10, head: [['Date', 'Name', 'In', 'Out', 'Hours']], body: detail, theme: 'grid', styles: { fontSize: 8 },
      headStyles: { fillColor: st.accent, textColor: 20 } });
    savePdf(doc, 'Gokul_Hub_Attendance_' + ym + '.pdf');
  }

  function addMonthlyButton() {
    var tools = document.querySelector('.gh-admin-tools'); if (!tools || $('gh-month-pdf')) return;
    var row = document.createElement('div'); row.className = 'gh-admin-date';
    row.innerHTML = '<input id="gh-month-input" type="month" aria-label="Report month"><button type="button" id="gh-month-pdf" class="btn btn-primary">Monthly PDF</button>';
    tools.appendChild(row);
    $('gh-month-input').value = localDate().slice(0, 7);
    $('gh-month-pdf').addEventListener('click', function () { var v = $('gh-month-input').value; if (!v) return alert('Pick a month.'); exportMonthPdf(v); });
  }

  /* ---------- init ---------- */
  function init() {
    mountTopbar(); wrapNavTo(); wrapRenderers();
    buildHistoryTools(); buildHolidayCard(); addMonthlyButton();
    renderHistory(); refreshStats();
    // admin tools are created by auth.js at DOMContentLoaded; retry briefly in case they appear after this runs
    var tries = 0, t = setInterval(function () { addMonthlyButton(); buildHolidayCard(); if (++tries > 10) clearInterval(t); }, 400);
  }

  window.GHUpgrades = { mountTopbar: mountTopbar, openSearch: openSearch, savePdf: savePdf,
    exportAttendancePdf: exportDayPdf, exportMonthPdf: exportMonthPdf, renderHistory: renderHistory };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
