
        // --- 0. AUTO IMAGE COMPRESSION ENGINE ---
        function compressImage(file, maxWidth, maxHeight, quality, callback) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    let width = img.width; let height = img.height;
                    if (width > height) {
                        if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
                    } else {
                        if (height > maxHeight) { width = Math.round(width * maxHeight / height); height = maxHeight; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    callback(dataUrl);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }

        // --- DIRECT CAMERA/GALLERY UPLOAD FUNCTION ---
        function quickUpdateProfileImage(element) {
            const file = element.files[0];
            if (file) {
                compressImage(file, 800, 800, 0.8, function(compressedData) {
                    profile.avatar = compressedData;
                    localStorage.setItem('gokulProfile', JSON.stringify(profile));
                    renderProfile();
                    localStorage.setItem('gokulAppLogo', compressedData);
                    renderAppLogo();
                    element.value = ''; 
                });
            }
        }

        // --- NEW FEATURE: DREAM GOAL TRACKER ---
        let dreamGoal = JSON.parse(localStorage.getItem('gokulDreamGoal')) || { name: "My Dream", target: 100000, saved: 0 };

        function renderDreamGoal() {
            document.getElementById('goal-title-display').innerHTML = `<i class="fas fa-star" style="color: var(--text-accent); margin-right: 6px;"></i> ${dreamGoal.name}`;
            document.getElementById('goal-saved-display').innerText = `₹${parseFloat(dreamGoal.saved).toLocaleString('en-IN')}`;
            document.getElementById('goal-target-display').innerText = `Target: ₹${parseFloat(dreamGoal.target).toLocaleString('en-IN')}`;
            
            let percent = 0;
            let pending = dreamGoal.target - dreamGoal.saved;
            if(pending < 0) pending = 0;

            if(dreamGoal.target > 0) {
                percent = (dreamGoal.saved / dreamGoal.target) * 100;
                if(percent > 100) percent = 100;
            }
            
            document.getElementById('goal-progress-bar').style.width = `${percent}%`;
            document.getElementById('goal-percent-display').innerText = `${percent.toFixed(1)}% Completed`;

            const balDisplay = document.getElementById('goal-balance-display');
            if(balDisplay) {
                if(percent >= 100) {
                    balDisplay.innerText = "Goal Reached! 🎉";
                    balDisplay.style.color = "var(--success)";
                } else {
                    balDisplay.innerText = `Pending: ₹${pending.toLocaleString('en-IN')}`;
                    balDisplay.style.color = "var(--danger)";
                }
            }
        }

        function openDreamGoalModal() {
            document.getElementById('edit-goal-name').value = dreamGoal.name;
            document.getElementById('edit-goal-target').value = dreamGoal.target;
            document.getElementById('edit-goal-saved').value = dreamGoal.saved;
            openModal('dreamGoalModal');
        }

        function saveDreamGoal() {
            let n = document.getElementById('edit-goal-name').value.trim();
            let t = parseFloat(document.getElementById('edit-goal-target').value);
            let s = parseFloat(document.getElementById('edit-goal-saved').value);
            
            if(!n || isNaN(t) || t <= 0 || isNaN(s)) return alert("Please enter valid details.");
            
            dreamGoal = { name: n, target: t, saved: s };
            localStorage.setItem('gokulDreamGoal', JSON.stringify(dreamGoal));
            renderDreamGoal();
            closeModal('dreamGoalModal');
        }

        // --- 11. IMMERSIVE FULLSCREEN ENGINE ---
        function requestAppFullScreen() {
            const doc = window.document; const docEl = doc.documentElement;
            const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
            if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                if(requestFullScreen) {
                    requestFullScreen.call(docEl).catch(err => { console.log("Fullscreen ignored by browser until user interacts further."); });
                }
            }
        }

        const initFS = () => {
            if(localStorage.getItem('gokulAutoFS') !== 'false') { requestAppFullScreen(); }
            document.removeEventListener('click', initFS); document.removeEventListener('touchstart', initFS);
        };
        document.addEventListener('click', initFS); document.addEventListener('touchstart', initFS);

        function toggleFullScreenManual() {
            const toggle = document.getElementById('fullscreen-toggle');
            if(toggle && toggle.checked) {
                localStorage.setItem('gokulAutoFS', 'true'); requestAppFullScreen();
            } else {
                localStorage.setItem('gokulAutoFS', 'false');
                const exitFS = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if(exitFS) { exitFS.call(document).catch(err => console.log(err)); }
            }
        }

        // --- DUAL MODE TOGGLE (LIGHT / DARK) ---
        function toggleDayNight() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const icon = document.getElementById('mode-icon');
            if (currentTheme === 'light') {
                const lastDark = localStorage.getItem('gokulLastDarkTheme') || 'jarvis';
                applyTheme(lastDark);
                if(icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
            } else {
                localStorage.setItem('gokulLastDarkTheme', currentTheme);
                applyTheme('light');
                if(icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
            }
        }

        // --- 3D TEXT TOGGLE ENGINE ---
        function toggle3DText() {
            const isEnabled = document.getElementById('text-3d-toggle').checked;
            localStorage.setItem('gokul3DText', isEnabled);
            if(isEnabled) { document.body.classList.add('enable-3d-text'); } 
            else { document.body.classList.remove('enable-3d-text'); }
        }

        // --- FONT TOGGLE ENGINE ---
        function syncMagnumFont() { /* Legacy portal bridge removed. */ }
        function applyFont(fontId) {
            document.documentElement.setAttribute('data-font', fontId);
            localStorage.setItem('gokulFontFamily', fontId);
            syncMagnumFont(fontId);
        }

        // --- 0.6 TEXT FADES & SHADOW COLORS ENGINE ---
        function hexToRgbStr(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
        }

        function saveTextStyles() {
            const grad1 = document.getElementById('text-grad-1').value || '#ffffff';
            const grad2 = document.getElementById('text-grad-2').value || '#f0c75e';
            const shadow = document.getElementById('shadow-color').value || '#000000';
            localStorage.setItem('gokulTextGrad1', grad1); localStorage.setItem('gokulTextGrad2', grad2); localStorage.setItem('gokulShadowColor', shadow);
            applyTextStyles(grad1, grad2, shadow);
        }

        function applyTextStyles(g1, g2, sh) {
            document.documentElement.style.setProperty('--text-grad-1', g1);
            document.documentElement.style.setProperty('--text-grad-2', g2);
            document.documentElement.style.setProperty('--shadow-rgb', hexToRgbStr(sh));
        }

        function loadTextStyles() {
            const defaultG2 = getComputedStyle(document.documentElement).getPropertyValue('--text-accent').trim() || '#f0c75e';
            const g1 = localStorage.getItem('gokulTextGrad1') || '#ffffff';
            const g2 = localStorage.getItem('gokulTextGrad2') || defaultG2;
            const sh = localStorage.getItem('gokulShadowColor') || '#000000';
            
            if (document.getElementById('text-grad-1')) document.getElementById('text-grad-1').value = g1;
            if (document.getElementById('text-grad-2')) document.getElementById('text-grad-2').value = g2;
            if (document.getElementById('shadow-color')) document.getElementById('shadow-color').value = sh;
            
            applyTextStyles(g1, g2, sh);
        }

        function resetTextStyles() {
            const defaultG2 = getComputedStyle(document.documentElement).getPropertyValue('--text-accent').trim() || '#f0c75e';
            document.getElementById('text-grad-1').value = '#ffffff';
            document.getElementById('text-grad-2').value = defaultG2;
            document.getElementById('shadow-color').value = '#000000';
            saveTextStyles();
            alert("3D Text Fades and Colors reset to Default!");
        }

        // --- 0.5 PDF SETTINGS ENGINE ---
        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [30, 41, 59];
        }

        function savePdfSettings() {
            localStorage.setItem('gokulPdfBrand', document.getElementById('pdf-brand-name').value || 'GOKUL HUB INC.');
            localStorage.setItem('gokulPdfPrimary', document.getElementById('pdf-color-primary').value || '#1e293b');
            localStorage.setItem('gokulPdfAccent', document.getElementById('pdf-color-accent').value || '#d4af37');
        }

        function loadPdfSettings() {
            const brand = localStorage.getItem('gokulPdfBrand') || 'GOKUL HUB INC.';
            const primary = localStorage.getItem('gokulPdfPrimary') || '#1e293b';
            const accent = localStorage.getItem('gokulPdfAccent') || '#d4af37';
            
            const bName = document.getElementById('pdf-brand-name');
            const pColor = document.getElementById('pdf-color-primary');
            const aColor = document.getElementById('pdf-color-accent');
            
            if(bName) bName.value = brand; if(pColor) pColor.value = primary; if(aColor) aColor.value = accent;
        }

        function resetPdfSettings() {
            document.getElementById('pdf-brand-name').value = 'GOKUL HUB INC.';
            document.getElementById('pdf-color-primary').value = '#1e293b';
            document.getElementById('pdf-color-accent').value = '#d4af37';
            savePdfSettings();
            alert("PDF Customizations reset to Default Themes!");
        }

        // --- 1. BOOT SEQUENCE & APP LOGO LOGIC ---
        let activeShift = JSON.parse(localStorage.getItem('gokulActiveShift')) || null;
        let cashbackBalance = parseFloat(localStorage.getItem('gokulCashbackBal')) || 0;
        let emiRegistry = JSON.parse(localStorage.getItem('gokulEmiRegistry')) || [];

        function renderAppLogo() {
            const logoSrc = localStorage.getItem('gokulAppLogo') || '10276.png';
            const logos = [document.getElementById('header-avatar-img'), document.getElementById('sidebar-avatar-img')]; 
            logos.forEach(img => { if(img) img.src = logoSrc; });
        }

        function applyMasterImage(type) {
            const fileInput = document.getElementById('master-image-file');
            const file = fileInput.files[0];
            if (!file) { return alert("Please select an image file first!"); }

            compressImage(file, 1920, 1920, 0.7, function(compressedData) {
                try {
                    if (type === 'wallpaper' || type === 'both') {
                        localStorage.setItem('gokulWallpaper', compressedData); applyWallpaper(compressedData);
                    }
                    if (type === 'profile' || type === 'both') {
                        profile.avatar = compressedData; localStorage.setItem('gokulProfile', JSON.stringify(profile));
                        renderProfile(); localStorage.setItem('gokulAppLogo', compressedData); renderAppLogo();
                    }
                    if(type === 'both') alert('Image successfully set as Both Profile and Wallpaper!');
                    else if(type === 'profile') alert('Image successfully set as Profile Picture!');
                    else alert('Image successfully set as Background Wallpaper!');
                } catch(e) { alert('Error: Photo is still too large even after compression.'); }
            });
        }

        function resetProfileImage() {
            localStorage.removeItem('gokulAppLogo'); profile.avatar = '10276.png';
            localStorage.setItem('gokulProfile', JSON.stringify(profile));
            renderAppLogo(); renderProfile(); alert('Profile & App Logo Reset to Default!');
        }

        function checkActiveShift() {
            const inView = document.getElementById('punch-in-view');
            const outView = document.getElementById('punch-out-view');
            const manualView = document.getElementById('manual-shift-view');
            
            if (activeShift) {
                if(inView) inView.style.display = 'none'; if(outView) outView.style.display = 'block'; if(manualView) manualView.style.display = 'none';
                const jobEl = document.getElementById('active-shift-job'); if(jobEl) jobEl.innerText = activeShift.jobType;
                
                if (!window.shiftTimerInterval) {
                    window.shiftTimerInterval = setInterval(() => {
                        if (!activeShift) return clearInterval(window.shiftTimerInterval);
                        const started = new Date(activeShift.inTimeObj); const elapsed = Math.max(0, Date.now() - started.getTime());
                        const totalSec = Math.floor(elapsed / 1000);
                        const h = String(Math.floor(totalSec / 3600)).padStart(2,'0'); const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2,'0'); const s = String(totalSec % 60).padStart(2,'0');
                        const timeEl = document.getElementById('active-shift-time'); if (timeEl) timeEl.innerText = `${h}:${m}:${s}`;
                    }, 1000);
                }
            } else {
                if(inView) inView.style.display = 'block'; if(outView) outView.style.display = 'none';
                if (window.shiftTimerInterval) clearInterval(window.shiftTimerInterval);
            }
        }

        function toggleManualShift() {
            const inView = document.getElementById('punch-in-view'); const manualView = document.getElementById('manual-shift-view');
            if (manualView && manualView.style.display === 'none') {
                if(inView) inView.style.display = 'none'; manualView.style.display = 'flex';
            } else {
                if(manualView) manualView.style.display = 'none'; if(inView) inView.style.display = 'block';
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            renderAppLogo(); 
            try { loadPdfSettings(); } catch(e) {}
            try { loadTextStyles(); } catch(e) {}

            const savedFont = localStorage.getItem('gokulFontFamily') || 'default'; applyFont(savedFont);

            const is3DEnabled = localStorage.getItem('gokul3DText') !== 'false'; 
            if (document.getElementById('text-3d-toggle')) { document.getElementById('text-3d-toggle').checked = is3DEnabled; }
            if (is3DEnabled) { document.body.classList.add('enable-3d-text'); }

            if(document.getElementById('fullscreen-toggle')) { document.getElementById('fullscreen-toggle').checked = localStorage.getItem('gokulAutoFS') !== 'false'; }

            const isAuto = localStorage.getItem('gokulAutoTheme') === 'true';
            if (document.getElementById('auto-theme-toggle')) { document.getElementById('auto-theme-toggle').checked = isAuto; }
            if(isAuto) { autoThemeSwitcher(); } else { try { applyTheme(localStorage.getItem('gokulTheme') || 'jarvis'); } catch(e) {} }

            const savedWallpaper = localStorage.getItem('gokulWallpaper');
            if(savedWallpaper) { applyWallpaper(savedWallpaper); }

            const savedAlpha = localStorage.getItem('gokulGlassAlpha');
            if (savedAlpha) {
                document.documentElement.style.setProperty('--glass-alpha', savedAlpha);
                const opSlider = document.getElementById('opacity-slider'); if (opSlider) opSlider.value = savedAlpha;
            }

            const savedCardAlpha = localStorage.getItem('gokulCardAlpha');
            if (savedCardAlpha) {
                document.documentElement.style.setProperty('--card-alpha', savedCardAlpha);
                const cSlider = document.getElementById('card-opacity-slider'); if (cSlider) cSlider.value = savedCardAlpha;
            }
            
            const savedBlur = localStorage.getItem('gokulBgBlur');
            if (savedBlur !== null) {
                document.documentElement.style.setProperty('--bg-blur', savedBlur + 'px');
                const bSlider = document.getElementById('blur-slider'); if (bSlider) bSlider.value = savedBlur;
            }

            try { startLiveClock(); } catch(e) {} try { renderProfile(); } catch(e) {} try { updateVaultStats(); } catch(e) {}
            try { renderJobDropdown(); } catch(e) {} try { checkActiveShift(); } catch(e) {} try { updateShiftStats(); } catch(e) {}
            try { renderThemeGallery(); } catch(e) {} try { updateCashbackStats(); } catch(e) {}
            try { renderDreamGoal(); } catch(e) {} // Initial render for Dream Goal
            
            try { renderEmiRegistry(); } catch(e) {}
            
            if (document.getElementById('auto-pdf-toggle')) { document.getElementById('auto-pdf-toggle').checked = localStorage.getItem('gokulAutoPdf') === 'true'; }
            try { checkAutoPdfDownload(); } catch(e) {}

            navTo('vault-dashboard'); 
        });

        window.updateBgBlur = function(val) {
            document.documentElement.style.setProperty('--bg-blur', val + 'px'); localStorage.setItem('gokulBgBlur', val);
        }
        window.updateGlassOpacity = function(val) {
            document.documentElement.style.setProperty('--glass-alpha', val); localStorage.setItem('gokulGlassAlpha', val);
        }
        window.updateCardOpacity = function(val) {
            document.documentElement.style.setProperty('--card-alpha', val); localStorage.setItem('gokulCardAlpha', val);
        }

        function applyWallpaper(bgData) {
            if(bgData) {
                let dim = localStorage.getItem('gokulWallpaperDim') || '0.5';
                document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,${dim}), rgba(0,0,0,${dim})), url('${bgData}')`;
                document.body.style.backgroundPosition = 'center center'; document.body.style.backgroundRepeat = 'no-repeat';
                document.body.style.backgroundSize = 'cover'; document.body.style.backgroundAttachment = 'fixed'; document.body.style.animation = 'none';
                const slider = document.getElementById('wallpaper-dimmer-slider'); if(slider) slider.value = dim;
            }
        }

        window.updateWallpaperDimmer = function(val) {
            localStorage.setItem('gokulWallpaperDim', val);
            const bgData = localStorage.getItem('gokulWallpaper');
            if(bgData) { document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,${val}), rgba(0,0,0,${val})), url('${bgData}')`; }
        }

        function removeWallpaper() {
            localStorage.removeItem('gokulWallpaper');
            document.body.style.backgroundImage = ''; document.body.style.backgroundPosition = ''; document.body.style.backgroundRepeat = '';
            document.body.style.backgroundSize = ''; document.body.style.backgroundAttachment = ''; document.body.style.animation = '';
            
            const isAuto = localStorage.getItem('gokulAutoTheme') === 'true';
            if (isAuto) { autoThemeSwitcher(); } else { applyTheme(localStorage.getItem('gokulTheme') || 'jarvis'); }
            alert('Wallpaper removed! Themes activated.');
        }

        // --- 2. LIVE CLOCK & AUTO THEME ENGINE ---
        function startLiveClock() {
            setInterval(() => {
                const now = new Date();
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                const dayName = days[now.getDay()]; const day = String(now.getDate()).padStart(2, '0');
                const month = months[now.getMonth()]; const year = now.getFullYear();
                const hours = String(now.getHours()).padStart(2, '0'); const minutes = String(now.getMinutes()).padStart(2, '0'); const seconds = String(now.getSeconds()).padStart(2, '0');
                const timeStr = `${dayName}, ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
                const clock1 = document.getElementById('live-clock'); if (clock1) clock1.innerText = timeStr;
            }, 1000);
        }

        function toggleAutoTheme() {
            const isAuto = document.getElementById('auto-theme-toggle').checked;
            localStorage.setItem('gokulAutoTheme', isAuto);
            if(isAuto) { autoThemeSwitcher(); alert("Auto-Theme Activated! It will change themes based on the time."); }
        }

        function autoThemeSwitcher() {
            if(localStorage.getItem('gokulAutoTheme') === 'true') {
                const hour = new Date().getHours(); let newTheme = 'jarvis';
                if (hour >= 6 && hour < 12) newTheme = 'sapphire'; else if (hour >= 12 && hour < 18) newTheme = 'platinum'; else newTheme = 'obsidian'; 
                if (document.documentElement.getAttribute('data-theme') !== newTheme) { document.documentElement.setAttribute('data-theme', newTheme); }
            }
        }
        setInterval(autoThemeSwitcher, 60000);

        // --- 3. NAVIGATION CONTROLLER ---
        function navTo(panelId) {
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar .btn').forEach(b => b.classList.remove('active'));
            const targetPanel = document.getElementById(`${panelId}-view`); if (targetPanel) targetPanel.classList.add('active');
            const desktopBtn = document.getElementById(`dnav-${panelId}`); if (desktopBtn) desktopBtn.classList.add('active');
            const tabMap = { 'vault-dashboard': 'tab-vault', 'attendance': 'tab-att', 'emi-dashboard': 'tab-emi', 'history': 'tab-history', 'settings': 'tab-settings' };
            if (tabMap[panelId]) { const mobileTab = document.getElementById(tabMap[panelId]); if (mobileTab) mobileTab.classList.add('active'); }
        }

        function openModal(id) { document.getElementById(id).classList.add('active'); }
        function closeModal(id) { document.getElementById(id).classList.remove('active'); }
        function openMenuSheet() { openModal('menuSheetModal'); }

        // --- 4. PROFILE CONTROLLER ---
        let profile = JSON.parse(localStorage.getItem('gokulProfile')) || { name: "GOKUL", role: "Influencer & Petrol Bunk Worker", idStr: "TVGR", height: "5'4\"", avatar: "10276.png" };
        if (!profile.avatar) profile.avatar = "10276.png";

        function renderProfile() {
            const nameEl = document.getElementById('prof-name'); if(nameEl) nameEl.innerText = profile.name.toUpperCase();
            const roleEl = document.getElementById('prof-role'); if(roleEl) roleEl.innerText = profile.role;
            const idEl = document.getElementById('prof-id'); if(idEl) idEl.innerText = profile.idStr;
            const htEl = document.getElementById('prof-ht'); if(htEl) htEl.innerText = profile.height;
            const avatars = [document.getElementById('vault-avatar-img')]; avatars.forEach(av => { if (av) av.src = profile.avatar; });
        }

        function openProfileModal() {
            document.getElementById('m-prof-name').value = profile.name; document.getElementById('m-prof-role').value = profile.role;
            document.getElementById('m-prof-id').value = profile.idStr; document.getElementById('m-prof-ht').value = profile.height;
            document.getElementById('m-prof-avatar').value = profile.avatar.startsWith('data:') ? '' : profile.avatar;
            openModal('profileModal');
        }

        function encodeImageFileAsURL(element) {
            const file = element.files[0];
            if (file) { compressImage(file, 512, 512, 0.8, function(compressedData) { document.getElementById('m-prof-avatar').value = compressedData; }); }
        }

        function saveProfileData() {
            profile.name = document.getElementById('m-prof-name').value.trim() || 'Gokul';
            profile.role = document.getElementById('m-prof-role').value.trim(); profile.idStr = document.getElementById('m-prof-id').value.trim();
            profile.height = document.getElementById('m-prof-ht').value.trim();
            const av = document.getElementById('m-prof-avatar').value.trim(); if (av) profile.avatar = av;
            localStorage.setItem('gokulProfile', JSON.stringify(profile)); renderProfile(); closeModal('profileModal');
        }

        // --- 5. VAULT & TRANSACTIONS ---
        let transactions = JSON.parse(localStorage.getItem('gokulVaultTx')) || [];

        function addEmoji(emojiText) {
            const noteInput = document.getElementById('quick-tx-note');
            if(noteInput.value) noteInput.value = noteInput.value + ' ' + emojiText; else noteInput.value = emojiText; noteInput.focus();
        }

        function saveQuickTx(type) {
            const amount = parseFloat(document.getElementById('quick-tx-amount').value);
            let note = document.getElementById('quick-tx-note').value.trim();
            if (isNaN(amount) || amount <= 0) return alert("Enter amount.");

            if (type === 'cashback') {
                note = note || 'Cashback Reward 🎁'; cashbackBalance += amount; localStorage.setItem('gokulCashbackBal', cashbackBalance);
                updateCashbackStats(); document.getElementById('quick-tx-amount').value = ''; document.getElementById('quick-tx-note').value = '';
                alert(`₹${amount.toFixed(2)} added to Cashback Wallet!`); return;
            }

            note = note || (type === 'expense' ? 'Spending' : 'Income');
            transactions.push({ date: new Date().toLocaleString('en-GB'), category: note, type: type, amount: amount });
            localStorage.setItem('gokulVaultTx', JSON.stringify(transactions)); updateVaultStats();
            
            // --- NEW: AUTO LINK TO DREAM GOAL ---
            if (type === 'income') {
                dreamGoal.saved += amount;
                localStorage.setItem('gokulDreamGoal', JSON.stringify(dreamGoal));
                renderDreamGoal();
            }

            document.getElementById('quick-tx-amount').value = ''; document.getElementById('quick-tx-note').value = '';
            
            if (type === 'income') { alert(`₹${amount.toFixed(2)} added to Savings & Dream Goal!`); }
        }

        let currentEditTxIdx = -1;
        function openEditTxModal(idx) {
            currentEditTxIdx = idx; let tx = transactions[idx];
            document.getElementById('edit-tx-date').value = tx.date; document.getElementById('edit-tx-note').value = tx.category;
            document.getElementById('edit-tx-amount').value = tx.amount; document.getElementById('edit-tx-flow').value = tx.type; openModal('editTxModal');
        }

        function saveEditedTx() {
            if (currentEditTxIdx === -1) return;
            let tx = transactions[currentEditTxIdx];
            
            let newDate = document.getElementById('edit-tx-date').value || tx.date; 
            let newCategory = document.getElementById('edit-tx-note').value || tx.category;
            let newAmount = parseFloat(document.getElementById('edit-tx-amount').value) || tx.amount; 
            let newType = document.getElementById('edit-tx-flow').value || tx.type;
            
            // --- NEW: SYNC EDITS TO DREAM GOAL ---
            if(tx.type === 'income' && newType === 'income') {
                dreamGoal.saved = dreamGoal.saved - tx.amount + newAmount;
                if(dreamGoal.saved < 0) dreamGoal.saved = 0;
            } else if (tx.type === 'income' && newType !== 'income') {
                dreamGoal.saved -= tx.amount;
                if(dreamGoal.saved < 0) dreamGoal.saved = 0;
            } else if (tx.type !== 'income' && newType === 'income') {
                dreamGoal.saved += newAmount;
            }

            tx.date = newDate; 
            tx.category = newCategory;
            tx.amount = newAmount; 
            tx.type = newType;
            
            localStorage.setItem('gokulVaultTx', JSON.stringify(transactions)); 
            localStorage.setItem('gokulDreamGoal', JSON.stringify(dreamGoal));
            
            updateVaultStats(); 
            renderDreamGoal();
            closeModal('editTxModal'); 
            alert("Transaction Updated & Dream Goal Synced!");
        }

        function redeemCashback() {
            if (cashbackBalance <= 0) return alert("No cashback available to redeem.");
            if (confirm(`Redeem ₹${cashbackBalance.toFixed(2)} to your main Savings?`)) {
                transactions.push({ date: new Date().toLocaleString('en-GB'), category: "Cashback Redeemed 🎁", type: 'income', amount: cashbackBalance });
                localStorage.setItem('gokulVaultTx', JSON.stringify(transactions)); 
                
                // --- NEW: AUTO LINK TO DREAM GOAL ---
                dreamGoal.saved += cashbackBalance;
                localStorage.setItem('gokulDreamGoal', JSON.stringify(dreamGoal));
                renderDreamGoal();

                cashbackBalance = 0; localStorage.setItem('gokulCashbackBal', 0);
                updateVaultStats(); updateCashbackStats(); alert("Cashback successfully added to Savings & Dream Goal!");
            }
        }

        function updateCashbackStats() { const cbEl = document.getElementById('cashback-balance'); if (cbEl) cbEl.innerText = `₹${cashbackBalance.toFixed(2)}`; }

        function deleteLedgerTx(idx) {
            if (confirm("Delete this transaction? Your Savings balance will update.")) { 
                let deletedTx = transactions[idx];
                transactions.splice(idx, 1); 
                localStorage.setItem('gokulVaultTx', JSON.stringify(transactions)); 
                
                // --- NEW: SYNC DELETE TO DREAM GOAL ---
                if (deletedTx.type === 'income') {
                    dreamGoal.saved -= deletedTx.amount;
                    if(dreamGoal.saved < 0) dreamGoal.saved = 0;
                    localStorage.setItem('gokulDreamGoal', JSON.stringify(dreamGoal));
                    renderDreamGoal();
                }

                updateVaultStats(); 
            }
        }

        function updateVaultStats() {
            let inc = 0; let exp = 0;
            transactions.forEach(t => { if (t.type === 'income') inc += (Number(t.amount) || 0); if (t.type === 'expense') exp += (Number(t.amount) || 0); });
            const bal = inc - exp;

            const balEl = document.getElementById('total-balance'); if(balEl) balEl.innerText = `₹${bal.toFixed(2)}`;
            const inEl = document.getElementById('total-in'); if(inEl) inEl.innerText = `+₹${inc.toFixed(2)}`;
            const outEl = document.getElementById('total-out'); if(outEl) outEl.innerText = `-₹${exp.toFixed(2)}`;
            
            const tbody = document.getElementById('ledger-table-body');
            if(tbody) {
                let rowsHtml = '';
                [...transactions].reverse().forEach((t, revIdx) => {
                    const actualIdx = transactions.length - 1 - revIdx; const isInc = t.type === 'income';
                    const dateText = t.date ? String(t.date).split(',')[0] : ''; const catText = t.category ? String(t.category) : ''; const amtText = Number(t.amount) || 0;
                    rowsHtml += `<tr>
                        <td style="font-size: 11px;">${dateText}</td><td style="font-weight: 700; text-align: left;">${catText}</td>
                        <td style="text-transform: capitalize; color: ${isInc ? 'var(--text-accent)' : 'var(--danger)'}">${t.type}</td>
                        <td style="font-weight: 700; color: ${isInc ? 'var(--text-accent)' : 'var(--danger)'}">${isInc ? '+' : '-'}₹${amtText.toFixed(2)}</td>
                        <td>
                            <div style="display: flex; gap: 8px; justify-content: center;">
                                <button class="btn btn-primary" style="padding: 6px 10px; font-size: 12px; margin: 0; width: auto;" onclick="openEditTxModal(${actualIdx})"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-danger" style="padding: 6px 10px; font-size: 12px; margin: 0; width: auto;" onclick="deleteLedgerTx(${actualIdx})"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = rowsHtml;
            }
        }

        // --- 5.2 EMI REGISTRY & TRACKING ---
        function autoCalcEmiEndDate() {
            let startVal = document.getElementById('emi-reg-start').value; let monthsVal = parseInt(document.getElementById('emi-reg-months').value);
            if(startVal && !isNaN(monthsVal) && monthsVal > 0) {
                let d = new Date(startVal); d.setMonth(d.getMonth() + monthsVal); document.getElementById('emi-reg-end').value = d.toISOString().split('T')[0];
            }
        }

        function liveCalcEmiReg() {
            let p = parseFloat(document.getElementById('emi-reg-principal').value); let r = parseFloat(document.getElementById('emi-reg-rate').value); let n = parseInt(document.getElementById('emi-reg-months').value);
            autoCalcEmiEndDate();
            if (p > 0 && r >= 0 && n > 0) {
                let monthlyRate = r / 12 / 100; let emi = 0;
                if (monthlyRate === 0) { emi = p / n; } else { emi = p * monthlyRate * (Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1); }
                let totalAmount = emi * n; let totalInterest = totalAmount - p;
                document.getElementById('reg-live-emi').innerText = '₹' + emi.toFixed(2); document.getElementById('reg-live-int').innerText = '₹' + totalInterest.toFixed(2); document.getElementById('reg-live-total').innerText = '₹' + totalAmount.toFixed(2);
            } else {
                document.getElementById('reg-live-emi').innerText = '₹0.00'; document.getElementById('reg-live-int').innerText = '₹0.00'; document.getElementById('reg-live-total').innerText = '₹0.00';
            }
        }

        function registerNewEmi() {
            let name = document.getElementById('emi-reg-name').value.trim(); let p = parseFloat(document.getElementById('emi-reg-principal').value); let r = parseFloat(document.getElementById('emi-reg-rate').value); let n = parseInt(document.getElementById('emi-reg-months').value); let startInput = document.getElementById('emi-reg-start').value; let endInput = document.getElementById('emi-reg-end').value; let payDateInput = parseInt(document.getElementById('emi-reg-paydate').value);

            if (!name || isNaN(p) || p <= 0 || isNaN(r) || r < 0 || isNaN(n) || n <= 0) { return alert("Please fill all valid details to register an EMI."); }

            let monthlyRate = r / 12 / 100; let emi = 0;
            if (monthlyRate === 0) { emi = p / n; } else { emi = p * monthlyRate * (Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1); }
            let totalAmount = emi * n; let totalInterest = totalAmount - p;
            let startDateStr = startInput ? new Date(startInput).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
            let endDateStr = endInput ? new Date(endInput).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : "N/A";
            let payDateStr = (!isNaN(payDateInput) && payDateInput > 0 && payDateInput <= 31) ? payDateInput : "N/A";

            let newLoan = { id: Date.now(), name: name, principal: p, rate: r, totalMonths: n, paidMonths: 0, monthlyEmi: emi, totalInterest: totalInterest, totalPayable: totalAmount, startDate: startDateStr, endDate: endDateStr, autoPayDate: payDateStr };
            emiRegistry.push(newLoan); localStorage.setItem('gokulEmiRegistry', JSON.stringify(emiRegistry));
            
            document.getElementById('emi-reg-name').value = ''; document.getElementById('emi-reg-principal').value = ''; document.getElementById('emi-reg-rate').value = ''; document.getElementById('emi-reg-months').value = ''; document.getElementById('emi-reg-start').value = ''; document.getElementById('emi-reg-end').value = ''; document.getElementById('emi-reg-paydate').value = '';
            document.getElementById('reg-live-emi').innerText = '₹0.00'; document.getElementById('reg-live-int').innerText = '₹0.00'; document.getElementById('reg-live-total').innerText = '₹0.00';
            renderEmiRegistry(); alert(`Loan '${name}' Registered successfully!`);
        }

        let currentEditEmiId = -1;
        function openEditEmiModal(id) {
            currentEditEmiId = id; let loan = emiRegistry.find(l => l.id === id);
            document.getElementById('edit-emi-name').value = loan.name; document.getElementById('edit-emi-p').value = loan.principal; document.getElementById('edit-emi-r').value = loan.rate;
            document.getElementById('edit-emi-m').value = loan.totalMonths; document.getElementById('edit-emi-paid').value = loan.paidMonths; document.getElementById('edit-emi-start').value = loan.startDate;
            document.getElementById('edit-emi-paydate').value = loan.autoPayDate === "N/A" ? "" : loan.autoPayDate; document.getElementById('edit-emi-id').value = id; openModal('editEmiModal');
        }

        function saveEditedEmi() {
            let idToEdit = parseInt(document.getElementById('edit-emi-id').value); let lIndex = emiRegistry.findIndex(l => l.id === idToEdit); if(lIndex === -1) return closeModal('editEmiModal');
            let name = document.getElementById('edit-emi-name').value.trim(); let p = parseFloat(document.getElementById('edit-emi-p').value); let r = parseFloat(document.getElementById('edit-emi-r').value);
            let n = parseInt(document.getElementById('edit-emi-m').value); let paid = parseInt(document.getElementById('edit-emi-paid').value); let start = document.getElementById('edit-emi-start').value; let payDate = document.getElementById('edit-emi-paydate').value;

            if (!name || isNaN(p) || p <= 0 || isNaN(r) || r < 0 || isNaN(n) || n <= 0 || isNaN(paid) || paid < 0) { return alert("Please fill all valid numeric details to save."); }
            if(paid > n) paid = n;

            let monthlyRate = r / 12 / 100; let emi = 0;
            if (monthlyRate === 0) { emi = p / n; } else { emi = p * monthlyRate * (Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1); }
            let totalAmount = emi * n; let totalInterest = totalAmount - p;

            let loan = emiRegistry[lIndex]; loan.name = name; loan.principal = p; loan.rate = r; loan.totalMonths = n; loan.paidMonths = paid; loan.monthlyEmi = emi; loan.totalInterest = totalInterest; loan.totalPayable = totalAmount; loan.startDate = start; loan.autoPayDate = payDate ? payDate : "N/A";

            let endDateStr = "N/A";
            try {
                let parts = start.includes('/') ? start.split('/') : start.split('-'); let d = null;
                if(start.includes('/')) d = new Date(parts[2], parts[1]-1, parts[0]); else d = new Date(start);
                if(!isNaN(d.getTime())) { d.setMonth(d.getMonth() + n); endDateStr = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}); }
            } catch(e){}
            loan.endDate = endDateStr; emiRegistry[lIndex] = loan; localStorage.setItem('gokulEmiRegistry', JSON.stringify(emiRegistry)); renderEmiRegistry(); closeModal('editEmiModal'); alert("EMI details updated successfully!");
        }

        function markEmiPaid(loanId) {
            let loanIndex = emiRegistry.findIndex(l => l.id === loanId);
            if(loanIndex > -1) {
                let loan = emiRegistry[loanIndex]; let pending = loan.totalMonths - loan.paidMonths; let monthInput = document.getElementById(`pay-months-${loan.id}`); let monthsToPay = monthInput ? parseInt(monthInput.value) : 1;
                if (isNaN(monthsToPay) || monthsToPay <= 0) { return alert("Please enter a valid number of months."); } if (monthsToPay > pending) { return alert(`You only have ${pending} months pending!`); }
                let totalPayment = loan.monthlyEmi * monthsToPay;
                if (loan.paidMonths < loan.totalMonths) {
                    if(confirm(`Mark ${monthsToPay} month(s) EMI (₹${totalPayment.toFixed(2)}) as Paid for ${loan.name}?\n\n(Note: This is tracked separately and will NOT deduct from your Savings balance)`)) {
                        loan.paidMonths += monthsToPay; emiRegistry[loanIndex] = loan; localStorage.setItem('gokulEmiRegistry', JSON.stringify(emiRegistry)); renderEmiRegistry(); alert(`EMI marked as Paid! Pending months: ${loan.totalMonths - loan.paidMonths}`);
                    }
                } else { alert("This loan is already fully paid!"); }
            }
        }

        function deleteEmi(loanId) {
            if(confirm("Are you sure you want to delete this loan record permanently?")) {
                emiRegistry = emiRegistry.filter(l => l.id !== loanId); localStorage.setItem('gokulEmiRegistry', JSON.stringify(emiRegistry)); renderEmiRegistry();
            }
        }

        function renderEmiRegistry() {
            const listEl = document.getElementById('emi-registry-list'); if(!listEl) return;
            if(emiRegistry.length === 0) { listEl.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 14px; padding: 20px;">No Active Loans. Register one above.</div>`; return; }

            let html = '';
            emiRegistry.forEach(loan => {
                let pending = loan.totalMonths - loan.paidMonths; let progressPercent = (loan.paidMonths / loan.totalMonths) * 100; let isCompleted = pending === 0; let pendingAmount = loan.totalPayable - (loan.monthlyEmi * loan.paidMonths); if(pendingAmount < 0) pendingAmount = 0;
                html += `
                <div class="emi-card" style="padding: 24px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-highlight); padding-bottom: 12px; margin-bottom: 18px;">
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-main); font-family: var(--font-heading);">${loan.name}</div>
                        <div style="display: flex; gap: 12px;">
                            <button style="background:transparent; border:none; color: var(--text-accent); font-size: 18px; cursor: pointer;" onclick="openEditEmiModal(${loan.id})"><i class="fas fa-edit"></i></button>
                            <button style="background:transparent; border:none; color: var(--danger); font-size: 18px; cursor: pointer;" onclick="deleteEmi(${loan.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;"><span style="color: var(--text-muted);">EMI / Month:</span><span style="font-weight: 800; color: var(--text-accent);">₹${loan.monthlyEmi.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;"><span style="color: var(--text-muted);">Total Borrowed:</span><span style="font-weight: 800; color: var(--text-main);">₹${loan.principal.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;"><span style="color: var(--text-muted);">Start Date:</span><span style="font-weight: 800; color: var(--text-main);">${loan.startDate}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;"><span style="color: var(--text-muted);">End Date (Payoff):</span><span style="font-weight: 800; color: ${isCompleted ? 'var(--success)' : 'var(--text-main)'};">${loan.endDate}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;"><span style="color: var(--text-muted);">Auto Pay Date:</span><span style="font-weight: 800; color: var(--text-accent);">${loan.autoPayDate !== "N/A" ? 'Day ' + loan.autoPayDate + ' of every month' : 'Not Set'}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 14px;"><span style="color: var(--text-muted);">Pending Amount:</span><span style="font-weight: 800; color: var(--danger); font-size: 18px;">₹${pendingAmount.toFixed(2)}</span></div>
                    <div style="background: rgba(0,0,0,0.5); height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 10px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);"><div style="height: 100%; width: ${progressPercent}%; background: var(--success); transition: width 0.4s ease;"></div></div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 20px;"><span>Paid: ${loan.paidMonths}M</span><span>Pending: ${pending}M</span></div>
                    ${isCompleted ? 
                        `<div style="text-align: center; color: var(--success); font-weight: 900; padding: 14px; border: 2px dashed var(--success); border-radius: 12px; background: rgba(46, 213, 115, 0.1);"><i class="fas fa-check-circle"></i> LOAN CLEARED</div>` : 
                        `<div style="display: flex; gap: 14px; align-items: stretch;">
                            <input type="number" id="pay-months-${loan.id}" class="form-control" style="width: 90px; padding: 12px; text-align: center; font-weight: 900; font-size: 18px !important;" value="1" min="1" max="${pending}">
                            <button class="btn btn-success" style="padding: 14px; font-size: 14px; flex: 1; margin: 0;" onclick="markEmiPaid(${loan.id})"><i class="fas fa-hand-holding-usd"></i> Pay EMI</button>
                        </div>`
                    }
                </div>`;
            });
            listEl.innerHTML = html;
        }

        function downloadMasterEmiReport() {
            if(emiRegistry.length === 0) return alert("No active loans to generate report!");
            const brandName = localStorage.getItem('gokulPdfBrand') || 'GOKUL HUB INC.'; const primaryColor = hexToRgb(localStorage.getItem('gokulPdfPrimary') || '#1e293b'); const accentColor = hexToRgb(localStorage.getItem('gokulPdfAccent') || '#d4af37');
            const { jsPDF } = window.jspdf; const pageHeight = Math.max(297, 140 + (emiRegistry.length * 15)); const doc = new jsPDF('p', 'mm', [210, pageHeight]);
            const darkText = [40, 40, 40]; const lightText = [100, 100, 100];

            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
            try { if (profile.avatar && profile.avatar.startsWith('data:image')) doc.addImage(profile.avatar, 'JPEG', 14, 10, 20, 20); } catch(e) {}
            const textStartX = profile.avatar && profile.avatar.startsWith('data:image') ? 38 : 14; doc.text(brandName, textStartX, 20); doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("MASTER EMI TRACKING REPORT", textStartX, 30);
            
            const now = new Date(); doc.setFontSize(10); doc.text(`Date: ${now.toLocaleDateString()}`, 160, 25);
            doc.setTextColor(darkText[0], darkText[1], darkText[2]); doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("ACCOUNT HOLDER DETAILS", 14, 50); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Name: ${profile.name}`, 14, 58); doc.text(`ID: ${profile.idStr}`, 14, 64);
            
            let overallBorrowed = 0; let overallPayable = 0; let overallMonthlyEmi = 0; let activeLoans = 0;
            emiRegistry.forEach(l => { overallBorrowed += l.principal; overallPayable += l.totalPayable; if(l.paidMonths < l.totalMonths) { overallMonthlyEmi += l.monthlyEmi; activeLoans++; } });

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.setLineWidth(0.5); doc.roundedRect(120, 45, 75, 38, 3, 3, 'S'); doc.setFont("helvetica", "bold"); doc.text("OVERALL SUMMARY", 125, 52); doc.setFont("helvetica", "normal"); doc.text(`Active Loans: ${activeLoans}`, 125, 60); doc.text(`Total Borrowed: INR ${overallBorrowed.toFixed(2)}`, 125, 66); doc.text(`Comb. Monthly EMI: INR ${overallMonthlyEmi.toFixed(2)}`, 125, 72); doc.setFont("helvetica", "bold"); doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]); doc.text(`Total Payable: INR ${overallPayable.toFixed(2)}`, 125, 78);
            
            let tableRows = []; emiRegistry.forEach(loan => { tableRows.push([ loan.name, `Rs. ${loan.principal.toFixed(2)}`, `Rs. ${loan.monthlyEmi.toFixed(2)}`, loan.autoPayDate !== "N/A" ? `Day ${loan.autoPayDate}` : "-", `${loan.paidMonths} / ${loan.totalMonths}`, loan.endDate ]); });
            
            doc.autoTable({ startY: 95, head: [["Loan Name", "Borrowed", "EMI/Month", "Pay Date", "Paid/Total", "End Date"]], body: tableRows, theme: 'striped', headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' }, bodyStyles: { textColor: darkText, halign: 'center' }, alternateRowStyles: { fillColor: [240, 244, 248] }, styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 }, columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }, margin: { left: 14, right: 14 } });
            
            const finalY = doc.lastAutoTable.finalY || 95; doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkText[0], darkText[1], darkText[2]); doc.text("AUTHORIZED SIGNATURE", 14, finalY + 30); doc.setLineWidth(0.5); doc.line(14, finalY + 25, 70, finalY + 25); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(lightText[0], lightText[1], lightText[2]); doc.text(`System Generated Report - ${brandName}`, 14, finalY + 45);
            doc.save(`Gokul_Master_EMI_Report_${Date.now()}.pdf`);
        }

        // --- SAVINGS RESET ONLY ---
        function resetVaultOnly() {
            if (confirm("Are you sure you want to completely reset your Savings Dashboard? All transaction history, EMI registry, and balance will be deleted. Attendance and Work data will remain safe.")) {
                transactions = []; localStorage.setItem('gokulVaultTx', JSON.stringify(transactions)); 
                cashbackBalance = 0; localStorage.setItem('gokulCashbackBal', 0); 

                emiRegistry = []; localStorage.setItem('gokulEmiRegistry', JSON.stringify(emiRegistry));
                
                dreamGoal.saved = 0; localStorage.setItem('gokulDreamGoal', JSON.stringify(dreamGoal));

                updateVaultStats(); updateCashbackStats(); renderEmiRegistry(); renderDreamGoal();
                alert("Savings Dashboard has been successfully reset."); navTo('vault-dashboard');
            }
        }

        // --- 6. WORK ENGINE (LIVE PUNCH & DEDUCTIONS) ---
        let shifts = JSON.parse(localStorage.getItem('gokulAttRecords')) || [];
        let jobProfiles = JSON.parse(localStorage.getItem('gokulJobProfiles')) || ["Petrol Bunk Worker", "Content Creator"];

        let currentEditShiftIdx = -1;
        function openEditShiftModal(idx) {
            currentEditShiftIdx = idx; let s = shifts[idx];
            document.getElementById('edit-shift-date').value = s.date; document.getElementById('edit-shift-job').value = s.jobType;
            document.getElementById('edit-shift-hrs').value = s.net || 0; document.getElementById('edit-shift-ot').value = s.otHours || 0;
            openModal('editShiftModal');
        }

        function saveEditedShift() {
            if (currentEditShiftIdx === -1) return; let s = shifts[currentEditShiftIdx];
            s.date = document.getElementById('edit-shift-date').value || s.date;
            s.jobType = document.getElementById('edit-shift-job').value || s.jobType;
            s.net = parseFloat(document.getElementById('edit-shift-hrs').value) || s.net;
            s.otHours = parseFloat(document.getElementById('edit-shift-ot').value) || s.otHours;
            localStorage.setItem('gokulAttRecords', JSON.stringify(shifts)); updateShiftStats(); closeModal('editShiftModal'); alert("Shift Updated!");
        }

        function renderJobDropdown() { const select = document.getElementById('att-job-select'); if(select) select.innerHTML = jobProfiles.map(j => `<option value="${j}">${j}</option>`).join(''); }

        function openJobModal() {
            const list = document.getElementById('job-profile-list');
            if(list) { list.innerHTML = jobProfiles.map((j, i) => `<div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 10px; border-radius: 8px;"><span style="font-weight: 700;">${j}</span><button class="btn btn-danger" style="padding: 4px 8px;" onclick="removeJobProfile(${i})"><i class="fas fa-trash"></i></button></div>`).join(''); }
            openModal('jobModal');
        }

        function createJobProfile() { const val = document.getElementById('new-job-input').value.trim(); if (val) { jobProfiles.push(val); localStorage.setItem('gokulJobProfiles', JSON.stringify(jobProfiles)); document.getElementById('new-job-input').value = ''; openJobModal(); renderJobDropdown(); } }
        function removeJobProfile(i) { jobProfiles.splice(i, 1); localStorage.setItem('gokulJobProfiles', JSON.stringify(jobProfiles)); openJobModal(); renderJobDropdown(); }

        document.getElementById('att-date').valueAsDate = new Date();
async function punchIn() {
            const jobType = document.getElementById('att-job-select').value;
            const isFullOT = !!document.getElementById('live-full-ot')?.checked;
            const now = new Date();
            const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
            if (activeShift) return alert("A shift is already active.");
            if (shifts.some(s => s.date === dateStr)) return alert("A shift is already completed for today.");
            activeShift = { date: dateStr, jobType, isFullOT, inTimeObj: now.getTime() };
            localStorage.setItem('gokulActiveShift', JSON.stringify(activeShift));
            if (window.GHAuth && typeof window.GHAuth.adminPunch === 'function') {
                try { await window.GHAuth.adminPunch('in', now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', hour12:false})); }
                catch (e) { console.error('Admin attendance sync failed:', e); alert('Work punch saved locally, but shared staff attendance sync failed: ' + (e.message || e)); }
            }
            checkActiveShift();
        }

        async function punchOut() {
            if (!activeShift) return;
            const now = new Date(), start = new Date(activeShift.inTimeObj);
            const elapsed = Math.max(0, (now-start)/3600000);
            const net = Math.max(0, elapsed - (elapsed > 4 ? 0.5 : 0));
            const fullOT = start.getDay() === 0 || activeShift.isFullOT;
            const otHours = fullOT ? net : Math.max(0, net-8);
            const fmt = d => d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
            shifts.push({date:activeShift.date, jobType:activeShift.jobType, timing:`${fmt(start)} - ${fmt(now)}`, net, otHours, breakHours: elapsed > 4 ? 0.5 : 0});
            shifts.sort((a,b)=>new Date(a.date)-new Date(b.date));
            localStorage.setItem('gokulAttRecords',JSON.stringify(shifts));
            if (window.GHAuth && typeof window.GHAuth.adminPunch === 'function') {
                try { await window.GHAuth.adminPunch('out', now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', hour12:false})); }
                catch (e) { console.error('Admin attendance sync failed:', e); alert('Work punch saved locally, but shared staff attendance sync failed: ' + (e.message || e)); }
            }
            activeShift=null; localStorage.removeItem('gokulActiveShift');
            updateShiftStats(); checkActiveShift(); alert("Shift completed!");
        }

        function cancelPunch() { if(confirm("Cancel current active shift?")) { activeShift = null; localStorage.removeItem('gokulActiveShift'); checkActiveShift(); } }

        function recordShiftManual() {
            const date=document.getElementById('att-date').value, inTime=document.getElementById('att-in').value, outTime=document.getElementById('att-out').value;
            const jobType=document.getElementById('att-job-select').value;
            const fullOT=!!document.getElementById('manual-full-ot')?.checked;
            const extra=Math.max(0,parseFloat(document.getElementById('manual-extra-ot')?.value)||0);
            if(!date||!inTime||!outTime) return alert("Fill date, in time and out time.");
            if(shifts.some(s=>s.date===date)) return alert("A shift record already exists for this date.");
            const start=new Date(`1970-01-01T${inTime}:00`); let end=new Date(`1970-01-01T${outTime}:00`);
            if(end<start) end.setDate(end.getDate()+1);
            const elapsed=(end-start)/3600000, net=Math.max(0,elapsed-(elapsed>4?0.5:0))+extra;
            const parts=date.split('-'), day=new Date(+parts[0],+parts[1]-1,+parts[2]).getDay();
            const otHours=(day===0||fullOT)?net:Math.max(0,net-8);
            shifts.push({date,jobType,timing:`${inTime} - ${outTime}`,net,otHours,breakHours: elapsed > 4 ? 0.5 : 0});
            shifts.sort((a,b)=>new Date(a.date)-new Date(b.date));
            localStorage.setItem('gokulAttRecords',JSON.stringify(shifts)); updateShiftStats();
            document.getElementById('att-date').valueAsDate=new Date(); document.getElementById('att-in').value='09:30'; document.getElementById('att-out').value='18:00';
            const extraInput=document.getElementById('manual-extra-ot'); if(extraInput) extraInput.value='';
            toggleManualShift(); alert("Time record saved!");
        }

        function getShiftBreakHours(s) {
            if (Number.isFinite(Number(s.breakHours)) && s.breakHours >= 0) return Number(s.breakHours);
            const timing = String(s.timing || `${s.inTime || ''} - ${s.outTime || ''}`);
            const match = timing.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
            if (match) {
                let a = Number(match[1]) * 60 + Number(match[2]);
                let b = Number(match[3]) * 60 + Number(match[4]);
                if (b < a) b += 1440;
                const elapsed = (b - a) / 60;
                return elapsed > 4 ? 0.5 : 0;
            }
            const net = Math.max(0, Number(s.net) || 0);
            return net > 0 ? 0.5 : 0;
        }

        function updateShiftStats() {
            const rowHtml = [...shifts].map((s, revIdx) => {
                const idx = shifts.length - 1 - revIdx;
                const job = String(s.jobType || 'Job');
                const shortJob = job.length > 12 ? job.slice(0, 12) + '..' : job;
                const timing = s.timing || `${s.inTime || '00:00'} - ${s.outTime || '00:00'}`;
                return `<tr><td>${s.date || ''}</td><td style="font-weight:700;font-size:11px;">${shortJob}</td><td style="font-size:11px;">${timing}</td><td>${(Number(s.net)||0).toFixed(1)}h</td><td style="color:var(--text-accent);font-weight:700;">${(Number(s.otHours)||0).toFixed(1)}h</td><td><div style="display:flex;gap:8px;justify-content:center;"><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;margin:0;width:auto;" onclick="openEditShiftModal(${idx})"><i class="fas fa-edit"></i></button><button class="btn btn-danger" style="padding:4px 8px;font-size:11px;margin:0;width:auto;" onclick="deleteShift(${idx})"><i class="fas fa-trash"></i></button></div></td></tr>`;
            }).join('');
            const workBody = document.getElementById('att-table-body');
            const historyBody = document.getElementById('history-table-body');
            if (workBody) workBody.innerHTML = rowHtml;
            if (historyBody) historyBody.innerHTML = rowHtml;

            const now = new Date();
            const year = now.getFullYear(), month = now.getMonth();
            const monthShifts = shifts.filter(s => {
                if (!s.date) return false;
                const d = new Date(s.date + 'T00:00:00');
                return d.getFullYear() === year && d.getMonth() === month && d <= new Date(year, month, now.getDate());
            });
            const presentDates = new Set(monthShifts.map(s => s.date));
            let expectedWorkDays = 0;
            for (let day = 1; day <= now.getDate(); day++) if (new Date(year, month, day).getDay() !== 0) expectedWorkDays++;
            const present = presentDates.size;
            const absent = Math.max(0, expectedWorkDays - present);
            const monthHours = monthShifts.reduce((sum, s) => sum + Math.max(0, Number(s.net) || 0), 0);
            const monthOT = monthShifts.reduce((sum, s) => sum + Math.max(0, Number(s.otHours) || 0), 0);
            const monthBreak = monthShifts.reduce((sum, s) => sum + (Number.isFinite(Number(s.breakHours)) && s.breakHours !== undefined ? Math.max(0, Number(s.breakHours)) : ((Number(s.net)||0)>0 ? 0.5 : 0)), 0);
            const setText = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };
            setText('stat-days', present); setText('stat-present', present); setText('stat-absent', absent);
            setText('stat-hours', monthHours.toFixed(1) + 'h'); setText('stat-ot', monthOT.toFixed(1) + 'h');
            setText('stat-break', monthBreak.toFixed(1) + 'h'); setText('dash-monthly-salary', monthHours.toFixed(1) + 'h');
            setText('att-summary-period', now.toLocaleString([], {month:'long', year:'numeric'}) + ' · Month to date');
        }

        function deleteShift(idx) { if (confirm("Delete shift?")) { shifts.splice(idx, 1); localStorage.setItem('gokulAttRecords', JSON.stringify(shifts)); updateShiftStats(); } }
        function clearShifts() { if (confirm("Clear all shift records?")) { shifts = []; localStorage.setItem('gokulAttRecords', JSON.stringify(shifts)); updateShiftStats(); } }

        // --- 7. AUTO-DOWNLOAD PDF SETTINGS ---
        function toggleAutoPdf() { localStorage.setItem('gokulAutoPdf', document.getElementById('auto-pdf-toggle').checked); }
        function checkAutoPdfDownload() {
            if(localStorage.getItem('gokulAutoPdf') === 'true') {
                const now = new Date(); const currentMonthKey = now.getFullYear() + '-' + now.getMonth(); const lastDownload = localStorage.getItem('gokulLastAutoPdf');
                if (now.getDate() >= 1 && lastDownload !== currentMonthKey) {
                    setTimeout(() => { downloadAllPdfsNow(); localStorage.setItem('gokulLastAutoPdf', currentMonthKey); }, 3000);
                }
            }
        }
        function downloadAllPdfsNow() {
            alert("Starting automated download for all reports...");
            setTimeout(downloadVaultLedger, 500); setTimeout(downloadPayslip, 2500); setTimeout(downloadTimesheet, 4500); setTimeout(downloadMasterEmiReport, 6500);
        }

        // --- 8. PREMIUM SAVINGS LEDGER DOWNLOAD WITH HTML2PDF ---
        function downloadVaultLedger() {
            if (transactions.length === 0) return alert("No transactions to export!");
            const brandName = localStorage.getItem('gokulPdfBrand') || 'GOKUL HUB INC.'; const primaryHex = localStorage.getItem('gokulPdfPrimary') || '#1e293b'; const accentHex = localStorage.getItem('gokulPdfAccent') || '#d4af37';
            const exportContainer = document.createElement('div'); exportContainer.style.padding = '24px'; exportContainer.style.color = '#111'; exportContainer.style.background = '#ffffff'; exportContainer.style.fontFamily = "'Plus Jakarta Sans', sans-serif";

            let inc = 0, exp = 0; transactions.forEach(t => { if (t.type === 'income') inc += (Number(t.amount) || 0); if (t.type === 'expense') exp += (Number(t.amount) || 0); }); const bal = inc - exp;

            exportContainer.innerHTML = `
                <div style="background:${primaryHex}; color:#fff; padding:20px; border-radius:12px; margin-bottom:20px; border-bottom: 4px solid ${accentHex};">
                    <h2 style="margin:0; font-size:24px; font-family: 'Playfair Display', serif; letter-spacing: 1px;">${brandName}</h2>
                    <p style="margin:6px 0 0; font-size:12px; color:${accentHex}; font-weight: bold; letter-spacing: 2px;">PREMIUM SAVINGS LEDGER REPORT</p>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:24px; font-size:13px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div>
                        <strong style="color: #475569;">ACCOUNT HOLDER:</strong><br>
                        <span style="font-size: 16px; font-weight: 800; color: ${primaryHex};">${profile.name.toUpperCase()}</span><br>
                        <span style="color: #64748b;">ID: ${profile.idStr} | Role: ${profile.role}</span><br>
                        <span style="color: #64748b;">Date: ${new Date().toLocaleDateString()}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="color: #27ae60; margin-bottom: 4px;"><strong>Total Income:</strong> +₹${inc.toFixed(2)}</div>
                        <div style="color: #e74c3c; margin-bottom: 4px;"><strong>Total Expense:</strong> -₹${exp.toFixed(2)}</div>
                        <div style="font-size: 16px; color: ${accentHex}; margin-top: 8px;"><strong>Net Balance: ₹${bal.toFixed(2)}</strong></div>
                    </div>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                    <thead>
                        <tr style="background:${primaryHex}; color:#fff;">
                            <th style="padding:12px 8px; border-radius: 6px 0 0 0;">Date</th><th style="padding:12px 8px;">Description</th><th style="padding:12px 8px;">Flow</th><th style="padding:12px 8px; text-align:right; border-radius: 0 6px 0 0;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...transactions].reverse().map((t, i) => `
                            <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
                                <td style="padding:10px 8px; color: #475569;">${t.date ? String(t.date).split(',')[0] : ''}</td><td style="padding:10px 8px; font-weight: 600; color: #0f172a;">${t.category}</td>
                                <td style="padding:10px 8px; font-weight:bold; color:${t.type === 'income' ? '#27ae60' : '#e74c3c'};">${t.type.toUpperCase()}</td>
                                <td style="padding:10px 8px; text-align:right; font-weight:bold; color:${t.type === 'income' ? '#27ae60' : '#e74c3c'};">${t.type === 'income' ? '+' : '-'}₹${Number(t.amount).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                    <p style="font-weight: bold; font-size: 11px; margin: 0; color: #0f172a;">AUTHORIZED SIGNATURE</p>
                    <div style="width: 150px; height: 1px; background: #94a3b8; margin: 30px 0 10px;"></div>
                    <p style="font-size: 9px; color: #94a3b8; margin: 0;">System Generated Ledger - ${brandName}</p>
                </div>
            `;
            document.body.appendChild(exportContainer);

            const opt = { margin: 10, filename: `Gokul_Savings_Ledger_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            html2pdf().set(opt).from(exportContainer).save().then(() => { document.body.removeChild(exportContainer); });
        }

        function downloadPayslip() { alert("Salary slips have been removed. Download the time-only timesheet PDF."); }

        function downloadTimesheet() {
            if (shifts.length === 0) return alert("No shifts to export!");
            const brandName = localStorage.getItem('gokulPdfBrand') || 'GOKUL HUB INC.'; const primaryColor = hexToRgb(localStorage.getItem('gokulPdfPrimary') || '#1e293b'); const accentColor = hexToRgb(localStorage.getItem('gokulPdfAccent') || '#d4af37');
            const { jsPDF } = window.jspdf; const pageHeight = Math.max(297, 140 + (shifts.length * 10)); const doc = new jsPDF('p', 'mm', [210, pageHeight]);
            const darkText = [40, 40, 40], lightText = [100, 100, 100];

            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
            try { if (profile.avatar && profile.avatar.startsWith('data:image')) doc.addImage(profile.avatar, 'JPEG', 14, 10, 20, 20); } catch(e) {}
            const textStartX = profile.avatar && profile.avatar.startsWith('data:image') ? 38 : 14; doc.text(brandName, textStartX, 20); doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("OFFICIAL ATTENDANCE TIMESHEET", textStartX, 30);
            const now = new Date(); doc.setFontSize(10); doc.text(`Date: ${now.toLocaleDateString()}`, 160, 25);
            doc.setTextColor(darkText[0], darkText[1], darkText[2]); doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("EMPLOYEE DETAILS", 14, 50);
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Name: ${profile.name}`, 14, 58); doc.text(`ID: ${profile.idStr}`, 14, 64); doc.text(`Role: ${profile.role}`, 14, 70);
            
            let totalHrs = 0, totalOT = 0;
            shifts.forEach(s => { totalHrs += (Number(s.net) || 0); totalOT += (Number(s.otHours) || 0); });

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.setLineWidth(0.5); doc.roundedRect(120, 45, 75, 38, 3, 3, 'S'); doc.setFont("helvetica", "bold"); doc.text("SUMMARY", 125, 52); doc.setFont("helvetica", "normal"); doc.text(`Total Days: ${shifts.length}`, 125, 60); doc.text(`Reg Hours: ${totalHrs.toFixed(1)}h`, 125, 66); doc.text(`OT Hours: ${totalOT.toFixed(1)}h`, 125, 72); doc.setFont("helvetica", "bold"); doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]); doc.text(`Total Hours: ${totalHrs.toFixed(1)}h`, 125, 78);

            doc.setTextColor(darkText[0], darkText[1], darkText[2]);
            const tableColumn = ["Date", "Job Title", "Timing", "Working (Hrs)", "OT (Hrs)"];
            const tableRows = shifts.map(s => [s.date || '', s.jobType || 'Job', s.timing || `${s.inTime || ''} - ${s.outTime || ''}`, (Number(s.net)||0).toFixed(1), (Number(s.otHours)||0).toFixed(1)]);

            doc.autoTable({ startY: 95, head: [tableColumn], body: tableRows, theme: 'striped', headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' }, bodyStyles: { textColor: darkText, halign: 'center' }, alternateRowStyles: { fillColor: [240, 244, 248] }, styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 }, columnStyles: { 1: { halign: 'left' } }, margin: { top: 10, right: 14, bottom: 20, left: 14 } });

            const finalY = doc.lastAutoTable.finalY || 95; doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("AUTHORIZED SIGNATURE", 14, finalY + 30); doc.setLineWidth(0.5); doc.line(14, finalY + 25, 70, finalY + 25); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(lightText[0], lightText[1], lightText[2]); doc.text(`System Generated Report - ${brandName}`, 14, finalY + 45);
            doc.save(`Gokul_Timesheet_Report_${now.getTime()}.pdf`);
        }

        // --- 9. PREMIUM THEMES ---
        const themeOpts = [ { id: 'jarvis', name: '🤖 J.A.R.V.I.S.' }, { id: 'rajput', name: '👑 Royal Rajput' }, { id: 'peacock', name: '🦚 Peacock Emerald' }, { id: 'saffron', name: '🕉️ Varanasi Saffron' }, { id: 'mughal', name: '🕌 Mughal Magenta' }, { id: 'maratha', name: '⚔️ Maratha Navy' }, { id: 'chola', name: '🏛️ Chola Bronze' }, { id: 'sapphire', name: '💎 Sapphire Ocean' }, { id: 'amethyst', name: '🔮 Amethyst Lotus' }, { id: 'jade', name: '🌿 Jade Forest' }, { id: 'ruby', name: '🌹 Crimson Ruby' }, { id: 'gold', name: '✨ Golden Temple' }, { id: 'slate', name: '⛰️ Himalayan Slate' }, { id: 'desert', name: '🐪 Thar Desert' }, { id: 'sunset', name: '🌅 Sunset Orange' }, { id: 'lavender', name: '🪻 Kashmiri Lavender' }, { id: 'platinum', name: '💍 Platinum Pearl' }, { id: 'obsidian', name: '🌑 Obsidian Gold' }, { id: 'light', name: '☀️ Classic Light' }, { id: 'aesthetic', name: '🌸 Soft Aesthetic' } ];

        function renderThemeGallery() {
            const gallery = document.getElementById('theme-gallery');
            if(gallery) { gallery.innerHTML = themeOpts.map(th => `<div style="background: var(--bg-card); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center; cursor: pointer; color: var(--text-main);" onclick="applyTheme('${th.id}'); document.getElementById('auto-theme-toggle').checked = false; toggleAutoTheme();"><div style="font-weight: 800; font-size: 13px;">${th.name}</div></div>`).join(''); }
        }
        
        function applyTheme(id) { 
            document.documentElement.setAttribute('data-theme', id); localStorage.setItem('gokulTheme', id); 
            const icon = document.getElementById('mode-icon');
            if(icon) {
                if(id === 'light' || id === 'platinum') { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); } 
                else { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
            }
        }

        // --- 10. DATA EXPORT / IMPORT ---
        function exportData() {
            const data = { profile: JSON.parse(localStorage.getItem('gokulProfile')), vaultTx: JSON.parse(localStorage.getItem('gokulVaultTx')), attRecords: JSON.parse(localStorage.getItem('gokulAttRecords')), petrolRecords: JSON.parse(localStorage.getItem('gokulPetrolRecords')), emiRegistry: JSON.parse(localStorage.getItem('gokulEmiRegistry')), dreamGoal: JSON.parse(localStorage.getItem('gokulDreamGoal')) };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data)); const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", "GokulHub_Backup.json");
            document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
        }

        function importData() {
            const file = document.getElementById('import-file').files[0]; if (!file) return alert("Select .json file.");
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if(data.profile) localStorage.setItem('gokulProfile', JSON.stringify(data.profile)); if(data.vaultTx) localStorage.setItem('gokulVaultTx', JSON.stringify(data.vaultTx)); if(data.attRecords) localStorage.setItem('gokulAttRecords', JSON.stringify(data.attRecords)); if(data.petrolRecords) localStorage.setItem('gokulPetrolRecords', JSON.stringify(data.petrolRecords)); if(data.emiRegistry) localStorage.setItem('gokulEmiRegistry', JSON.stringify(data.emiRegistry)); if(data.dreamGoal) localStorage.setItem('gokulDreamGoal', JSON.stringify(data.dreamGoal));
                    alert("Backup Restored! Refreshing..."); window.location.reload();
                } catch(err) { alert("Invalid file!"); }
            }
            reader.readAsText(file);
        }

    
