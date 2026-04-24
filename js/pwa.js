// Register service worker for PWA install support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/hidden-graham/sw.js")
      .catch(err => console.warn("SW registration failed:", err));
  });
}
