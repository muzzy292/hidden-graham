// Firestore helpers — items CRUD, user settings
import {
  getFirestore,
  collection, doc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./auth.js";

// Items live under /household/shared/items
const ITEMS_PATH = () => collection(db, "household", "shared", "items");

// Subscribe to all items (real-time). Calls onChange(items[]) on every update.
export function subscribeItems(onChange) {
  const q = query(ITEMS_PATH(), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onChange(items);
  });
}

export async function addItem(item) {
  return addDoc(ITEMS_PATH(), {
    ...item,
    createdAt: new Date().toISOString(),
    done: false
  });
}

export async function updateItem(id, patch) {
  return updateDoc(doc(db, "household", "shared", "items", id), patch);
}

export async function deleteItem(id) {
  return deleteDoc(doc(db, "household", "shared", "items", id));
}

export async function toggleDone(id, current) {
  return updateDoc(doc(db, "household", "shared", "items", id), { done: !current });
}

// ── User settings (Claude API key, calendar connected) ──

const userSettingsRef = (uid) => doc(db, "users", uid, "private", "settings");

export async function saveUserSettings(uid, patch) {
  await setDoc(userSettingsRef(uid), patch, { merge: true });
}

export async function getUserSettings(uid) {
  const snap = await getDoc(userSettingsRef(uid));
  return snap.exists() ? snap.data() : {};
}
