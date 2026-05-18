import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const now = () => new Date().toISOString();

const seed = () => ({
  users: [
    { id: "ava", name: "Ava Product", email: "ava@ajaia.local" },
    { id: "ben", name: "Ben Design", email: "ben@ajaia.local" },
    { id: "cy", name: "Cy Engineering", email: "cy@ajaia.local" }
  ],
  documents: [
    {
      id: "welcome",
      title: "Launch plan draft",
      ownerId: "ava",
      content:
        "<h1>Launch plan draft</h1><p>This seeded document shows rich text persistence, sharing, and editing.</p><ul><li>Rename the document</li><li>Share it with Ben or Cy</li><li>Upload a .txt or .md file to create another draft</li></ul>",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  shares: [{ documentId: "welcome", userId: "ben", role: "editor", createdAt: now() }]
});

export class Store {
  constructor(filePath = "data/store.json") {
    this.filePath = filePath;
    this.data = null;
  }

  async load() {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(await readFile(this.filePath, "utf8"));
    } catch {
      this.data = seed();
      await this.save();
    }
    return this.data;
  }

  async save() {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async reset() {
    this.data = seed();
    await this.save();
    return this.data;
  }

  async users() {
    return (await this.load()).users;
  }

  async listDocuments(userId) {
    const data = await this.load();
    return data.documents
      .filter((doc) => this.canAccessSync(data, doc.id, userId))
      .map((doc) => ({
        ...doc,
        access: doc.ownerId === userId ? "owned" : "shared",
        owner: data.users.find((user) => user.id === doc.ownerId),
        sharedWith: data.shares
          .filter((share) => share.documentId === doc.id)
          .map((share) => data.users.find((user) => user.id === share.userId))
          .filter(Boolean)
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getDocument(id, userId) {
    const data = await this.load();
    const doc = data.documents.find((item) => item.id === id);
    if (!doc || !this.canAccessSync(data, id, userId)) return null;
    return {
      ...doc,
      access: doc.ownerId === userId ? "owned" : "shared",
      owner: data.users.find((user) => user.id === doc.ownerId),
      sharedWith: data.shares
        .filter((share) => share.documentId === id)
        .map((share) => data.users.find((user) => user.id === share.userId))
        .filter(Boolean)
    };
  }

  async createDocument({ ownerId, title, content = "<p></p>" }) {
    const data = await this.load();
    if (!data.users.some((user) => user.id === ownerId)) throw new Error("Unknown owner");
    const doc = {
      id: randomUUID(),
      ownerId,
      title: cleanTitle(title),
      content: sanitizeHtml(content),
      createdAt: now(),
      updatedAt: now()
    };
    data.documents.push(doc);
    await this.save();
    return doc;
  }

  async updateDocument(id, userId, patch) {
    const data = await this.load();
    const doc = data.documents.find((item) => item.id === id);
    if (!doc || !this.canAccessSync(data, id, userId)) return null;
    if (patch.title !== undefined) doc.title = cleanTitle(patch.title);
    if (patch.content !== undefined) doc.content = sanitizeHtml(patch.content);
    doc.updatedAt = now();
    await this.save();
    return doc;
  }

  async shareDocument(id, ownerId, targetUserId) {
    const data = await this.load();
    const doc = data.documents.find((item) => item.id === id);
    if (!doc || doc.ownerId !== ownerId) return null;
    if (!data.users.some((user) => user.id === targetUserId)) throw new Error("Unknown user");
    if (targetUserId === ownerId) throw new Error("Owners already have access");
    const existing = data.shares.find((share) => share.documentId === id && share.userId === targetUserId);
    if (!existing) {
      data.shares.push({ documentId: id, userId: targetUserId, role: "editor", createdAt: now() });
      await this.save();
    }
    return this.getDocument(id, ownerId);
  }

  canAccessSync(data, documentId, userId) {
    const doc = data.documents.find((item) => item.id === documentId);
    return Boolean(doc && (doc.ownerId === userId || data.shares.some((share) => share.documentId === documentId && share.userId === userId)));
  }
}

export function cleanTitle(title) {
  const value = String(title || "").trim();
  if (value.length < 1) throw new Error("Title is required");
  return value.slice(0, 120);
}

export function sanitizeHtml(html) {
  return String(html || "<p></p>")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}
