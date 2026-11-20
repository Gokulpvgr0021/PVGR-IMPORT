
/* =====================================================
   GOKUL CHAT - FIREBASE AUTH BRIDGE
   Existing Gokul Hub login is preserved.
   ===================================================== */

(function () {
  "use strict";

  const CONFIG = {
    workerLogin:
      "https://gokul-chat-auth.pvgr002122gokul.workers.dev/login",

    firebase: {
      apiKey: "AIzaSyBKF9yPkjM3cfWcuZflH1o29L1I4yxkhc4",
      authDomain: "gokul-chat.firebaseapp.com",
      databaseURL:
        "https://gokul-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "gokul-chat",
      storageBucket: "gokul-chat.firebasestorage.app",
      messagingSenderId: "837544543854",
      appId: "1:837544543854:web:ad4d11437ac9a9a614487f"
    }
  };

  const ChatAuth = {
    app: null,
    auth: null,
    db: null,
    user: null,
    initialized: false,

    async initialize() {
      if (this.initialized) return true;

      if (!window.firebase ||
          !firebase.auth ||
          !firebase.database) {
        throw new Error("Firebase SDK missing.");
      }

      this.app =
        firebase.apps.find(app => app.name === "gokulChat") ||
        firebase.initializeApp(CONFIG.firebase, "gokulChat");

      this.auth = this.app.auth();
      this.db = this.app.database();

      this.auth.onAuthStateChanged(user => {
        this.user = user || null;

        window.dispatchEvent(
          new CustomEvent("gokulchat:auth", {
            detail: { authenticated: !!user }
          })
        );
      });

      this.initialized = true;
      return true;
    },

    async login(role, username, password) {
      if (!navigator.onLine) {
        throw new Error("Internet connection required for chat login.");
      }

      await this.initialize();

      const response = await fetch(CONFIG.workerLogin, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role: role,
          username: username,
          password: password
        })
      });

      let result;

      try {
        result = await response.json();
      } catch (_) {
        throw new Error("Invalid authentication server response.");
      }

      if (!response.ok ||
          !result.success ||
          !result.customToken) {
        throw new Error(
          result.error || "Chat authentication failed."
        );
      }

      const credential =
        await this.auth.signInWithCustomToken(result.customToken);

      this.user = credential.user;

      window.dispatchEvent(
        new CustomEvent("gokulchat:ready", {
          detail: {
            role: role,
            user: result.user
          }
        })
      );

      return true;
    },

    async logout() {
      if (this.auth) {
        await this.auth.signOut();
      }

      this.user = null;
    },

    getCurrentUser() {
      return this.user;
    },

    getDatabase() {
      return this.db;
    }
  };

  window.GokulChatAuth = ChatAuth;

  document.addEventListener("DOMContentLoaded", function () {
    ChatAuth.initialize().catch(error => {
      console.warn("GOKUL CHAT initialization:", error);
    });
  });

})();
