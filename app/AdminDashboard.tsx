"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, CalendarDays, Check, ChevronDown, Download, Eye, EyeOff,
  LayoutDashboard, LogOut, Menu, MessageSquareText, Package, Plus,
  Search, Settings, ShoppingBag, Sparkles, Star, TrendingUp, Users, X,
} from "lucide-react";
import { BRAND, PRODUCTS, SERVICES, TESTIMONIALS } from "./constants";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type View = "Overview" | "Bookings" | "Consultations" | "Orders" | "Services" | "Products" | "Clients" | "Reviews" | "Insights" | "Settings";
type Row = { id: string; primary: string; secondary: string; detail: string; status: string; created?: string; raw?: Record<string, unknown> };

const nav: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Bookings", icon: CalendarDays },
  { label: "Consultations", icon: MessageSquareText }, { label: "Orders", icon: ShoppingBag },
  { label: "Services", icon: Sparkles }, { label: "Products", icon: Package },
  { label: "Clients", icon: Users }, { label: "Reviews", icon: Star },
  { label: "Insights", icon: TrendingUp }, { label: "Settings", icon: Settings },
];

const seeds: Record<string, Row[]> = {
  Bookings: [
    { id: "GB-B-1042", primary: "Abena Mansa", secondary: "Knotless Braids (Long)", detail: "24 Jul · 10:00 AM", status: "confirmed" },
    { id: "GB-B-1041", primary: "Efya Mensah", secondary: "Signature Gel Set", detail: "26 Jul · 2:00 PM", status: "rescheduled" },
    { id: "GB-B-1039", primary: "Akosua Addo", secondary: "Soft Glam · Home service", detail: "27 Jul · 11:00 AM", status: "pending" },
  ],
  Consultations: [
    { id: "GB-C-302", primary: "Nana Yaa", secondary: "Locs Consultation", detail: "055 212 1403", status: "new" },
    { id: "GB-C-301", primary: "Kwadwo Antwi", secondary: "Beauty Training", detail: "020 337 8821", status: "contacted" },
  ],
  Orders: [
    { id: "GB-O-721", primary: "Kofi Owusu", secondary: "The Accra Bob", detail: "GH₵ 950", status: "packaged" },
    { id: "GB-O-720", primary: "Ama Serwaa", secondary: "Crown Melt Band", detail: "GH₵ 60", status: "paid" },
  ],
  Services: SERVICES.map(s => ({ id: s.id, primary: s.name, secondary: s.category, detail: s.consultation ? "Consultation" : `GH₵ ${s.price} · ${s.duration}`, status: "active" })),
  Products: PRODUCTS.map(p => ({ id: p.id, primary: p.name, secondary: p.category, detail: `GH₵ ${p.price}`, status: "active" })),
  Clients: [
    { id: "C-109", primary: "Abena Mansa", secondary: "055 340 2281", detail: "4 visits · GH₵ 1,470", status: "returning" },
    { id: "C-108", primary: "Efya Mensah", secondary: "020 818 0147", detail: "2 visits · GH₵ 540", status: "returning" },
    { id: "C-107", primary: "Akosua Addo", secondary: "024 002 9184", detail: "First booking", status: "new" },
  ],
  Reviews: TESTIMONIALS.map((r, i) => ({ id: `R-${i + 1}`, primary: r.name, secondary: r.service, detail: `${r.rating} stars · “${r.quote.slice(0, 42)}…”`, status: "published" })),
};

const tableFor: Partial<Record<View, string>> = { Bookings: "bookings", Consultations: "consultation_requests", Orders: "orders", Services: "services", Products: "products", Reviews: "testimonials" };
const statuses: Partial<Record<View, string[]>> = {
  Bookings: ["pending", "confirmed", "in service", "completed", "rescheduled", "canceled"],
  Consultations: ["new", "contacted", "booked", "closed"], Orders: ["pending payment", "paid", "packaged", "dispatched", "delivered", "canceled"],
  Services: ["active", "inactive"], Products: ["active", "low stock", "sold out", "inactive"], Reviews: ["published", "hidden"],
};

