// Eisenhower matrix — render, drag-and-drop, add/edit modal
import { addItem, updateItem, deleteItem, toggleDone } from "./db.js";
import { suggestQuadrant } from "./claude.js";

const QUADRANTS = [
  { key: "ui", label: "This Month",  sub: "Top priority — get it done" },
  { key: "ni", label: "This Year",   sub: "Important but not urgent" },
  { key: "un", label: "One Day",     sub: "Worth doing, lower priority" },
  { key: "nn", label: "Maybe Never", sub: "Nice idea — park it for now" }
];

const TYPES = ["goal", "project", "decision", "wishlist"];

let _items      = [];
let _filter     = "all";
let _currentUser = null;
let _editingId  = null;
let _claudeKey  = null;

export function initMatrix(user, claudeKey) {
  _currentUser = user;
  _claudeKey   = claudeKey;
  _renderGrid();
  _bindModal();
}

export function setItems(items) {
  _items = items;
  _renderAllQuadrants();
}

export function setFilter(type) {
  _filter = type;
  _renderAllQuadrants();
}

// ── Render ────────────────────────────────────────────────────────────────────

function _renderGrid() {
  const grid = document.getElementById("matrix-grid");
  grid.innerHTML = QUADRANTS.map(q => `
    <div class="quadrant" data-q="${q.key}" id="q-${q.key}">
      <div class="quadrant-header">
        <span class="quadrant-title">${q.label}</span>
        <span class="quadrant-count" id="count-${q.key}">0</span>
      </div>
      <div class="quadrant-sub" style="font-size:11px;color:var(--text-muted);margin-bottom:10px">${q.sub}</div>
      <div class="quadrant-items" id="items-${q.key}"></div>
      <button class="btn btn-ghost btn-sm add-in-q" data-q="${q.key}" style="margin-top:10px;width:100%;justify-content:center">+ Add here</button>
    </div>
  `).join("");

  _bindDragDrop();
  grid.querySelectorAll(".add-in-q").forEach(btn => {
    btn.addEventListener("click", () => openModal(null, btn.dataset.q));
  });
}

function _renderAllQuadrants() {
  QUADRANTS.forEach(q => _renderQuadrant(q.key));
}

function _renderQuadrant(qKey) {
  const filtered = _items.filter(it =>
    it.quadrant === qKey && (_filter === "all" || it.type === _filter)
  );
  const container = document.getElementById(`items-${qKey}`);
  const count     = document.getElementById(`count-${qKey}`);
  if (!container) return;

  count.textContent = filtered.length;
  container.innerHTML = filtered.map(it => _cardHTML(it)).join("");

  container.querySelectorAll(".item-card").forEach(card => {
    const id = card.dataset.id;
    const item = _items.find(i => i.id === id);

    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", e => _onDragStart(e, id));
    card.addEventListener("dragend",   e => card.classList.remove("dragging"));

    card.querySelector(".btn-edit")?.addEventListener("click", e => {
      e.stopPropagation();
      openModal(item);
    });
    card.querySelector(".btn-del")?.addEventListener("click", async e => {
      e.stopPropagation();
      if (confirm(`Delete "${item.title}"?`)) await deleteItem(id);
    });
    card.querySelector(".btn-done")?.addEventListener("click", async e => {
      e.stopPropagation();
      await toggleDone(id, item.done);
    });
    card.querySelector(".btn-cal")?.addEventListener("click", async e => {
      e.stopPropagation();
      const { pushToCalendar } = await import("./calendar.js");
      await pushToCalendar(item);
    });
  });
}

