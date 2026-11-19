GOKUL HUB - project layout (flat; all files live in the repo root)

index.html            App shell + all screens
style.css, auth.css   Original styles
upgrades.css          NEW  top bar, search, history tools, holiday card, narrow-screen fixes
app.js                Savings, Work, EMI, History, Settings, PDF
auth.js               Staff/Admin login, attendance, offline queue, Firebase
enhancements.js       Backup/Restore, wallpaper, fonts, icon cropper
holidays.js           NEW  holiday calendar (key: gokulHolidays)
upgrades.js           NEW  search, history filters, attendance PDFs
service-worker.js     Offline cache - BUMP CACHE_VERSION whenever any file changes
manifest.json, app-icon-512.png, icon.png
REMOVED: loading-intro.mp4, loading-manager.js (video loading system). Firebase path gokulHubSettings/loadingScreen is left untouched.
.github/workflows/    APK build (unchanged)

KEEP your existing 10276.png from the live repo (it was not in the ZIP).
See CHANGES.md and TESTING.md.
