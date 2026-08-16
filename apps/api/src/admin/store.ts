import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password.js";
import * as schema from "../store/schema.js";
import type { Scope, Store } from "../store/db.js";

export type RoleName = Scope["role"];

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  disabled: boolean;
  createdAt: string;
  role: RoleName;
  projectId: string;
};

export async function migrateUsers(store: Store): Promise<void> {
  for (const sql of [
    "ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
  ]) {
    try {
      await store.client.execute(sql);
    } catch {
      /* already exists */
    }
  }
}

function isDisabled(row: { disabled?: number | null }): boolean {
  return Boolean(row.disabled);
}

export async function listAdminUsers(store: Store, projectId: string): Promise<AdminUser[]> {
  const users = await store.orm.select().from(schema.users);
  const members = await store.orm.select().from(schema.memberships);
  return users.map((u) => {
    const onProject = members.find((m) => m.userId === u.id && m.projectId === projectId);
    const any = members.find((m) => m.userId === u.id);
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      disabled: isDisabled(u),
      createdAt: u.createdAt || "",
      role: (onProject?.role ?? any?.role ?? "viewer") as RoleName,
      projectId: onProject?.projectId ?? any?.projectId ?? projectId,
    };
  });
}

export async function createAdminUser(
  store: Store,
  input: { username: string; password: string; displayName: string; role: RoleName; projectId: string },
): Promise<AdminUser> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await store.orm.insert(schema.users).values({
    id,
    username: input.username,
    passwordHash: hashPassword(input.password),
    displayName: input.displayName || input.username,
    disabled: 0,
    createdAt,
  });
  await store.orm.insert(schema.memberships).values({
    userId: id,
    projectId: input.projectId,
    role: input.role,
  });
  return {
    id,
    username: input.username,
    displayName: input.displayName || input.username,
    disabled: false,
    createdAt,
    role: input.role,
    projectId: input.projectId,
  };
}

export async function patchAdminUser(
  store: Store,
  id: string,
  projectId: string,
  patch: { displayName?: string; disabled?: boolean; role?: RoleName; password?: string },
): Promise<AdminUser | undefined> {
  const existing = (await store.orm.select().from(schema.users).where(eq(schema.users.id, id)))[0];
  if (!existing) return undefined;
  if (patch.displayName !== undefined || patch.disabled !== undefined || patch.password) {
    await store.orm
      .update(schema.users)
      .set({
        displayName: patch.displayName ?? existing.displayName,
        disabled: patch.disabled === undefined ? existing.disabled : patch.disabled ? 1 : 0,
        passwordHash: patch.password ? hashPassword(patch.password) : existing.passwordHash,
      })
      .where(eq(schema.users.id, id));
  }
  if (patch.role) {
    const m = (
      await store.orm
        .select()
        .from(schema.memberships)
        .where(and(eq(schema.memberships.userId, id), eq(schema.memberships.projectId, projectId)))
    )[0];
    if (m) {
      await store.orm
        .update(schema.memberships)
        .set({ role: patch.role })
        .where(and(eq(schema.memberships.userId, id), eq(schema.memberships.projectId, projectId)));
    } else {
      await store.orm.insert(schema.memberships).values({ userId: id, projectId, role: patch.role });
    }
  }
  const list = await listAdminUsers(store, projectId);
  return list.find((u) => u.id === id);
}

export async function setPassword(store: Store, userId: string, password: string): Promise<void> {
  await store.orm.update(schema.users).set({ passwordHash: hashPassword(password) }).where(eq(schema.users.id, userId));
}

export async function listOrgs(store: Store) {
  return store.orm.select().from(schema.orgs);
}

export async function createOrg(store: Store, name: string) {
  const row = { id: randomUUID(), name };
  await store.orm.insert(schema.orgs).values(row);
  return row;
}

export async function listProjects(store: Store) {
  return store.orm.select().from(schema.projects);
}

export async function createProject(store: Store, orgId: string, name: string) {
  const org = (await store.orm.select().from(schema.orgs).where(eq(schema.orgs.id, orgId)))[0];
  if (!org) throw new Error("org not found");
  const row = { id: randomUUID(), orgId, name };
  await store.orm.insert(schema.projects).values(row);
  return row;
}

export async function listMembers(store: Store, projectId: string) {
  const members = await store.orm.select().from(schema.memberships).where(eq(schema.memberships.projectId, projectId));
  const users = await store.orm.select().from(schema.users);
  return members.map((m) => {
    const u = users.find((x) => x.id === m.userId);
    return {
      userId: m.userId,
      username: u?.username ?? m.userId,
      displayName: u?.displayName ?? "",
      role: m.role as RoleName,
    };
  });
}

export async function addMember(store: Store, projectId: string, userId: string, role: RoleName) {
  const user = (await store.orm.select().from(schema.users).where(eq(schema.users.id, userId)))[0];
  if (!user) throw new Error("user not found");
  const existing = (
    await store.orm
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.projectId, projectId)))
  )[0];
  if (existing) throw new Error("already a member");
  await store.orm.insert(schema.memberships).values({ userId, projectId, role });
  return { userId, username: user.username, displayName: user.displayName, role };
}

export async function patchMember(store: Store, projectId: string, userId: string, role: RoleName) {
  await store.orm
    .update(schema.memberships)
    .set({ role })
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.projectId, projectId)));
  const members = await listMembers(store, projectId);
  const row = members.find((m) => m.userId === userId);
  if (!row) throw new Error("member not found");
  return row;
}

export async function removeMember(store: Store, projectId: string, userId: string): Promise<boolean> {
  const existing = (
    await store.orm
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.projectId, projectId)))
  )[0];
  if (!existing) return false;
  await store.orm
    .delete(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.projectId, projectId)));
  return true;
}

export async function listAudit(
  store: Store,
  q: { userId?: string; pluginId?: string; limit: number; offset: number },
) {
  const rows = await store.orm.select().from(schema.audit).orderBy(desc(schema.audit.at));
  const users = await store.orm.select().from(schema.users);
  const filtered = rows.filter((r) => {
    if (q.userId && r.userId !== q.userId) return false;
    if (q.pluginId && r.pluginId !== q.pluginId) return false;
    return true;
  });
  const items = filtered.slice(q.offset, q.offset + q.limit).map((r) => ({
    id: r.id,
    at: r.at,
    userId: r.userId,
    username: users.find((u) => u.id === r.userId)?.username,
    pluginId: r.pluginId,
    method: r.method,
    path: r.path,
    status: r.status,
  }));
  return { items, total: filtered.length };
}
