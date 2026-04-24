// Firestore helpers — items, events, budgets CRUD, user settings
import {
  getFirestore,
  collection, doc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./auth.js";

// ── Items ─────────────────────────────────────────────────────────────────────

const ITEMS_PATH   = () => collection(db, "household", "shared", "items");
const EVENTS_PATH  = () => collection(db, "household", "shared", "events");
const BUDGETS_PATH = () => collection(db, "household", "shared", "budgets");

export function subscribeItems(onChange) {
  const q = query(ITEMS_PATH(), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addItem(item) {
  return addDoc(ITEMS_PATH(), { ...item, createdAt: new Date().toISOString(), done: false });
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

// ── Events ────────────────────────────────────────────────────────────────────

export function subscribeEvents(onChange) {
  const q = query(EVENTS_PATH(), orderBy("date", "asc"));
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addEvent(event) {
  return addDoc(EVENTS_PATH(), { ...event, createdAt: new Date().toISOString() });
}

export async function updateEvent(id, patch) {
  return updateDoc(doc(db, "household", "shared", "events", id), patch);
}

export async function deleteEvent(id) {
  return deleteDoc(doc(db, "household", "shared", "events", id));
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export function subscribeBudgets(onChange) {
  const q = query(BUDGETS_PATH(), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addBudget(budget) {
  return addDoc(BUDGETS_PATH(), { ...budget, createdAt: new Date().toISOString(), spent: 0 });
}

export async function updateBudget(id, patch) {
  return updateDoc(doc(db, "household", "shared", "budgets", id), patch);
}

export async function deleteBudget(id) {
  return deleteDoc(doc(db, "household", "shared", "budgets", id));
}

// ── User settings ─────────────────────────────────────────────────────────────

const userSettingsRef = (uid) => doc(db, "users", uid, "private", "settings");

export async function saveUserSettings(uid, patch) {
  await setDoc(userSettingsRef(uid), patch, { merge: true });
}

export async function getUserSettings(uid) {
  const snap = await getDoc(userSettingsRef(uid));
  return snap.exists() ? snap.data() : {};
}
