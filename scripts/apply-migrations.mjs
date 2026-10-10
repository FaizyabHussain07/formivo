/**
 * One-shot remote migration runner.
 * Connects to Supabase Postgres through the IPv4 session pooler and applies
 * supabase/migrations/*.sql in filename order, one transaction per file.
 * Tracks applied files in supabase_migrations.schema_migrations.
 *
 * Usage: node scripts/apply-migrations.mjs
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const env = {};
fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

// db.<ref>.supabase.co resolves IPv6-only on this network; use the pooler.
const url = new URL(env.DATABASE_URL);
const password = url.password; // decoded automatically
const username = url.username;
const poolerUrl =
  `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}` +
  `@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;

const client = new pg.Client({
  host: "18.213.155.45", // aws-1-us-east-1.pooler.supabase.com (local DNS is flaky)
  port: 5432,
  database: "postgres",
  user: username.startsWith("postgres.") ? username : `postgres.${username}`,
  password,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

await client.query(`create schema if not exists supabase_migrations`);
await client.query(`
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key,
    name text not null,
    statements text[],
    name_statements text[],
    statements_up text[],
    statements_down text[],
    complete boolean not null default true,
    statements_totalsize int8 not null default 0
  )
`);

const dir = path.resolve("supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const version = file.replace(/\.sql$/, "").split("_")[0];
  const name = file.replace(/\.sql$/, "");

  const applied = await client.query(
    "select 1 from supabase_migrations.schema_migrations where version = $1",
    [version],
  );
  if (applied.rowCount > 0) {
    console.log(`= ${name} (already applied)`);
    continue;
  }

  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(
      "insert into supabase_migrations.schema_migrations (version, name, complete) values ($1, $2, true)",
      [version, name],
    );
    await client.query("commit");
    console.log(`✓ ${name}`);
  } catch (err) {
    await client.query("rollback");
    console.error(`✗ ${name}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("migrations done");
