/* Gokul Hub - holiday calendar.
   Government holidays are NOT counted as absent days.
   - Built-in: fixed-date national holidays (same date every year).
   - Custom: dates the Admin adds in Settings, stored in the NEW localStorage key "gokulHolidays".
   Existing keys / Firebase paths are not touched. */
(function () {
  'use strict';
  var KEY = 'gokulHolidays';
  var FIXED = { '01-26': 'Republic Day', '08-15': 'Independence Day', '10-02': 'Gandhi Jayanti' };
  function readCustom() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(function (h) { return h && /^\d{4}-\d{2}-\d{2}$/.test(h.date); }) : [];
    } catch (_) { return []; }
  }
  function writeCustom(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {} }
  function holidayName(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return '';
    var custom = readCustom().find(function (h) { return h.date === dateStr; });
    if (custom) return custom.name || 'Holiday';
    return FIXED[String(dateStr).slice(5)] || '';
  }
  window.GHHolidays = {
    KEY: KEY,
    fixed: FIXED,
    name: holidayName,
    isHoliday: function (d) { return !!holidayName(d); },
    listCustom: readCustom,
    add: function (date, name) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
      var list = readCustom().filter(function (h) { return h.date !== date; });
      list.push({ date: date, name: String(name || 'Holiday').slice(0, 60) });
      list.sort(function (a, b) { return a.date.localeCompare(b.date); });
      writeCustom(list); return true;
    },
    remove: function (date) { writeCustom(readCustom().filter(function (h) { return h.date !== date; })); }
  };
})();
