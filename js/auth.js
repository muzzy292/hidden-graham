// Firebase Authentication — Google sign-in, allowlist enforcement
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export let app, auth, db;

export function initFirebase() {
  app  = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db   = getFirestore(app);
}

// Returns the signed-in user, or null.
export function onAuth(callback) {
  onAuthStateChanged(auth, callback);
}

export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await _ensureUserDoc(result.user);
  return result.user;
}

export function signOutUser() {
  return signOut(auth);
}

// Check if the signed-in user is in the household allowlist.
// The allowlist lives at Firestore /config/allowlist { emails: [...] }
// On first-ever login (no allowlist doc yet), the signing-in user becomes admin
// and is automatically added, then they can add their partner.
export async function isAllowed(user) {
  const ref  = doc(db, "config", "allowlist");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Bootstrap: first login creates the allowlist with this user
    await setDoc(ref, { emails: [user.email] });
    return true;
  }
  const list = snap.data().emails || [];
  return list.includes(user.email);
}

export async function addAllowedEmail(email) {
  const ref  = doc(db, "config", "allowlist");
  const snap = await getDoc(ref);
  const list = snap.exists() ? (snap.data().emails || []) : [];
  if (!list.includes(email)) {
    list.push(email);
    await setDoc(ref, { emails: list });
  }
}

export async function getAllowedEmails() {
  const ref  = doc(db, "config", "allowlist");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().emails || []) : [];
}

async function _ensureUserDoc(user) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email:       user.email,
      displayName: user.displayName,
      photoURL:    user.photoURL,
      createdAt:   new Date().toISOString()
    });
  }
}
