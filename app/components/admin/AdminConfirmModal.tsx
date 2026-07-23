import { useState } from "react";
import { reauthenticateAdmin } from "../../lib/supabase";

export function AdminConfirmModal({ count, close, confirm }: { count: number; close: () => void; confirm: () => void | Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const submit = async () => {
    if (!password || checking) return;
    setChecking(true);
    setError("");
    const result = await reauthenticateAdmin(password);
    if (result.error) {
      setError(result.error);
      setChecking(false);
      return;
    }
    await confirm();
    setChecking(false);
  };
  return <div className="gb-modal-backdrop gb-confirm-backdrop" onMouseDown={close}><div className="gb-confirm-modal" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title"><p className="gb-kicker" id="delete-title">Confirm deletion</p><h2>Delete selected records?</h2><p>This permanently deletes <strong>{count} record{count === 1 ? "" : "s"}</strong>.</p><label>ADMIN PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key === "Enter" && submit()} autoFocus/></label>{error && <p className="gb-confirm-error">{error}</p>}<div><button className="gb-danger-button" onClick={submit} disabled={checking}>{checking ? "Checking…" : `Delete ${count > 1 ? "all" : "record"}`}</button><button className="gb-ghost" onClick={close}>Cancel</button></div></div></div>;
}
