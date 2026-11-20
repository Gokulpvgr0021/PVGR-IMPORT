
/* =====================================================
   GOKUL CHAT - AUTHENTICATION BRIDGE
   Existing Gokul Hub login remains unchanged.
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
    ready: false,
    error: null,

    async initialize() {
      if (!window.firebase) {
        throw new Error("Firebase SDK is not loaded.");
      }

      if (!firebase.auth || !firebase.database) {
        throw new Error("Firebase Auth or Database SDK is missing.");
      }

      this.app =
        firebase.apps.find(app => app.name === "gokulChat") ||
        firebase.initializeApp(CONFIG.firebase, "gokulChat");

      this.auth = this.app.auth();
      this.db = this.app.database();

      this.auth.onAuthStateChanged(user => {
        this.user = user || null;
        this.ready = !!user;

        window.dispatchEvent(
          new CustomEvent("gokulchat:auth", {
            detail: { user: this.user }
          })
        );
      });

      return true;
    },

    async login(role, username, password) {
      if (!navigator.onLine) {
        throw new Error("Chat login requires an internet connection.");
      }

      if (!this.auth) {
        await this.initialize();
      }

      const response = await fetch(CONFIG.workerLogin, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role,
          username,
          password
        })
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error("Invalid authentication server response.");
      }

      if (!response.ok || !result.success || !result.customToken) {
        throw new Error(result.error || "Chat authentication failed.");
      }

      const credential = await this.auth.signInWithCustomToken(
        result.customToken
      );

      this.user = credential.user;
      this.ready = true;

      return {
        success: true,
        user: result.user,
        firebaseUser: credential.user
      };
    },

    async logout() {
      if (this.auth) {
        await this.auth.signOut();
      }

      this.user = null;
      this.ready = false;
    },

    getCurrentUser() {
      return this.user;
    },

    getDatabase() {
      return this.db;
    }
  };

  window.GokulChatAuth = ChatAuth;

  /*
   * Capture credentials only in memory during the existing
   * Gokul Hub login. The original login function is preserved.
   */

  function connectExistingLogin() {
    if (!window.GHAuth || window.GHAuth.__chatConnected) {
      return;
    }

    const originalSubmit = window.GHAuth.submit;

    window.GHAuth.submit = async function () {
      const title = document.getElementById("gh-login-title");
      const idInput = document.getElementById("gh-login-id");
      const passwordInput = document.getElementById("gh-login-password");

      const role =
        title && /admin/i.test(title.textContent) ? "admin" : "staff";

      const username =
        role === "admin" ? "admin" : (idInput?.value || "").trim();

      const password = passwordInput?.value || "";

      await originalSubmit.apply(this, arguments);

      const gate = document.getElementById("gh-auth-gate");
      const staffScreen = document.getElementById("gh-staff-app");
      const shell = document.querySelector(".app-shell");

      const loginSucceeded =
        gate?.hidden === true &&
        (
          staffScreen?.hidden === false ||
          (shell && getComputedStyle(shell).display !== "none")
        );

      if (!loginSucceeded || !password) return;

      try {
        await ChatAuth.login(role, username, password);

        window.dispatchEvent(
          new CustomEvent("gokulchat:ready", {
            detail: {
              role,
              user: ChatAuth.user
            }
          })
        );
      } catch (error) {
        console.warn("GOKUL CHAT sign-in unavailable:", error);

        window.dispatchEvent(
          new CustomEvent("gokulchat:error", {
            detail: { message: error.message }
          })
        );
      }
    };

    window.GHAuth.__chatConnected = true;
  }

  connectExistingLogin();

  document.addEventListener("DOMContentLoaded", () => {
    connectExistingLogin();

    ChatAuth.initialize().catch(error => {
      ChatAuth.error = error;
      console.warn("GOKUL CHAT initialization:", error);
    });
  });

})();
