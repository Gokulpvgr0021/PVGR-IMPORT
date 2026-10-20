
/* Gokul Hub enhancements.
   Keeps the existing app and its current localStorage keys.
   Restore merges data and preserves conflicting existing values. */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function downloadJSON(data, filename) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function allStorage() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  }

  function backupAll() {
    downloadJSON({
      format: "gokul-hub-full-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      localStorage: allStorage()
    }, "GokulHub_Full_Backup.json");
  }

  // Keep existing values when a backup contains conflicting data.
  function mergeValue(current, incoming) {
    if (Array.isArray(current) && Array.isArray(incoming)) {
      const seen = new Set(current.map(x => JSON.stringify(x)));
      return current.concat(
        incoming.filter(x => !seen.has(JSON.stringify(x)))
      );
    }

    if (
      current && incoming &&
      typeof current === "object" &&
      typeof incoming === "object" &&
      !Array.isArray(current) &&
      !Array.isArray(incoming)
    ) {
      const result = { ...current };
      for (const key of Object.keys(incoming)) {
        if (!(key in result)) result[key] = incoming[key];
        else result[key] = mergeValue(result[key], incoming[key]);
      }
      return result;
    }

    return current;
  }

  function safeRestore(file) {
    if (!file) {
      alert("First select a JSON backup file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      try {
        const backup = JSON.parse(reader.result);
        let entries;

        // New full backup format.
        if (
          backup &&
          backup.format === "gokul-hub-full-backup" &&
          backup.localStorage &&
          typeof backup.localStorage === "object"
        ) {
          entries = backup.localStorage;
        } else {
          // Older Gokul Hub backup format.
          const legacyMap = {
            profile: "gokulProfile",
            vaultTx: "gokulVaultTx",
            attRecords: "gokulAttRecords",
            petrolRecords: "gokulPetrolRecords",
            emiRegistry: "gokulEmiRegistry",
            dreamGoal: "gokulDreamGoal"
          };

          entries = {};
          for (const [oldKey, newKey] of Object.entries(legacyMap)) {
            if (Object.prototype.hasOwnProperty.call(backup, oldKey)) {
              entries[newKey] = JSON.stringify(backup[oldKey]);
            }
          }

          // Also accept a backup whose keys are actual storage keys.
          if (Object.keys(entries).length === 0) {
            for (const [key, value] of Object.entries(backup)) {
              if (typeof value === "string") entries[key] = value;
            }
          }
        }

        if (!entries || !Object.keys(entries).length) {
          throw new Error("No supported backup data found.");
        }

        // Save the current data before restoring anything.
        backupAll();

        let added = 0;
        let merged = 0;
        let skipped = 0;

        for (const [key, incomingRaw] of Object.entries(entries)) {
          if (typeof incomingRaw !== "string") continue;

          const currentRaw = localStorage.getItem(key);

          if (currentRaw === null) {
            localStorage.setItem(key, incomingRaw);
            added++;
            continue;
          }

          try {
            const current = JSON.parse(currentRaw);
            const incoming = JSON.parse(incomingRaw);
            const combined = mergeValue(current, incoming);

            if (JSON.stringify(combined) !== JSON.stringify(current)) {
              localStorage.setItem(key, JSON.stringify(combined));
              merged++;
            } else {
              skipped++;
            }
          } catch (_) {
            // Existing primitive/string values are kept for safety.
            skipped++;
          }
        }

        alert(
          "Restore finished safely.\n" +
          "New items: " + added + "\n" +
          "Merged items: " + merged + "\n" +
          "Kept existing values: " + skipped +
          "\n\nA safety backup download was started. Reloading the app."
        );
        location.reload();
      } catch (error) {
        alert("Backup not restored: " + error.message);
      }
    };

    reader.readAsText(file);
  }

  function imageToDataURL(file, maxSize, type, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please select an image file."));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Invalid image."));
        img.onload = () => {
          const scale = Math.min(
            1,
            maxSize / Math.max(img.width, img.height)
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(
            img, 0, 0, canvas.width, canvas.height
          );
          resolve(canvas.toDataURL(type, quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setBrowserIcon(dataURL) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = dataURL;
  }

  function addSettingsPanel() {
    const settings = $("settings-view");
    if (!settings || $("gokul-extra-tools")) return;

    const panel = document.createElement("div");
    panel.id = "gokul-extra-tools";
    panel.style.cssText =
      "margin:16px 0;padding:18px;border:1px solid var(--border-color," +
      "#555);border-radius:16px;background:var(--surface,rgba(0,0,0,.25));";

    panel.innerHTML = `
      <h3 style="margin-bottom:14px">Gokul Hub — Personalization & Safety</h3>

      <button type="button" id="gh-profile" class="btn btn-primary"
        style="width:100%;margin-bottom:10px">
        Edit Profile
      </button>

      <label for="gh-wallpaper-file">Change wallpaper</label>
      <input id="gh-wallpaper-file" type="file" accept="image/*"
        style="display:block;width:100%;margin:10px 0">
      <button type="button" id="gh-wallpaper" class="btn btn-primary"
        style="width:100%;margin-bottom:16px">Apply Wallpaper</button>

      <label for="gh-icon-file">Choose browser icon</label>
      <input id="gh-icon-file" type="file" accept="image/*"
        style="display:block;width:100%;margin:10px 0">
      <button type="button" id="gh-icon" class="btn btn-primary"
        style="width:100%;margin-bottom:16px">Apply Browser Icon</button>
      <p style="font-size:12px;margin:0 0 16px">
        This changes the browser tab icon. The installed Android home-screen
        icon may still require an icon/manifest update and reinstall.
      </p>

      <label for="gh-theme">Premium theme</label>
      <select id="gh-theme" class="form-control"
        style="width:100%;margin:10px 0 16px">
        <option value="jarvis">Black & Gold</option>
        <option value="obsidian">Obsidian</option>
        <option value="sapphire">Sapphire Blue</option>
        <option value="amethyst">Amethyst Purple</option>
        <option value="jade">Jade Green</option>
        <option value="ruby">Ruby Red</option>
        <option value="light">Light</option>
        <option value="platinum">Platinum</option>
      </select>

      <button type="button" id="gh-backup" class="btn btn-primary"
        style="width:100%;margin-bottom:10px">Download Full Backup</button>

      <label for="gh-restore-file">Restore / merge a JSON backup</label>
      <input id="gh-restore-file" type="file" accept=".json,application/json"
        style="display:block;width:100%;margin:10px 0">
      <button type="button" id="gh-restore" class="btn btn-primary"
        style="width:100%;margin-bottom:10px">Restore Safely</button>

      <button type="button" id="gh-storage" class="btn btn-primary"
        style="width:100%">Check Saved Data</button>
      <p id="gh-status" style="font-size:12px;margin-top:12px"></p>
    `;

    settings.insertBefore(panel, settings.firstChild);

    $("gh-profile").onclick = () => {
      if (typeof window.openProfileModal === "function") {
        window.openProfileModal();
      } else {
        alert("Use the existing Edit Profile button in Gokul Hub.");
      }
    };

    $("gh-theme").value = localStorage.getItem("gokulTheme") || "jarvis";
    $("gh-theme").onchange = event => {
      if (typeof window.applyTheme === "function") {
        window.applyTheme(event.target.value);
      } else {
        document.documentElement.setAttribute(
          "data-theme", event.target.value
        );
        localStorage.setItem("gokulTheme", event.target.value);
      }
    };

    $("gh-wallpaper").onclick = async () => {
      try {
        const file = $("gh-wallpaper-file").files[0];
        if (!file) return alert("Select a wallpaper image first.");
        const data = await imageToDataURL(file, 1600, "image/jpeg", 0.72);
        localStorage.setItem("gokulWallpaper", data);

        if (typeof window.applyWallpaper === "function") {
          window.applyWallpaper(data);
        } else {
          document.body.style.backgroundImage = `url("${data}")`;
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          document.body.style.backgroundAttachment = "fixed";
        }
        alert("Wallpaper saved.");
      } catch (error) {
        alert(error.message + " If storage is full, use a smaller image.");
      }
    };

    $("gh-icon").onclick = async () => {
      try {
        const file = $("gh-icon-file").files[0];
        if (!file) return alert("Select an icon image first.");
        const data = await imageToDataURL(file, 512, "image/png");
        localStorage.setItem("gokulCustomAppIcon", data);
        setBrowserIcon(data);
        alert("Browser icon updated. Android home-screen icon may need a manifest update.");
      } catch (error) {
        alert(error.message);
      }
    };

    // Reapply saved browser icon after page reload.
    const savedIcon = localStorage.getItem("gokulCustomAppIcon");
    if (savedIcon) setBrowserIcon(savedIcon);

    $("gh-backup").onclick = backupAll;
    $("gh-restore").onclick = () => safeRestore(
      $("gh-restore-file").files[0]
    );

    $("gh-storage").onclick = () => {
      const count = localStorage.length;
      let chars = 0;
      for (let i = 0; i < count; i++) {
        const key = localStorage.key(i);
        chars += key.length + (localStorage.getItem(key) || "").length;
      }
      const approxKB = Math.round(chars * 2 / 1024);
      $("gh-status").textContent =
        count + " saved entries; approximately " + approxKB +
        " KB of localStorage text. This is an estimate, not a full device scan.";
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSettingsPanel);
  } else {
    addSettingsPanel();
  }
})();

/* Gokul Hub Daily Random Wallpaper */
(function () {
  "use strict";

  const ENABLE = "gokulDailyWallpaperEnabled";
  const GALLERY = "gokulDailyWallpaperGallery";
  const LASTDAY = "gokulDailyWallpaperDate";
  const CHOSEN = "gokulDailyWallpaperChosen";

  const online = [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=85"
  ];

  const readGallery = () => {
    try {
      return JSON.parse(localStorage.getItem(GALLERY) || "[]");
    } catch {
      return [];
    }
  };

  function applyImage(src) {
    const dim = localStorage.getItem("gokulWallpaperDim") || "0.5";
    document.body.style.backgroundImage =
      `linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim})),url("${src}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    localStorage.setItem(CHOSEN, src);

    if (src.startsWith("data:image/")) {
      localStorage.setItem("gokulWallpaper", src);
    }
  }

  function pick(force = false) {
    const items = [...online, ...readGallery()];
    if (!items.length) return;

    const today = new Date().toLocaleDateString("en-CA");
    const last = localStorage.getItem(LASTDAY);

    if (!force && last === today) {
      const saved = localStorage.getItem(CHOSEN);
      if (saved) applyImage(saved);
      return;
    }

    let next = items[Math.floor(Math.random() * items.length)];
    const previous = localStorage.getItem(CHOSEN);

    if (items.length > 1 && next === previous) {
      next = items[(items.indexOf(next) + 1) % items.length];
    }

    applyImage(next);
    localStorage.setItem(LASTDAY, today);
  }

  function buildPanel() {
    const settings = document.getElementById("settings-view");
    if (!settings || document.getElementById("daily-wallpaper-panel")) return;

    const panel = document.createElement("div");
    panel.id = "daily-wallpaper-panel";
    panel.className = "form-card";
    panel.innerHTML = `
      <h3>🌄 Daily Random Wallpaper</h3>
      <p>Online HD wallpapers + your own gallery photos.</p>
      <label style="display:block;margin:14px 0">
        <input id="daily-wallpaper-toggle" type="checkbox">
        Daily automatic wallpaper change
      </label>
      <input id="daily-wallpaper-files" type="file"
        accept="image/*" multiple style="max-width:100%;margin:10px 0">
      <button class="btn btn-primary" id="daily-wallpaper-save">
        Save Gallery Photos
      </button>
      <button class="btn btn-success" id="daily-wallpaper-now"
        style="margin-top:8px">🎲 Change Now</button>
      <p id="daily-wallpaper-info" style="margin-top:12px"></p>
    `;

    settings.insertBefore(panel, settings.firstChild);

    const toggle = panel.querySelector("#daily-wallpaper-toggle");
    const info = panel.querySelector("#daily-wallpaper-info");

    function status() {
      toggle.checked = localStorage.getItem(ENABLE) === "true";
      info.textContent =
        readGallery().length + " gallery photos · " +
        online.length + " online wallpapers";
    }

    toggle.onchange = () => {
      localStorage.setItem(ENABLE, String(toggle.checked));
      if (toggle.checked) pick();
    };

    panel.querySelector("#daily-wallpaper-now").onclick = () => pick(true);

    panel.querySelector("#daily-wallpaper-save").onclick = async () => {
      const files = Array.from(
        panel.querySelector("#daily-wallpaper-files").files
      );
      if (!files.length) {
        alert("First select your wallpaper photos.");
        return;
      }

      const gallery = readGallery();

      try {
        for (const file of files) {
          if (!file.type.startsWith("image/")) continue;

          const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d").drawImage(
                  img, 0, 0, canvas.width, canvas.height
                );
                resolve(canvas.toDataURL("image/jpeg", 0.7));
              };
              img.onerror = reject;
              img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          gallery.push(data);
        }

        localStorage.setItem(GALLERY, JSON.stringify(gallery));
        status();
        alert("Wallpaper gallery saved!");
      } catch (error) {
        alert("Storage full or image could not be processed. Try fewer photos.");
      }
    };

    status();
  }

  function start() {
    buildPanel();

    if (localStorage.getItem(ENABLE) === "true") {
      pick();
    }

    // Recheck on returning to the app each day.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && localStorage.getItem(ENABLE) === "true") {
        pick();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