function mapRemote(view: View, item: Record<string, unknown>): Row {
  const name = String(item.name || item.customer_name || "Untitled");
  if (view === "Bookings") return { id: String(item.reference || item.id), primary: name, secondary: String(item.service_name || "Service booking"), detail: `${item.appointment_date || "Date pending"} · ${item.appointment_time || "Time pending"}`, status: String(item.status || "pending"), raw: item };
  if (view === "Consultations") return { id: String(item.reference || item.id), primary: name, secondary: String(item.service_name || "Consultation"), detail: String(item.phone || item.email || "Contact pending"), status: String(item.status || "new"), raw: item };
  if (view === "Orders") return { id: String(item.reference || item.id), primary: name, secondary: `${Array.isArray(item.items) ? item.items.length : 0} item(s)`, detail: `GH₵ ${Number(item.total_amount || 0).toLocaleString()}`, status: String(item.status || item.payment_status || "pending"), raw: item };
  if (view === "Reviews") return { id: String(item.id), primary: String(item.customer_name || "Client"), secondary: String(item.service_name || "Gailand Beauty"), detail: `${item.rating || 5} stars · “${String(item.quote || "").slice(0, 42)}…”`, status: item.published ? "published" : "hidden", raw: item };
  return { id: String(item.id), primary: name, secondary: String(item.category || "General"), detail: item.price != null ? `GH₵ ${Number(item.price).toLocaleString()}` : "", status: item.active === false ? "inactive" : "active", raw: item };
}

