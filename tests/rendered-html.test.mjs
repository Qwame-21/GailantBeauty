import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Gailant storefront", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Gailant Beauty/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("server-renders the protected admin route", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Staff Dashboard|Gailant Beauty/i);
  assert.match(html, /Private staff office|Welcome/i);
});

test("ships the Supabase admin foundation without client-side secrets", async () => {
  const [migration, cleanupRoute] = await Promise.all([
    import("node:fs/promises").then(fs => fs.readFile(new URL("../supabase/migrations/20260722_admin_foundation.sql", import.meta.url), "utf8")),
    import("node:fs/promises").then(fs => fs.readFile(new URL("../app/api/admin/delete-image/route.ts", import.meta.url), "utf8")),
  ]);
  assert.match(migration, /create table if not exists public\.staff/i);
  assert.match(migration, /create table if not exists public\.business_settings/i);
  assert.match(migration, /public\.is_admin\(\)/i);
  assert.match(cleanupRoute, /process\.env\.CLOUDINARY_API_SECRET/);
  assert.doesNotMatch(cleanupRoute, /NEXT_PUBLIC_CLOUDINARY_API_SECRET/);
});
