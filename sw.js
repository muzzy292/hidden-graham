// Service Worker — caches app shell for offline use
const CACHE  = "ourcompass-v1";
const ASSETS = [
  "/hidden-graham/",
  "/hidden-graham/dashboard.html",
  "/hidden-graham/app.html",
  "/hidden-graham/events.html",
  "/hidden-graham/budget.html",
  "/hidden-graham/decisions.html",
  "/hidden-graham/settings.html",
  "/hidden-graham/style.css",
  "/hidden-graham/firebase-config.js",
  "/hidden-graham/js/app.js",
  "/hidden-graham/js/auth.js",
  "/hidden-graham/js/db.js",
  "/hidden-graham/js/matrix.js",
  "/hidden-graham/js/calendar.js",
  "/hidden-graham/js/claude.js",
  "/hidden-graham/js/notifications.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network first for Firebase/API calls, cache first for app shell
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always go to network for Firebase, Google APIs, and Claude
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("anthropic") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("accounts.google")
  ) {
    return;
  }

  // Cache-first for app shell assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
