// Notification helpers — activity feed + decision count
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./auth.js";

const NOTIFS_PATH    = () => collection(db, "household", "shared", "notifications");
const DECISIONS_PATH = () => collection(db, "household", "shared", "decisions");

// Subscribe to notifications + decision count. Calls onChange(notifs[], decisionCount)
export function subscribeNotifications(uid, onChange) {
  const q = query(NOTIFS_PATH(), orderBy("createdAt", "desc"));
  let _notifs    = [];
  let _decCount  = 0;

  const unsubN = onSnapshot(q, snap => {
    _notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onChange(_notifs, _decCount);
  });

  const unsubD = onSnapshot(DECISIONS_PATH(), snap => {
    _decCount = snap.size;
    onChange(_notifs, _decCount);
  });

  return () => { unsubN(); unsubD(); };
}

// Count unread notifications for a user
export function unreadCount(notifs, uid) {
  return notifs.filter(n => !n.readBy?.includes(uid)).length;
}

// Write a notification when something is added/changed
export async function notify(message, actorName) {
  await addDoc(NOTIFS_PATH(), {
    message,
    actorName,
    createdAt: new Date().toISOString(),
    readBy:    []
  });
}

// Mark all notifications as read for this user
export async function markAllRead(uid) {
  const q    = query(NOTIFS_PATH(), orderBy("createdAt", "desc"));
  const snap = await new Promise(resolve => {
    const unsub = onSnapshot(q, s => { unsub(); resolve(s); });
  });
  const updates = snap.docs
    .filter(d => !d.data().readBy?.includes(uid))
    .map(d => updateDoc(d.ref, { readBy: [...(d.data().readBy||[]), uid] }));
  await Promise.all(updates);
}
