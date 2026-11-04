#!/usr/bin/env node
/**
 * Generates the "Secret Key" Supabase needs for Sign in with Apple (web).
 * Apple caps it at 6 months, so re-run this and paste the new value into
 * Supabase → Authentication → Sign In / Providers → Apple before it expires.
 *
 * Usage:
 *   node scripts/apple-client-secret.mjs --team TEAMID --key KEYID --client com.example.steady.web --p8 ./AuthKey_KEYID.p8
 *
 * Runs locally; your .p8 never leaves your machine. Do not commit the .p8.
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith("--") ? [...acc, [v.slice(2), all[i + 1]]] : acc), []),
);
const { team, key, client, p8 } = args;
if (!team || !key || !client || !p8) {
  console.error("Usage: node scripts/apple-client-secret.mjs --team TEAMID --key KEYID --client SERVICES_ID --p8 path/to/AuthKey.p8");
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const expires = now + 180 * 24 * 60 * 60; // 180 days, inside Apple's 6-month limit
const header = b64url(JSON.stringify({ alg: "ES256", kid: key, typ: "JWT" }));
const payload = b64url(JSON.stringify({ iss: team, iat: now, exp: expires, aud: "https://appleid.apple.com", sub: client }));
const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
  key: createPrivateKey(readFileSync(p8, "utf8")),
  dsaEncoding: "ieee-p1363",
});

console.log(`${header}.${payload}.${b64url(signature)}`);
console.error(`\nExpires ${new Date(expires * 1000).toDateString()}. Set a reminder to regenerate it before then.`);
