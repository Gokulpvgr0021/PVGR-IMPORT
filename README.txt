GOKUL HUB - SEPARATED SOURCE PACKAGE

Folder structure:
  index.html
  css/style.css       Existing Gokul Hub styling
  css/auth.css        Staff/Admin login and staff screen styling
  js/app.js           Existing Gokul Hub application JavaScript
  js/auth.js          Staff/Admin login, staff attendance, admin staff tools
  js/enhancements.js  Existing backup/restore and enhancement functions

IMPORTANT BEFORE DEPLOYMENT
1. Keep a full backup of the current GitHub repository and existing localStorage data.
2. Upload this folder structure without changing file/folder names.
3. Preserve the existing 10276.png file from the old repository if it exists; this package references it for the profile/avatar image. Do not delete it.
4. The app uses the existing Magnum Firebase Realtime Database paths:
   - magnum_settings/staffList
   - magnum_settings/staffCredentials
   - magnum_settings/adminPassword
   - magnum_settings/staffSessionCommands
   - magnum_attendance
   Existing attendance data is not migrated or cleared.
5. Staff login stays active on the same browser/device until the staff member logs out or Admin sends Force Logout.
6. Firebase credentials in the legacy Magnum database are stored in the existing plaintext format for compatibility. This is a client-side role gate, not a substitute for Firebase Authentication and strict Realtime Database Security Rules. Before using sensitive production data, secure the database rules so only authorized staff can read/write their own records and only admins can manage all staff.
7. Test on a preview deployment before replacing the live GitHub Pages/Cloudflare site.

The external PDF/font/icon libraries are loaded from their existing CDN URLs and require an internet connection.
