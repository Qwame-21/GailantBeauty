import fs from "node:fs";

const expected = "ihepxaajuohicvfogurk";
const blocked = new Set(["eksgpzcdasftmpcqrmwv"]);
const files = process.argv.slice(2);
if (!files.length) files.push(".env.local");

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
  if (!match) throw new Error(`${file}: NEXT_PUBLIC_SUPABASE_URL is missing.`);
  const url = match[1].trim().replace(/^"|"$/g, "");
  const ref = new URL(url).hostname.split(".")[0];
  if (blocked.has(ref)) throw new Error(`${file}: blocked legacy Supabase project is still configured.`);
  if (ref !== expected) throw new Error(`${file}: expected project ${expected}, found ${ref}.`);
  const key = text.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
  if (!key) throw new Error(`${file}: public Supabase key is missing.`);
  if (key.startsWith("sb_secret_")) throw new Error(`${file}: a secret key was placed in a browser variable.`);
  console.log(`PASS ${file}: points to the new Gailant project with a browser-safe public key`);
}