export function GailandAdmin() {
  const [authenticated, setAuthenticated] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("gailand-admin-session") === "active");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState<View>("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [rows, setRows] = useState<Record<string, Row[]>>(seeds);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<null | { mode: "add" | "edit"; row?: Row }>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated || !isSupabaseConfigured) return;
    const load = async () => {
      setLoading(true);
      const updates: Record<string, Row[]> = {};
      for (const [label, table] of Object.entries(tableFor)) {
        const { data } = await supabase!.from(table).select("*").order("created_at", { ascending: false }).limit(100);
        if (data?.length) updates[label] = data.map(item => mapRemote(label as View, item));
      }
      setRows(current => ({ ...current, ...updates })); setLoading(false);
    };
    load();
  }, [authenticated]);

  const login = (form: FormData) => {
    const user = String(form.get("username") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    if (user === (process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin").toLowerCase() && password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "gailand2026admin")) {
      sessionStorage.setItem("gailand-admin-session", "active"); setAuthenticated(true); setLoginError("");
    } else setLoginError("Those details don’t match the staff account.");
  };

  if (!authenticated) return <main className="gb-admin-login">
    <section><Link href="/" className="gb-login-brand"><span>GAILAND</span><small>BEAUTY</small></Link><div className="gb-login-card">
      <p className="gb-kicker">Private staff office</p><h1>Welcome<br/><em>back.</em></h1><p>Manage appointments, clients, services and the Gailand shop from one place.</p>
      <form action={login}><label>USERNAME<input name="username" autoComplete="username" placeholder="Admin username" required /></label><label>PASSWORD<div className="gb-password"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" required/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Show or hide password">{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>{loginError && <p className="gb-error">{loginError}</p>}<button className="gb-primary">Enter dashboard <span>→</span></button></form><Link href="/" className="gb-back">← Return to main website</Link>
    </div></section><aside><div className="gb-login-orb"><small>THE GAILAND OFFICE</small><strong>GB</strong><span>Beauty, crowned.</span></div></aside>
  </main>;

  const activeRows = rows[view] || [];
  const filtered = activeRows.filter(r => (statusFilter === "all" || r.status === statusFilter) && `${r.primary} ${r.secondary} ${r.id}`.toLowerCase().includes(search.toLowerCase()));
  const logout = () => { sessionStorage.removeItem("gailand-admin-session"); setAuthenticated(false); };
  const go = (next: View) => { setView(next); setSearch(""); setStatusFilter("all"); setMobileNav(false); };

  const updateStatus = async (row: Row, status: string) => {
    setRows(current => ({ ...current, [view]: current[view].map(r => r.id === row.id ? { ...r, status } : r) }));
    const table = tableFor[view]; const remoteId = row.raw?.id;
    if (table && remoteId && supabase) await supabase.from(table).update(view === "Reviews" ? { published: status === "published" } : view === "Services" || view === "Products" ? { active: status === "active" } : { status: status.replaceAll(" ", "_") }).eq("id", remoteId);
    setNotice(`${row.primary} updated to ${status}.`);
  };
  const saveEntry = async (data: { primary: string; secondary: string; detail: string; status: string }) => {
    const row = modal?.row;
    if (row) setRows(current => ({ ...current, [view]: current[view].map(r => r.id === row.id ? { ...r, ...data } : r) }));
    else setRows(current => ({ ...current, [view]: [{ id: `GB-${Date.now().toString().slice(-6)}`, ...data }, ...(current[view] || [])] }));
    setModal(null); setNotice(row ? "Entry updated." : "New entry added.");
  };
  const exportCsv = () => {
    const values = [["Reference", "Name", "Service / Category", "Details", "Status"], ...filtered.map(r => [r.id, r.primary, r.secondary, r.detail, r.status])];
    const blob = new Blob([values.map(x => x.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `gailand-${view.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <main className="gb-admin-shell">
    <aside className={`gb-admin-side ${mobileNav ? "open" : ""}`}><div className="gb-side-brand"><span>GAILAND</span><small>BEAUTY · ADMIN</small></div><nav>{nav.map(item => <button key={item.label} className={view === item.label ? "active" : ""} onClick={() => go(item.label)}><item.icon size={17}/><span>{item.label}</span>{(["Bookings","Consultations","Orders"].includes(item.label)) && <b>{rows[item.label]?.length || 0}</b>}</button>)}</nav><div className="gb-side-foot"><Link href="/">View main website ↗</Link><button onClick={logout}><LogOut size={16}/> Sign out</button></div></aside>
    <section className="gb-admin-work"><header className="gb-admin-top"><button className="gb-mobile-menu" onClick={() => setMobileNav(v => !v)} aria-label="Open navigation">{mobileNav ? <X/> : <Menu/>}</button><div><p className="gb-kicker">Gailand operations</p><h1>{view}</h1></div><div className="gb-top-actions"><span className={`gb-connection ${isSupabaseConfigured ? "live" : ""}`}><i/>{isSupabaseConfigured ? "Live data" : "Preview data"}</span><button className="gb-icon-button" onClick={() => go("Bookings")} aria-label="Notifications"><Bell size={18}/><b>{rows.Bookings?.filter(r => r.status === "pending").length || 0}</b></button>{view !== "Overview" && view !== "Insights" && view !== "Settings" && <button className="gb-primary compact" onClick={() => setModal({ mode: "add" })}><Plus size={16}/> Add new</button>}</div></header>
      {loading && <div className="gb-loading">Refreshing Gailand records…</div>}
      {view === "Overview" ? <Overview rows={rows} go={go}/> : view === "Insights" ? <Insights rows={rows}/> : view === "Settings" ? <SettingsPanel configured={isSupabaseConfigured}/> : <section className="gb-data-card"><div className="gb-table-tools"><label><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${view.toLowerCase()}…`}/></label><div><label className="gb-select">Status <ChevronDown size={14}/><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All</option>{[...new Set(activeRows.map(r => r.status))].map(s => <option key={s}>{s}</option>)}</select></label><button onClick={exportCsv}><Download size={16}/> Export CSV</button></div></div><div className="gb-table"><div className="gb-tr gb-th"><span>Name / reference</span><span>Service / category</span><span>Details</span><span>Status</span><span>Action</span></div>{filtered.map(row => <div className="gb-tr" key={row.id}><span><strong>{row.primary}</strong><small>{row.id}</small></span><span>{row.secondary}</span><span>{row.detail}</span><span><select className={`gb-status ${row.status.replaceAll(" ", "-")}`} value={row.status} onChange={e => updateStatus(row, e.target.value)}>{(statuses[view] || [row.status]).map(s => <option key={s}>{s}</option>)}</select></span><span><button className="gb-edit" onClick={() => setModal({ mode: "edit", row })}>Edit</button></span></div>)}{filtered.length === 0 && <div className="gb-empty">No matching {view.toLowerCase()} found.</div>}</div></section>}
    </section>
    {modal && <EntryModal view={view} row={modal.row} close={() => setModal(null)} save={saveEntry}/>} {notice && <div className="gb-toast"><Check size={16}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
  </main>;
}

function Overview({ rows, go }: { rows: Record<string, Row[]>; go: (v: View) => void }) {
  const stats = [{ label: "Today’s bookings", value: "6", note: "+2 from yesterday", icon: CalendarDays }, { label: "Pending orders", value: rows.Orders?.length || 0, note: "2 ready to package", icon: ShoppingBag }, { label: "Month revenue", value: "GH₵ 8,420", note: "+18.4% this month", icon: TrendingUp }, { label: "New consultations", value: rows.Consultations?.filter(r => r.status === "new").length || 0, note: "Awaiting a response", icon: MessageSquareText }];
  return <><div className="gb-welcome"><div><p className="gb-kicker">Wednesday, 22 July</p><h2>Good morning, Gailand.</h2><p>Here’s what needs your attention across the studio today.</p></div><button className="gb-primary" onClick={() => go("Bookings")}><CalendarDays size={16}/> Open schedule</button></div><div className="gb-stat-grid">{stats.map(s => <article key={s.label}><div><span>{s.label}</span><s.icon size={18}/></div><strong>{s.value}</strong><small>{s.note}</small></article>)}</div><div className="gb-overview-grid"><section className="gb-panel"><header><div><p className="gb-kicker">Studio diary</p><h3>Today’s appointments</h3></div><button onClick={() => go("Bookings")}>View all →</button></header>{rows.Bookings?.map((r, i) => <div className="gb-agenda" key={r.id}><time>{["09:00","11:30","14:00"][i] || "16:00"}</time><span><strong>{r.primary}</strong><small>{r.secondary}</small></span><b className={`gb-dot ${r.status}`}/><em>{r.status}</em></div>)}</section><section className="gb-panel gb-attention"><header><div><p className="gb-kicker">Action centre</p><h3>Needs attention</h3></div></header><button onClick={() => go("Consultations")}><span><MessageSquareText/><b>New consultations</b><small>Reply and turn enquiries into bookings</small></span><strong>{rows.Consultations?.filter(r => r.status === "new").length || 0}</strong></button><button onClick={() => go("Orders")}><span><Package/><b>Orders to package</b><small>Prepare paid items for dispatch</small></span><strong>2</strong></button><button onClick={() => go("Reviews")}><span><Star/><b>Reviews awaiting approval</b><small>Keep the storefront testimonials fresh</small></span><strong>1</strong></button></section></div></>;
}

function Insights({ rows }: { rows: Record<string, Row[]> }) { return <div className="gb-insights"><div className="gb-stat-grid"><article><span>Appointment conversion</span><strong>74%</strong><small>Consultation to booking</small></article><article><span>Average order value</span><strong>GH₵ 505</strong><small>Across shop orders</small></article><article><span>Returning clients</span><strong>62%</strong><small>Last 90 days</small></article><article><span>Home services</span><strong>28%</strong><small>Of all bookings</small></article></div><section className="gb-chart"><header><div><p className="gb-kicker">Revenue pulse</p><h3>Last seven days</h3></div><strong>GH₵ 3,860</strong></header><div className="gb-bars">{[42,65,48,82,70,94,58].map((n,i) => <div key={i}><span style={{height:`${n}%`}}/><small>{["Thu","Fri","Sat","Sun","Mon","Tue","Wed"][i]}</small></div>)}</div></section><p className="gb-insight-note">Based on {Object.values(rows).reduce((n,r) => n+r.length,0)} visible records. Connect Supabase for live reporting.</p></div> }

function SettingsPanel({ configured }: { configured: boolean }) { return <section className="gb-settings"><div><p className="gb-kicker">Business profile</p><h3>Studio details</h3><label>BUSINESS NAME<input defaultValue={BRAND.name}/></label><label>LOCATION<input defaultValue={BRAND.location}/></label><div className="gb-two"><label>PRIMARY PHONE<input defaultValue={BRAND.primaryPhone}/></label><label>SECONDARY PHONE<input defaultValue={BRAND.secondaryPhone}/></label></div><label>OPENING HOURS<input defaultValue={BRAND.hours}/></label><button className="gb-primary" onClick={() => alert("Settings saved for this preview.")}>Save changes</button></div><aside><p className="gb-kicker">Connection</p><h3>{configured ? "Main site connected" : "Preview mode active"}</h3><p>{configured ? "New bookings, consultations and orders from the website are loading into this office." : "Add the Supabase details from the project guide to receive live website records here."}</p><span className={`gb-connection ${configured ? "live" : ""}`}><i/>{configured ? "Connected" : "Setup required"}</span></aside></section> }

function EntryModal({ view, row, close, save }: { view: View; row?: Row; close: () => void; save: (d: { primary:string; secondary:string; detail:string; status:string }) => void }) { const [primary,setPrimary]=useState(row?.primary||""); const [secondary,setSecondary]=useState(row?.secondary||""); const [detail,setDetail]=useState(row?.detail||""); const [status,setStatus]=useState(row?.status||statuses[view]?.[0]||"active"); return <div className="gb-modal-backdrop" onMouseDown={close}><form className="gb-entry-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();save({primary,secondary,detail,status})}}><button type="button" className="gb-modal-close" onClick={close}><X/></button><p className="gb-kicker">{row ? "Edit" : "Create"} record</p><h2>{row ? `Update ${view.slice(0,-1)}` : `New ${view.slice(0,-1)}`}</h2><label>NAME / TITLE<input required value={primary} onChange={e=>setPrimary(e.target.value)}/></label><label>SERVICE / CATEGORY<input required value={secondary} onChange={e=>setSecondary(e.target.value)}/></label><label>DETAILS<input required value={detail} onChange={e=>setDetail(e.target.value)}/></label><label>STATUS<select value={status} onChange={e=>setStatus(e.target.value)}>{(statuses[view]||[status]).map(s=><option key={s}>{s}</option>)}</select></label><button className="gb-primary">{row ? "Save changes" : "Add to Gailand"}</button></form></div> }
