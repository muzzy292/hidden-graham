// Main app orchestration — wires auth, db, matrix, nav
import { initFirebase, onAuth, signOutUser, isAllowed } from "./auth.js";
import { subscribeItems } from "./db.js";
import { getUserSettings } from "./db.js";
import { initMatrix, setItems, setFilter, openModal } from "./matrix.js";

let _unsubscribeItems = null;

async function boot() {
  initFirebase();

  onAuth(async user => {
    if (!user) {
      window.location.href = "dashboard.html";
      return;
    }

    const allowed = await isAllowed(user);
    if (!allowed) {
      document.getElementById("app-root").innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
          <h2 style="margin-bottom:12px">Access Denied</h2>
          <p>Your account (${user.email}) hasn't been added to this household.</p>
          <p style="margin-top:8px">Ask your partner to add you in Settings.</p>
          <button class="btn btn-secondary" style="margin-top:20px" onclick="import('./auth.js').then(m=>m.signOutUser())">Sign Out</button>
        </div>`;
      return;
    }

    // Load user settings (Claude API key)
    const settings   = await getUserSettings(user.uid);
    const claudeKey  = settings.claudeApiKey || null;

    _renderNav(user);
    initMatrix(user, claudeKey);
    _bindToolbar();

    // Subscribe to real-time item updates
    if (_unsubscribeItems) _unsubscribeItems();
    _unsubscribeItems = subscribeItems(items => {
      window._currentItems = items;
      setItems(items);
    });
  });
}

function _renderNav(user) {
  const nav = document.getElementById("app-nav");
  const initials = (user.displayName || user.email)
    .split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("");

  nav.querySelector(".user-avatar").textContent = initials;
  nav.querySelector(".user-avatar").title = user.email;
}

function _bindToolbar() {
  document.getElementById("btn-add").addEventListener("click", () => openModal(null));
  document.getElementById("btn-signout").addEventListener("click", signOutUser);
  document.getElementById("btn-settings").addEventListener("click", () => {
    window.location.href = "settings.html";
  });

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      setFilter(chip.dataset.filter);
    });
  });
}

// ── Toast helper (global) ─────────────────────────────────────────────────────
window._showToast = function(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = type;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3500);
};

boot();
