/* Gokul Hub shared loading video manager.
   Uses existing Firebase app + Realtime Database + Storage. */
(function () {
  'use strict';
  const CONFIG = {
    apiKey: 'AIzaSyCd3HHP3hHLBnEkqOvK8jgBAGE99_mj_6k',
    authDomain: 'magnum-clothing-attendance.firebaseapp.com',
    projectId: 'magnum-clothing-attendance',
    storageBucket: 'magnum-clothing-attendance.firebasestorage.app',
    messagingSenderId: '762113661744',
    appId: '1:762113661744:web:f9edd4ca012fb0c98106f5'
  };
  const DB_PATH = 'gokulHubSettings/loadingScreen';
  const FALLBACK_VIDEO = './loading-intro.mp4';
  let db, storage, currentUrl = FALLBACK_VIDEO, hideTimer;
  const $ = id => document.getElementById(id);

  function firebaseApp() {
    let app = firebase.apps.find(a => a.name === 'gokulHubMagnum');
    if (!app) app = firebase.initializeApp(CONFIG, 'gokulHubMagnum');
    return app;
  }
  function showIntro(url) {
    const layer = $('gh-loading-screen'), video = $('gh-loading-video');
    if (!layer || !video) return;
    clearTimeout(hideTimer);
    video.pause();
    video.src = url || FALLBACK_VIDEO;
    video.currentTime = 0;
    layer.classList.remove('gh-loading-hide');
    layer.hidden = false;
    const finish = () => {
      layer.classList.add('gh-loading-hide');
      setTimeout(() => { layer.hidden = true; video.pause(); }, 450);
    };
    video.onended = finish;
    video.ontimeupdate = () => { if (video.currentTime >= 3) { video.pause(); finish(); } };
    const play = video.play();
    if (play && play.catch) play.catch(() => finish());
    hideTimer = setTimeout(finish, 4500);
  }
  function watchSharedVideo() {
    try {
      const app = firebaseApp(); db = app.database();
      if (firebase.storage) storage = app.storage();
      db.ref(DB_PATH + '/videoUrl').on('value', snap => {
        const url = snap.val();
        currentUrl = typeof url === 'string' && url ? url : FALLBACK_VIDEO;
      });
      return db.ref(DB_PATH + '/videoUrl').once('value').then(snap => {
        const url = snap.val(); currentUrl = typeof url === 'string' && url ? url : FALLBACK_VIDEO;
      }).catch(e => console.warn('Loading video config unavailable:', e));
    } catch (e) { console.warn('Loading video config unavailable:', e); return Promise.resolve(); }
  }
  function addAdminPanel() {
    const settings = $('settings-view');
    if (!settings || $('gh-loading-manager')) return;
    const card = document.createElement('div');
    card.className = 'form-card'; card.id = 'gh-loading-manager';
    card.innerHTML = `<h3 style="margin-bottom:12px"><i class="fas fa-film"></i> Loading Screen Manager</h3>
      <p style="font-size:13px;line-height:1.5">Change the 3-second intro video for all Gokul Hub users.</p>
      <input id="gh-loading-file" type="file" accept="video/mp4,video/webm,video/quicktime" style="width:100%;margin:12px 0">
      <video id="gh-loading-preview" controls playsinline style="display:none;width:100%;max-height:220px;border-radius:12px;background:#000"></video>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
       <button class="btn btn-primary" id="gh-loading-upload">Upload & Apply to Everyone</button>
       <button class="btn btn-primary" id="gh-loading-default">Use Default Video</button>
      </div><p id="gh-loading-status" role="status" style="font-size:12px;margin-top:10px"></p>`;
    const first = settings.querySelector('.form-card');
    if (first) settings.insertBefore(card, first); else settings.prepend(card);
    const file = $('gh-loading-file'), preview = $('gh-loading-preview'), status = $('gh-loading-status');
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) { preview.style.display = 'none'; return; }
      if (f.size > 80 * 1024 * 1024) { status.textContent = 'Video must be 80 MB or smaller.'; file.value = ''; return; }
      const local = URL.createObjectURL(f); preview.src = local; preview.style.display = 'block';
      status.textContent = 'Preview ready. The first 3 seconds will play as the loading intro.';
    });
    $('gh-loading-upload').onclick = async () => {
      const f = file.files && file.files[0];
      if (!f) { status.textContent = 'Choose a video first.'; return; }
      if (!storage || !db) { status.textContent = 'Firebase Storage is not available. Check Storage setup.'; return; }
      const btn = $('gh-loading-upload'); btn.disabled = true; status.textContent = 'Uploading video…';
      try {
        const ext = (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
        const ref = storage.ref('gokul-hub/loading-screen/intro-' + Date.now() + '.' + ext);
        const task = ref.put(f, { contentType: f.type || 'video/mp4' });
        await task;
        const url = await ref.getDownloadURL();
        await db.ref(DB_PATH).update({ videoUrl: url, updatedAt: Date.now(), fileName: f.name });
        currentUrl = url; status.textContent = 'Saved! New loading video will be used by all users.';
        file.value = '';
      } catch (e) {
        console.error(e); status.textContent = 'Upload failed: ' + (e.message || 'Check Firebase Storage rules and bucket setup.');
      } finally { btn.disabled = false; }
    };
    $('gh-loading-default').onclick = async () => {
      try {
        if (!db) throw new Error('Firebase Database unavailable.');
        await db.ref(DB_PATH).update({ videoUrl: null, updatedAt: Date.now(), fileName: 'default' });
        currentUrl = FALLBACK_VIDEO; status.textContent = 'Default loading video selected for everyone.';
      } catch (e) { status.textContent = 'Could not save: ' + e.message; }
    };
  }
  function observeAdmin() {
    const apply = () => {
      const admin = document.body.classList.contains('gh-admin-mode');
      const panel = $('gh-loading-manager');
      if (admin && !panel) addAdminPanel();
      if (panel) panel.hidden = !admin;
    };
    new MutationObserver(apply).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    apply();
  }
  document.addEventListener('DOMContentLoaded', () => {
    const layer = document.createElement('div');
    layer.id = 'gh-loading-screen'; layer.innerHTML = '<video id="gh-loading-video" muted playsinline preload="auto"></video><div class="gh-loading-caption">GOKUL HUB</div>';
    document.body.prepend(layer);
    const style = document.createElement('style');
    style.textContent = '#gh-loading-screen{position:fixed;inset:0;z-index:999999;background:#050505;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .45s ease}#gh-loading-screen[hidden]{display:none}#gh-loading-screen.gh-loading-hide{opacity:0;pointer-events:none}#gh-loading-video{width:100%;height:100%;object-fit:cover}#gh-loading-screen .gh-loading-caption{position:absolute;bottom:8%;left:0;right:0;text-align:center;color:#fff;font:700 13px Arial;letter-spacing:5px;text-shadow:0 2px 12px #000}#gh-loading-manager[hidden]{display:none!important}';
    document.head.appendChild(style);
    observeAdmin();
    // Load the shared URL before playing; fall back quickly if the network is unavailable.
    Promise.race([watchSharedVideo(), new Promise(resolve => setTimeout(resolve, 1800))])
      .finally(() => showIntro(currentUrl));
  });
})();
