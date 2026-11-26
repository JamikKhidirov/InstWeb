import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Очень простой JSON-стор для демо-проекта.
 * Для реального продакшена с десятками тысяч пользователей
 * замените на PostgreSQL/SQLite — интерфейс ниже это позволяет.
 */

let users = [];
let filePath = "";
let writeChain = Promise.resolve();

export async function initStore(dataDir) {
  await fs.mkdir(dataDir, { recursive: true });
  filePath = path.join(dataDir, "users.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    users = Array.isArray(parsed.users) ? parsed.users : [];
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    users = [];
    await persist();
  }
  return { count: users.length, filePath };
}

function persist() {
  const snapshot = JSON.stringify({ users }, null, 2);
  const tmp = `${filePath}.tmp`;
  writeChain = writeChain.then(async () => {
    await fs.writeFile(tmp, snapshot, { mode: 0o600 });
    await fs.rename(tmp, filePath);
  });
  return writeChain;
}

const norm = (value) => String(value || "").trim().toLowerCase();

export function findById(id) {
  return users.find((u) => u.id === id) || null;
}

export function findByLogin(login) {
  const value = norm(login);
  if (!value) return null;
  return users.find((u) => norm(u.email) === value || norm(u.username) === value) || null;
}

export function isTaken(email, username) {
  const e = norm(email);
  const u = norm(username);
  return users.some((user) => norm(user.email) === e || norm(user.username) === u);
}

export async function createUser({ email, username, passwordHash }) {
  const user = {
    id: crypto.randomUUID(),
    email: norm(email),
    username: norm(username),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await persist();
  return user;
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt };
}
