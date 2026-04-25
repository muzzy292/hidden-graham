// Shared mobile nav — hamburger toggle
import { signOutUser } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("nav-hamburger");
  const menu      = document.getElementById("nav-mobile-menu");
  if (!hamburger || !menu) return;

  hamburger.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    hamburger.textContent = open ? "✕" : "☰";
  });

  // Close menu when a link is tapped
  menu.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => menu.classList.remove("open"));
  });

  // Mobile sign out
  document.getElementById("mobile-signout")?.addEventListener("click", signOutUser);
});
