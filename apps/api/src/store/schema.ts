import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  disabled: integer("disabled").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const orgs = sqliteTable("orgs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
});

export const memberships = sqliteTable("memberships", {
  userId: text("user_id").notNull(),
  projectId: text("project_id").notNull(),
  role: text("role").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const pluginEnabled = sqliteTable("plugin_enabled", {
  id: text("id").primaryKey(),
});

export const embeds = sqliteTable("embeds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  href: text("href").notNull(),
  createdAt: text("created_at").notNull(),
});

export const audit = sqliteTable("audit", {
  id: text("id").primaryKey(),
  at: text("at").notNull(),
  userId: text("user_id").notNull(),
  pluginId: text("plugin_id").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  status: integer("status").notNull(),
});
