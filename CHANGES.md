# Changed files
NEW: holidays.js, upgrades.js, upgrades.css, CHANGES.md, TESTING.md
EDITED: app.js, auth.js, enhancements.js, index.html, service-worker.js, README.txt
UNCHANGED: style.css, auth.css, manifest.json, loading-manager.js, workflow, images, video

## Data safety
No localStorage key renamed/removed. No Firebase path added/renamed/deleted. One NEW local key: gokulHolidays.

## Fixes
- service-worker: missing 10276.png no longer breaks install (optional files); new files cached; version v3
- auth.js: offline punch queue now flushes at startup, after login and every 45 s; no lost items during flush
- CSS: .view-panel children no longer shrink (Work log was 0px tall / History squeezed with many records)
- Admin logout moved into a top bar (no overlap); balance card fits 320px; decorative script text hidden <=400px
- index.html: duplicate-ID "Staff & Attendance" box in Settings replaced by shortcut buttons
- app.js: edit shift hours/OT to 0 works; shift date validated (YYYY-MM-DD, no duplicates), list re-sorted; user text HTML-escaped
- Backup excludes sessions/passwords; restore ignores them (prevents passwordless admin login on another device)
## Behaviour changes (deliberate)
- Absent = Mon-Sat working days with no punch, excluding holidays; working on Sunday/holiday no longer lowers absent
## Added
- Global search, History search/date-range/sort/type filter + Savings section, Holiday calendar, daily + monthly attendance PDF, square icon cropper with preview

## Not changed / needs your decision
- Workflow untouched. Native APK PDF saving (Filesystem+Share plugins) is coded but needs those plugins added to the npm install line; without them APK PDFs use browser download, which may not work in the WebView.
- Holidays are per-device; sharing with staff needs a new Firebase path (approval needed).
- Passwords are stored in plaintext in Firebase (existing). loading-manager.js is not loaded by index.html (existing).
- Installed Android home-screen icon only changes by replacing app-icon-512.png and rebuilding.


# Round 2 changes
- REMOVED: startup intro video (overlay, CSS, script), loading-intro.mp4, loading-manager.js, SW entries. App opens straight to login (0.37 s in test). No Firebase data touched.
- SECURITY: offline cache no longer stores plaintext passwords. Admin + staff offline credentials are salted PBKDF2-SHA256 (100k iterations, WebCrypto). Existing plaintext caches are converted automatically on first launch so offline login keeps working. Only the staff member who logged in on a device is cached on it. If WebCrypto is unavailable the cache is not written (offline login disabled rather than weakened).
- ANDROID: Back Button handler (closes search/crop/modals, then returns to Home, then exits) via @capacitor/app.
- WORKFLOW: now installs pinned @capacitor/app, filesystem, share (v7) and @capacitor/assets@3 so native PDF save/share code can work. Not yet built by me.
- service-worker cache v4.

# Known limitations / NOT done (honest list)
- Firebase still stores passwords in PLAINTEXT (magnum_settings). Fixing needs a data migration + new Firebase rules => needs your explicit approval and a backup. Firebase security rules are not in this repo and not reviewed.
- Offline staff cache holds the password as of their last online login; an admin password change takes effect offline only after that staff logs in online once.
- Full UI redesign (design system, charts, animations, dashboard widgets, light theme overhaul) NOT done.
- Centralised PDF engine, PDF preview/print, Tamil fonts NOT done; PDFs use existing jsPDF code. Savings-ledger PDF uses html2pdf (not routed through native save).
- Staff registration/profile, attendance record deletion, performance overview, notifications centre, backup history NOT built.
- Attendance maths is still duplicated in app.js / auth.js / upgrades.js (not yet one shared engine).
- Real Android device, APK build and PWA install NOT tested.
