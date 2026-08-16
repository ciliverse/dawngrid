import { mkdirSync } from "node:fs";
    import { dirname } from "node:path";
    import { randomUUID } from "node:crypto";
    import { createClient, type Client } from "@libsql/client";
    import { eq } from "drizzle-orm";
    import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
    import { hashPassword } from "../auth/password.js";
    import * as schema from "./schema.js";

    export type UserRow = {
      id: string;
      username: string;
      password_hash: string;
      display_name: string;
      disabled: boolean;
    };

    export type Scope = {
      orgId: string;
      orgName: string;
      projectId: string;
      projectName: string;
      role: "viewer" | "operator" | "admin";
    };

    export type AuditRow = {
      id: string;
      at: string;
      user_id: string;
      plugin_id: string;
      method: string;
      path: string;
      status: number;
    };

    export type Store = {
      path: string;
      client: Client;
      orm: LibSQLDatabase<typeof schema>;
    };

    const DDL = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        disabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS orgs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memberships (
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        role TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS plugin_enabled (
        id TEXT PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS embeds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        href TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        user_id TEXT NOT NULL,
        plugin_id TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status INTEGER NOT NULL
      );
    `;

    export async function openDb(path: string): Promise<Store> {
      mkdirSync(dirname(path), { recursive: true });
      const url = path.startsWith("file:") ? path : `file:${path}`;
      const client = createClient({ url });
      await client.executeMultiple(DDL);
      const store = { path, client, orm: drizzle(client, { schema }) };
      for (const sql of [
        "ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
      ]) {
        try {
          await client.execute(sql);
        } catch {
          /* column exists */
        }
      }
      return store;
    }

    export async function bootstrap(store: Store, username: string, password: string): Promise<void> {
      const existing = await store.orm.select().from(schema.users).where(eq(schema.users.username, username));
      if (existing[0]) return;
      const userId = randomUUID();
      const orgId = randomUUID();
      const projectId = randomUUID();
      await store.orm.insert(schema.users).values({
        id: userId,
        username,
        passwordHash: hashPassword(password),
        displayName: username,
        disabled: 0,
        createdAt: new Date().toISOString(),
      });
      await store.orm.insert(schema.orgs).values({ id: orgId, name: "Default" });
      await store.orm.insert(schema.projects).values({ id: projectId, orgId, name: "Default" });
      await store.orm.insert(schema.memberships).values({ userId, projectId, role: "admin" });
    }

    export async function findUserByUsername(store: Store, username: string): Promise<UserRow | undefined> {
      const row = (await store.orm.select().from(schema.users).where(eq(schema.users.username, username)))[0];
      return row ? toUser(row) : undefined;
    }

    export async function findUserById(store: Store, id: string): Promise<UserRow | undefined> {
      const row = (await store.orm.select().from(schema.users).where(eq(schema.users.id, id)))[0];
      return row ? toUser(row) : undefined;
    }

    export async function createSession(store: Store, userId: string, ttlSec = 3600): Promise<string> {
      const id = randomUUID();
      await store.orm.insert(schema.sessions).values({
        id,
        userId,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSec,
      });
      return id;
    }

    export async function sessionValid(store: Store, sid: string): Promise<boolean> {
      const row = (await store.orm.select().from(schema.sessions).where(eq(schema.sessions.id, sid)))[0];
      if (!row) return false;
      return row.expiresAt > Math.floor(Date.now() / 1000);
    }

    export async function userScope(store: Store, userId: string): Promise<Scope | undefined> {
      const m = (await store.orm.select().from(schema.memberships).where(eq(schema.memberships.userId, userId)))[0];
      if (!m) return undefined;
      return userScopeForProject(store, userId, m.projectId);
    }

    export async function userScopeForProject(
      store: Store,
      userId: string,
      projectId: string,
    ): Promise<Scope | undefined> {
      const members = await store.orm.select().from(schema.memberships).where(eq(schema.memberships.userId, userId));
      const m = members.find((x) => x.projectId === projectId);
      if (!m) return undefined;
      const project = (await store.orm.select().from(schema.projects).where(eq(schema.projects.id, m.projectId)))[0];
      const org = project
        ? (await store.orm.select().from(schema.orgs).where(eq(schema.orgs.id, project.orgId)))[0]
        : undefined;
      if (!project || !org) return undefined;
      return {
        orgId: org.id,
        orgName: org.name,
        projectId: project.id,
        projectName: project.name,
        role: m.role as Scope["role"],
      };
    }

    export async function recordAudit(store: Store, row: Omit<AuditRow, "id" | "at">): Promise<void> {
      await store.orm.insert(schema.audit).values({
        id: randomUUID(),
        at: new Date().toISOString(),
        userId: row.user_id,
        pluginId: row.plugin_id,
        method: row.method,
        path: row.path,
        status: row.status,
      });
    }

    export type EmbedRow = {
      id: string;
      name: string;
      href: string;
      createdAt: string;
    };

    export async function listEmbeds(store: Store): Promise<EmbedRow[]> {
      return store.orm.select().from(schema.embeds);
    }

    export async function getEmbed(store: Store, id: string): Promise<EmbedRow | undefined> {
      return (await store.orm.select().from(schema.embeds).where(eq(schema.embeds.id, id)))[0];
    }

    export async function createEmbed(
      store: Store,
      row: { id: string; name: string; href: string },
    ): Promise<EmbedRow> {
      const createdAt = new Date().toISOString();
      await store.orm.insert(schema.embeds).values({ ...row, createdAt });
      return { ...row, createdAt };
    }

    export async function deleteEmbed(store: Store, id: string): Promise<boolean> {
      const existing = await getEmbed(store, id);
      if (!existing) return false;
      await store.orm.delete(schema.embeds).where(eq(schema.embeds.id, id));
      return true;
    }

    export async function listPluginEnabled(store: Store): Promise<string[]> {
      const rows = await store.orm.select().from(schema.pluginEnabled);
      return rows.map((row) => row.id);
    }

    export async function seedPluginEnabled(store: Store, ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      await store.orm.insert(schema.pluginEnabled).values(ids.map((id) => ({ id })));
    }

    export async function setPluginEnabled(store: Store, id: string, enabled: boolean): Promise<void> {
      if (enabled) {
        const existing = await store.orm
          .select()
          .from(schema.pluginEnabled)
          .where(eq(schema.pluginEnabled.id, id));
        if (existing[0]) return;
        await store.orm.insert(schema.pluginEnabled).values({ id });
        return;
      }
      await store.orm.delete(schema.pluginEnabled).where(eq(schema.pluginEnabled.id, id));
    }

    export async function updateEmbed(
      store: Store,
      id: string,
      patch: { name?: string; href?: string },
    ): Promise<EmbedRow | undefined> {
      const existing = await getEmbed(store, id);
      if (!existing) return undefined;
      const next = {
        name: patch.name ?? existing.name,
        href: patch.href ?? existing.href,
      };
      await store.orm.update(schema.embeds).set(next).where(eq(schema.embeds.id, id));
      return { ...existing, ...next };
    }

    function toUser(row: typeof schema.users.$inferSelect): UserRow {
      return {
        id: row.id,
        username: row.username,
        password_hash: row.passwordHash,
        display_name: row.displayName,
        disabled: Boolean(row.disabled),
      };
    }
