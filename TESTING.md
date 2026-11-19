# Testing report (Chromium headless 153, 320/360/412/1280px)
Mocks: Firebase was an in-memory MOCK and jsPDF a recording STUB (sandbox had no network). Real Firebase, real PDF output, fonts/CDN and the APK build were NOT tested.

PASSED (automated): admin boot, balance calc, search (tx/EMI/page/shift), shift edit incl. OT=0, invalid date rejection, History text/date/sort/type filters, delete-from-filtered-row removes correct record, holiday add/remove changes absent, add income + dream goal, backup (no secrets), restore merge, restore ignores session/password keys, icon cropper (512x512 png), staff wrong/right password, offline-queue flush, staff punch, session persists across reload, logout, admin login, admin sees staff punches, daily + monthly PDF data (stub), service worker precache, app loads offline, no JS page errors, no horizontal overflow on all 5 screens at 4 widths.
NOT TESTED: real Firebase, real jsPDF/html2pdf output, EMI add/edit/delete/pay flows, cashback, themes/fonts/wallpaper UI, manual attendance editing UI, APK build/install, real Android device, console errors beyond page errors.


## Round 2 (automated, Chromium)
PASSED: cold start shows login gate in 0.37 s with no video element/request; legacy plaintext admin+staff caches migrate to hashes; wrong offline admin/staff password rejected; offline admin + staff login via hashes; online staff login leaves no plaintext password in localStorage; Back Button handler (modal -> home -> exit signal).
NOT TESTED: the Capacitor App plugin itself on a device, APK build, native PDF save/share/print.
