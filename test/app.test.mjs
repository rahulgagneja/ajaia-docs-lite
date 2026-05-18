import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "../server.mjs";
import { Store } from "../lib/store.mjs";

async function fixture() {
  const dir = await mkdtemp(join(process.cwd(), "data", "test-"));
  const store = new Store(join(dir, "store.json"));
  await store.reset();
  const server = createServer(store);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    async request(path, options = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { "content-type": "application/json", ...(options.headers || {}) },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const payload = await response.json();
      return { response, payload };
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await rm(dir, { recursive: true, force: true });
    }
  };
}

test("creates, edits, and persists rich text documents", async () => {
  const app = await fixture();
  try {
    const created = await app.request("/api/documents", {
      method: "POST",
      body: { ownerId: "ava", title: "Research notes", content: "<h1>Notes</h1><p><strong>Important</strong></p>" }
    });
    assert.equal(created.response.status, 201);

    const id = created.payload.document.id;
    const updated = await app.request(`/api/documents/${id}?userId=ava`, {
      method: "PUT",
      body: { title: "Renamed notes", content: "<h2>Updated</h2><ul><li>Saved item</li></ul>" }
    });
    assert.equal(updated.payload.document.title, "Renamed notes");

    const reopened = await app.request(`/api/documents/${id}?userId=ava`);
    assert.match(reopened.payload.document.content, /<ul><li>Saved item<\/li><\/ul>/);
  } finally {
    await app.close();
  }
});

test("keeps unshared documents private and then grants shared access", async () => {
  const app = await fixture();
  try {
    const created = await app.request("/api/documents", {
      method: "POST",
      body: { ownerId: "ava", title: "Private plan", content: "<p>Owner only</p>" }
    });
    const id = created.payload.document.id;

    const blocked = await app.request(`/api/documents/${id}?userId=cy`);
    assert.equal(blocked.response.status, 404);

    const shared = await app.request(`/api/documents/${id}/share?userId=ava`, {
      method: "POST",
      body: { targetUserId: "cy" }
    });
    assert.equal(shared.response.status, 200);

    const reopened = await app.request(`/api/documents/${id}?userId=cy`);
    assert.equal(reopened.response.status, 200);
    assert.equal(reopened.payload.document.access, "shared");
  } finally {
    await app.close();
  }
});

test("imports uploaded text content as an editable document", async () => {
  const app = await fixture();
  try {
    const imported = await app.request("/api/import", {
      method: "POST",
      body: { ownerId: "ben", fileName: "standup.md", content: "# Standup\n- One\n- Two" }
    });
    assert.equal(imported.response.status, 201);
    assert.equal(imported.payload.document.title, "standup.md");
    assert.match(imported.payload.document.content, /# Standup<br>- One<br>- Two/);
  } finally {
    await app.close();
  }
});
