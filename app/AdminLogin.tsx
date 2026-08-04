"use client";

import { useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, signInAdmin } from "./lib/supabase";

export function AdminLogin({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="adm-login"><section><div className="adm-login-brand">G</div><p className="adm-kicker">PRIVATE STUDIO</p><h1>Welcome back.</h1><p>Sign in with your Gailant Beauty administrator account.</p><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); const result = await signInAdmin(email.trim().toLowerCase(), password); setBusy(false); if (!result.error && (!result.local || !isSupabaseConfigured)) { if (onSuccess) onSuccess(); else window.location.assign("/admin"); } else setError(result.error || "Unable to sign in."); }}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <div className="adm-error">{error}</div>}<button className="adm-primary" disabled={busy}>{busy ? "Signing in…" : "Enter admin"}</button></form><Link href="/">← Return to storefront</Link></section><aside><p>BEAUTY, CROWNED.</p><h2>Operations<br />with grace.</h2><a href="https://ayaaba.netlify.app" target="_blank" rel="noreferrer">Built by Ayaaba</a></aside></main>;
}
