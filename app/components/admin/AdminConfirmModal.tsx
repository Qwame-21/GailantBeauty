import { useState } from "react";

export function AdminConfirmModal({ count, close, confirm }: { count: number; close: () => void; confirm: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (password !== (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "gailand2026admin")) return setError("The admin password is incorrect.");
    confirm();
  };
  return <div className="gb-modal-backdrop gb-confirm-backdrop" onMouseDown={close}><div className="gb-confirm-modal" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title"><p className="gb-kicker" id="delete-title">Confirm deletion</p><h2>Delete selected records?</h2><p>This permanently deletes <strong>{count} record{count === 1 ? "" : "s"}</strong>.</p><label>ADMIN PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key === "Enter" && submit()} autoFocus/></label>{error && <p className="gb-confirm-error">{error}</p>}<div><button className="gb-danger-button" onClick={submit}>Delete {count > 1 ? "all" : "record"}</button><button className="gb-ghost" onClick={close}>Cancel</button></div></div></div>;
}