function _cardHTML(it) {
  const due = it.dueDate ? _dueLabel(it.dueDate) : "";
  const overdue = it.dueDate && new Date(it.dueDate) < new Date() && !it.done ? "overdue" : "";
  return `
    <div class="item-card${it.done ? " item-done" : ""}" data-id="${it.id}">
      <div class="item-card-top">
        <span class="item-title">${_esc(it.title)}</span>
        <span class="item-actions">
          <button class="btn btn-ghost btn-icon btn-done" title="${it.done ? "Reopen" : "Done"}">${it.done ? "↩" : "✓"}</button>
          <button class="btn btn-ghost btn-icon btn-edit" title="Edit">✎</button>
          ${it.dueDate ? `<button class="btn btn-ghost btn-icon btn-cal" title="Add to Google Calendar">📅</button>` : ""}
          <button class="btn btn-ghost btn-icon btn-del" title="Delete">✕</button>
        </span>
      </div>
      <div class="item-meta">
        <span class="item-type type-${it.type}">${it.type}</span>
        ${due ? `<span class="item-due ${overdue}">${due}</span>` : ""}
        <span class="item-by">by ${_esc(it.createdByName || "you")}</span>
      </div>
      ${it.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px;line-height:1.4">${_esc(it.notes)}</div>` : ""}
      ${it.actionPlan ? `<div style="font-size:12px;color:var(--accent2);margin-top:6px">📋 Plan attached</div>` : ""}
    </div>
  `;
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────

let _draggingId = null;

function _onDragStart(e, id) {
  _draggingId = id;
  e.dataTransfer.effectAllowed = "move";
  setTimeout(() => e.target.classList.add("dragging"), 0);
}

function _bindDragDrop() {
  document.querySelectorAll(".quadrant").forEach(q => {
    q.addEventListener("dragover",  e => { e.preventDefault(); q.classList.add("drag-over"); });
    q.addEventListener("dragleave", e => q.classList.remove("drag-over"));
    q.addEventListener("drop",      async e => {
      e.preventDefault();
      q.classList.remove("drag-over");
      if (_draggingId && q.dataset.q) {
        await updateItem(_draggingId, { quadrant: q.dataset.q });
        _draggingId = null;
      }
    });
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function _bindModal() {
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("item-form").addEventListener("submit", _handleSave);
  document.getElementById("btn-suggest").addEventListener("click", _handleSuggest);
  document.getElementById("btn-action-plan").addEventListener("click", _handleActionPlan);
}

export function openModal(item, defaultQuadrant = "ui") {
  _editingId = item?.id || null;
  const modal = document.getElementById("modal-backdrop");
  const title = document.getElementById("modal-title");

  title.textContent = item ? "Edit Item" : "Add Item";
  document.getElementById("f-title").value    = item?.title    || "";
  document.getElementById("f-notes").value    = item?.notes    || "";
  document.getElementById("f-type").value     = item?.type     || "goal";
  document.getElementById("f-quadrant").value = item?.quadrant || defaultQuadrant;
  document.getElementById("f-due").value      = item?.dueDate  || "";

  document.getElementById("ai-suggest-panel").classList.add("hidden");
  document.getElementById("ai-plan-panel").classList.add("hidden");
  document.getElementById("btn-suggest").style.display = _claudeKey ? "" : "none";
  document.getElementById("btn-action-plan").style.display = _claudeKey ? "" : "none";

  modal.classList.remove("hidden");
  document.getElementById("f-title").focus();
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.add("hidden");
  _editingId = null;
}

async function _handleSave(e) {
  e.preventDefault();
  const payload = {
    title:    document.getElementById("f-title").value.trim(),
    notes:    document.getElementById("f-notes").value.trim(),
    type:     document.getElementById("f-type").value,
    quadrant: document.getElementById("f-quadrant").value,
    dueDate:  document.getElementById("f-due").value || null,
  };
  if (!payload.title) return;

  if (_editingId) {
    await updateItem(_editingId, payload);
  } else {
    payload.createdByName = _currentUser.displayName || _currentUser.email;
    payload.createdBy     = _currentUser.uid;
    await addItem(payload);
  }
  closeModal();
}

async function _handleSuggest() {
  const title  = document.getElementById("f-title").value.trim();
  const notes  = document.getElementById("f-notes").value.trim();
  const panel  = document.getElementById("ai-suggest-panel");
  const body   = document.getElementById("ai-suggest-body");
  if (!title) { alert("Enter a title first."); return; }

  panel.classList.remove("hidden");
  body.textContent = "Thinking…";
  body.classList.add("ai-loading");

  const result = await suggestQuadrant(title, notes, _claudeKey);
  body.classList.remove("ai-loading");
  if (result.error) {
    body.textContent = "Error: " + result.error;
    return;
  }
  body.textContent = result.reason;
  document.getElementById("f-quadrant").value = result.quadrant;
}

async function _handleActionPlan() {
  const title  = document.getElementById("f-title").value.trim();
  const notes  = document.getElementById("f-notes").value.trim();
  const panel  = document.getElementById("ai-plan-panel");
  const body   = document.getElementById("ai-plan-body");
  if (!title) { alert("Enter a title first."); return; }

  panel.classList.remove("hidden");
  body.textContent = "Generating action plan…";
  body.classList.add("ai-loading");

  const { generateActionPlan } = await import("./claude.js");
  const result = await generateActionPlan(title, notes, _claudeKey);
  body.classList.remove("ai-loading");
  if (result.error) { body.textContent = "Error: " + result.error; return; }

  body.innerHTML = result.steps.map((s, i) => `<div>${i + 1}. ${_esc(s)}</div>`).join("");

  // Offer to attach the plan to the item when saved
  if (_editingId) {
    await updateItem(_editingId, { actionPlan: result.steps });
  } else {
    document.getElementById("f-notes").value +=
      (notes ? "\n\n" : "") + "Plan:\n" + result.steps.map((s,i) => `${i+1}. ${s}`).join("\n");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function _dueLabel(dateStr) {
  const d   = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7)  return `${diff}d`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
