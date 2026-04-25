// Service Worker — caches app shell for offline use
// !! Bump this version on every deploy to force cache refresh !!
const VERSION = "ourcompass-v15";
const CACHE   = VERSION;

const ASSETS = [
  "/hidden-graham/",
  "/hidden-graham/index.html",
  "/hidden-graham/dashboard.html",
  "/hidden-graham/app.html",
  "/hidden-graham/events.html",
  "/hidden-graham/budget.html",
  "/hidden-graham/decisions.html",
  "/hidden-graham/settings.html",
  "/hidden-graham/tax.html",
  "/hidden-graham/style.css",
  "/hidden-graham/firebase-config.js",
  "/hidden-graham/js/app.js",
  "/hidden-graham/js/auth.js",
  "/hidden-graham/js/db.js",
  "/hidden-graham/js/matrix.js",
  "/hidden-graham/js/calendar.js",
  "/hidden-graham/js/claude.js",
  "/hidden-graham/js/claude-scan.js",
  "/hidden-graham/js/notifications.js",
  "/hidden-graham/js/nav.js",
  "/hidden-graham/js/pwa.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
];

// Install — cache all assets and activate immediately
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete any old cache versions, then take control
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — network first for APIs, cache first for app shell
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always go to network for Firebase, Google APIs, and Claude
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("anthropic") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("accounts.google") ||
    url.hostname.includes("maps.google")
  ) {
    return;
  }

  // Network first for app shell — gets fresh files, falls back to cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Update the cache with the fresh response
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
