const state = {
  users: [],
  userId: localStorage.getItem("ajaia.userId") || "ava",
  documents: [],
  activeId: null,
  dirty: false
};

const $ = (id) => document.getElementById(id);
const els = {
  userSelect: $("userSelect"),
  docList: $("docList"),
  newDoc: $("newDoc"),
  refreshDocs: $("refreshDocs"),
  fileInput: $("fileInput"),
  emptyState: $("emptyState"),
  editorShell: $("editorShell"),
  titleInput: $("titleInput"),
  docMeta: $("docMeta"),
  shareSelect: $("shareSelect"),
  shareBtn: $("shareBtn"),
  saveBtn: $("saveBtn"),
  editor: $("editor"),
  status: $("status"),
  shareInfo: $("shareInfo")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

async function boot() {
  const session = await api(`/api/session?userId=${state.userId}`);
  state.users = session.users;
  renderUsers();
  await loadDocuments();
  if (state.documents[0]) await openDocument(state.documents[0].id);
}

function renderUsers() {
  els.userSelect.innerHTML = state.users.map((user) => `<option value="${user.id}">${user.name}</option>`).join("");
  els.userSelect.value = state.userId;
  renderShareOptions();
}

function renderShareOptions(activeDoc) {
  const excluded = new Set([state.userId, ...(activeDoc?.sharedWith || []).map((user) => user.id)]);
  const options = state.users.filter((user) => !excluded.has(user.id));
  els.shareSelect.innerHTML = options.map((user) => `<option value="${user.id}">${user.name}</option>`).join("");
  els.shareBtn.disabled = options.length === 0 || activeDoc?.access !== "owned";
  els.shareSelect.disabled = els.shareBtn.disabled;
}

async function loadDocuments() {
  const payload = await api(`/api/documents?userId=${state.userId}`);
  state.documents = payload.documents;
  renderList();
}

function renderList() {
  els.docList.innerHTML = state.documents
    .map((doc) => {
      const badge = doc.access === "owned" ? "Owned" : "Shared";
      const owner = doc.access === "owned" ? "You own this" : `Owner: ${doc.owner?.name || doc.ownerId}`;
      return `<button class="doc-card ${doc.id === state.activeId ? "active" : ""}" data-id="${doc.id}">
        <strong>${escapeHtml(doc.title)}</strong>
        <small>${owner} · ${formatDate(doc.updatedAt)}</small>
        <span class="badge ${doc.access === "shared" ? "shared" : ""}">${badge}</span>
      </button>`;
    })
    .join("");
}

async function openDocument(id) {
  const payload = await api(`/api/documents/${id}?userId=${state.userId}`);
  state.activeId = id;
  state.dirty = false;
  els.emptyState.hidden = true;
  els.editorShell.hidden = false;
  els.titleInput.value = payload.document.title;
  els.editor.innerHTML = payload.document.content || "<p></p>";
  els.docMeta.textContent = `${payload.document.access === "owned" ? "Owned by you" : `Shared by ${payload.document.owner?.name}`} · Last saved ${formatDate(payload.document.updatedAt)}`;
  els.shareInfo.textContent = describeShares(payload.document);
  renderShareOptions(payload.document);
  renderList();
  setStatus("Ready");
}

async function createDocument(title = "Untitled document", content = "<h1>Untitled document</h1><p>Start writing here.</p>") {
  const payload = await api("/api/documents", {
    method: "POST",
    body: { ownerId: state.userId, title, content }
  });
  await loadDocuments();
  await openDocument(payload.document.id);
}

async function saveDocument() {
  if (!state.activeId) return;
  setStatus("Saving...");
  const payload = await api(`/api/documents/${state.activeId}?userId=${state.userId}`, {
    method: "PUT",
    body: { title: els.titleInput.value, content: els.editor.innerHTML }
  });
  state.dirty = false;
  await loadDocuments();
  els.docMeta.textContent = `${payload.document.ownerId === state.userId ? "Owned by you" : "Shared with you"} · Last saved ${formatDate(payload.document.updatedAt)}`;
  setStatus("Saved");
}

async function shareDocument() {
  if (!state.activeId || !els.shareSelect.value) return;
  setStatus("Sharing...");
  const payload = await api(`/api/documents/${state.activeId}/share?userId=${state.userId}`, {
    method: "POST",
    body: { targetUserId: els.shareSelect.value }
  });
  await loadDocuments();
  els.shareInfo.textContent = describeShares(payload.document);
  renderShareOptions(payload.document);
  setStatus("Shared");
}

async function importFile(file) {
  if (!file) return;
  if (!/\.(txt|md)$/i.test(file.name)) {
    setStatus("Only .txt and .md imports are supported");
    return;
  }
  const content = await file.text();
  const payload = await api("/api/import", {
    method: "POST",
    body: { ownerId: state.userId, fileName: file.name.replace(/\.[^.]+$/, ""), content }
  });
  await loadDocuments();
  await openDocument(payload.document.id);
  setStatus(`Imported ${file.name}`);
  els.fileInput.value = "";
}

function markDirty() {
  state.dirty = true;
  setStatus("Unsaved changes");
}

function setStatus(message) {
  els.status.textContent = message;
}

function describeShares(doc) {
  if (doc.access !== "owned") return "Shared documents can be edited by recipients in this demo.";
  if (!doc.sharedWith?.length) return "Not shared yet.";
  return `Shared with ${doc.sharedWith.map((user) => user.name).join(", ")}.`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

els.userSelect.addEventListener("change", async () => {
  state.userId = els.userSelect.value;
  localStorage.setItem("ajaia.userId", state.userId);
  state.activeId = null;
  els.editorShell.hidden = true;
  els.emptyState.hidden = false;
  await loadDocuments();
  if (state.documents[0]) await openDocument(state.documents[0].id);
});

els.docList.addEventListener("click", async (event) => {
  const card = event.target.closest("[data-id]");
  if (card) await openDocument(card.dataset.id);
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    document.execCommand(button.dataset.command, false, null);
    els.editor.focus();
    markDirty();
  });
});

document.querySelectorAll("[data-block]").forEach((button) => {
  button.addEventListener("click", () => {
    document.execCommand("formatBlock", false, button.dataset.block);
    els.editor.focus();
    markDirty();
  });
});

els.newDoc.addEventListener("click", () => createDocument());
els.refreshDocs.addEventListener("click", loadDocuments);
els.saveBtn.addEventListener("click", saveDocument);
els.shareBtn.addEventListener("click", shareDocument);
els.fileInput.addEventListener("change", (event) => importFile(event.target.files[0]));
els.titleInput.addEventListener("input", markDirty);
els.editor.addEventListener("input", markDirty);

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveDocument();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

boot().catch((error) => setStatus(error.message));
