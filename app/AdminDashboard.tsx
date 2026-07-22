"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronsLeft, ChevronsRight, Download, Eye, EyeOff,
  LayoutDashboard, LogOut, Menu, MessageSquareText, Package, Plus,
  Search, Settings, ShoppingBag, Sparkles, Star, Store, Trash2, TrendingUp, UserCog, Users, X,
} from "lucide-react";
import { BRAND, PRODUCTS, SERVICES, TESTIMONIALS } from "./constants";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { deleteLocalRecords, GAILAND_DATA_EVENT, loadCatalog, loadRecords, patchLocalRecord, saveCatalog } from "./lib/gailand-store";
import { AdminIcon } from "./components/admin/AdminIcons";
import { AdminConfirmModal } from "./components/admin/AdminConfirmModal";
import { OrderArrivalToast } from "./components/admin/OrderArrivalToast";
import { OrderProgressStepper } from "./components/admin/OrderProgressStepper";

type View = "Overview" | "Bookings" | "Consultations" | "Orders" | "History" | "Services" | "Products" | "Point of Sale" | "Clients" | "Reviews" | "Insights" | "Staff" | "Settings";
type Row = { id: string; primary: string; secondary: string; detail: string; status: string; created?: string; raw?: Record<string, unknown> };

const nav: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Bookings", icon: CalendarDays },
  { label: "Consultations", icon: MessageSquareText }, { label: "Orders", icon: ShoppingBag },
  { label: "History", icon: Download },
  { label: "Services", icon: Sparkles }, { label: "Products", icon: Package },
  { label: "Point of Sale", icon: Store },
  { label: "Clients", icon: Users }, { label: "Reviews", icon: Star },
  { label: "Insights", icon: TrendingUp }, { label: "Staff", icon: UserCog }, { label: "Settings", icon: Settings },
];

const seeds: Record<string, Row[]> = {
  Bookings: [], Consultations: [], Orders: [], History: [],
  Services: SERVICES.map(s => ({ id: s.id, primary: s.name, secondary: s.category, detail: s.consultation ? "Consultation" : `GH₵ ${s.price} · ${s.duration}`, status: "active" })),
  Products: PRODUCTS.map(p => ({ id: p.id, primary: p.name, secondary: p.category, detail: `GH₵ ${p.price}`, status: "active" })),
  Clients: [], Staff: [],
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
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, Row[]>>(() => {
    if (typeof window === "undefined") return seeds;
    const catalog = loadCatalog({ services: SERVICES, products: PRODUCTS, testimonials: TESTIMONIALS });
    return {
      ...seeds,
      Bookings: loadRecords("bookings").map(item => mapRemote("Bookings", item)),
      Consultations: loadRecords("consultation_requests").map(item => mapRemote("Consultations", item)),
      Orders: loadRecords("orders").map(item => mapRemote("Orders", item)),
      Services: catalog.services.map(s => ({ id: s.id, primary: s.name, secondary: s.category, detail: s.consultation ? "Consultation" : `GH₵ ${s.price} · ${s.duration}`, status: "active", raw: s as unknown as Record<string, unknown> })),
      Products: catalog.products.map(p => ({ id: p.id, primary: p.name, secondary: p.category, detail: `GH₵ ${p.price}`, status: "active", raw: p as unknown as Record<string, unknown> })),
      Reviews: catalog.testimonials.map((r, i) => ({ id: r.id || `R-${i + 1}`, primary: r.name, secondary: r.service, detail: `${r.rating} stars · “${r.quote.slice(0, 42)}…”`, status: r.published === false ? "hidden" : "published", raw: r as unknown as Record<string, unknown> })),
    };
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<null | { mode: "add" | "edit"; row?: Row }>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  useEffect(() => {
    const syncRecords = (event: Event) => {
      const table = (event as CustomEvent<{ table?: string }>).detail?.table;
      const match = Object.entries(tableFor).find(([, value]) => value === table);
      if (match && table) setRows(current => ({ ...current, [match[0]]: loadRecords(table).map(item => mapRemote(match[0] as View, item)) }));
    };
    window.addEventListener(GAILAND_DATA_EVENT, syncRecords);
    return () => window.removeEventListener(GAILAND_DATA_EVENT, syncRecords);
  }, []);
  useEffect(() => {
    if (!authenticated || typeof window === "undefined") return;
    const services = (rows.Services || []).map(r => ({ ...(r.raw || {}), id: r.id, name: r.primary, category: r.secondary, price: Number(r.detail.match(/[\d,.]+/)?.[0].replace(",", "") || 0), duration: String(r.raw?.duration || r.detail.split("·")[1]?.trim() || "Consultation"), description: String(r.raw?.description || "Gailand Beauty service"), consultation: r.detail.toLowerCase().includes("consultation") })) as unknown as typeof SERVICES;
    const products = (rows.Products || []).map(r => ({ ...(r.raw || {}), id: r.id, name: r.primary, category: r.secondary, price: Number(r.detail.match(/[\d,.]+/)?.[0].replace(",", "") || 0), description: String(r.raw?.description || "Gailand Beauty product"), tone: String(r.raw?.tone || "linen") })) as unknown as typeof PRODUCTS;
    const testimonials = (rows.Reviews || []).map(r => ({ id: r.id, name: r.primary, service: r.secondary, quote: String(r.raw?.quote || r.detail.replace(/^\d stars · “|…”$/g, "")), rating: Number(r.raw?.rating || r.detail.match(/^\d/)?.[0] || 5), published: r.status === "published" }));
    saveCatalog({ services, products, testimonials });
  }, [authenticated, rows.Services, rows.Products, rows.Reviews]);

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
  const go = (next: View) => { setView(next); setSearch(""); setStatusFilter("all"); setSelected([]); setMobileNav(false); setViewMenuOpen(false); };

  const recordActivity = (action: string, subject: string) => setRows(current => ({ ...current, History: [{ id: `ACT-${Date.now()}`, primary: action, secondary: subject, detail: new Date().toLocaleString(), status: "recorded" }, ...(current.History || [])] }));

  const updateStatus = async (row: Row, status: string) => {
    setRows(current => ({ ...current, [view]: current[view].map(r => r.id === row.id ? { ...r, status } : r) }));
    const table = tableFor[view]; const remoteId = row.raw?.id;
    if (table && remoteId && supabase) await supabase.from(table).update(view === "Reviews" ? { published: status === "published" } : view === "Services" || view === "Products" ? { active: status === "active" } : { status: status.replaceAll(" ", "_") }).eq("id", remoteId);
    else if (table && ["Bookings","Consultations","Orders"].includes(view)) patchLocalRecord(table, row.id, { status: status.replaceAll(" ", "_") });
    recordActivity("Status changed", `${row.id} · ${status}`);
    setNotice(`${row.primary} updated to ${status}.`);
  };
  const saveEntry = async (data: { primary: string; secondary: string; detail: string; status: string }) => {
    const row = modal?.row;
    if (row) setRows(current => ({ ...current, [view]: current[view].map(r => r.id === row.id ? { ...r, ...data } : r) }));
    else setRows(current => ({ ...current, [view]: [{ id: `GB-${Date.now().toString().slice(-6)}`, ...data }, ...(current[view] || [])] }));
    recordActivity(row ? "Record updated" : "Record created", row?.id || data.primary);
    setModal(null); setNotice(row ? "Entry updated." : "New entry added.");
  };
  const removeSelected = () => {
    if (!selected.length) return;
    setRows(current => ({ ...current, [view]: (current[view] || []).filter(r => !selected.includes(r.id)) }));
    const table = tableFor[view]; if (table && ["Bookings","Consultations","Orders"].includes(view)) deleteLocalRecords(table, selected);
    recordActivity("Records deleted", `${selected.length} from ${view}`); setSelected([]); setConfirmDelete(false); setNotice("Selected records deleted.");
  };
  const exportCsv = () => {
    const values = [["Reference", "Name", "Service / Category", "Details", "Status"], ...filtered.map(r => [r.id, r.primary, r.secondary, r.detail, r.status])];
    const blob = new Blob([values.map(x => x.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `gailand-${view.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const notificationCounts = {
    Bookings: rows.Bookings?.filter(r => r.status === "pending").length || 0,
    Consultations: rows.Consultations?.filter(r => r.status === "new").length || 0,
    Orders: rows.Orders?.filter(r => ["pending", "pending payment"].includes(r.status)).length || 0,
  };
  const bellCount = notificationCounts.Bookings + notificationCounts.Consultations + notificationCounts.Orders;

  return <main className="gb-admin-shell">
    <section className="gb-admin-work">
      <header className="gb-admin-top">
        <div className="gb-admin-title"><span className="gb-title-desktop">Gailand Beauty Admin</span><span className="gb-title-mobile">GB Admin</span><span className={`gb-connection ${isSupabaseConfigured ? "live" : ""}`}><i/>{isSupabaseConfigured ? "Cloud connected" : "Offline mode"}</span></div>
        <div className="gb-notifications"><button className={`gb-icon-button ${bellCount ? "has-alerts" : ""}`} onClick={() => setNotificationsOpen(v=>!v)} aria-label={`${bellCount} notifications`} aria-expanded={notificationsOpen}><AdminIcon name="bell"/>{bellCount > 0 && <b>{bellCount > 9 ? "9+" : bellCount}</b>}</button>{notificationsOpen&&<div className="gb-notification-menu"><header><strong>Notifications</strong><span>{bellCount} new</span></header>{(["Orders","Bookings","Consultations"] as View[]).map(label=><button key={label} onClick={()=>go(label)}><span>{label}</span><b>{notificationCounts[label as keyof typeof notificationCounts]}</b></button>)}{bellCount===0&&<p>No new records.</p>}</div>}</div>
      </header>
      <div className="gb-admin-nav">
        <div className="gb-view-switcher"><button className="gb-view-trigger" onClick={() => setViewMenuOpen(v => !v)} aria-expanded={viewMenuOpen}><span>{view}</span><AdminIcon name="chevron" className={viewMenuOpen?"open":""}/></button>{viewMenuOpen && <div className="gb-view-menu">{nav.map(item => <button key={item.label} className={view === item.label ? "active" : ""} onClick={() => go(item.label)}><item.icon size={15}/><span>{item.label}</span>{(["Bookings","Consultations","Orders"].includes(item.label)) && <b>{notificationCounts[item.label as keyof typeof notificationCounts]}</b>}</button>)}</div>}</div>
        <div className="gb-nav-actions">{loading && <span className="gb-syncing">Syncing records…</span>}<Link href="/" className="gb-ghost"><Store size={15}/> View website</Link>{!["Overview","Insights","Settings","History","Point of Sale"].includes(view) && <button className="gb-primary compact" onClick={() => setModal({ mode: "add" })}><Plus size={15}/> Add new</button>}<button className="gb-logout" onClick={logout}><LogOut size={15}/> Logout</button></div>
      </div>
      {loading && <div className="gb-loading">Refreshing Gailand records…</div>}
      {view === "Overview" ? <Overview rows={rows} go={go}/> : view === "Insights" ? <Insights rows={rows}/> : view === "Settings" ? <SettingsPanel configured={isSupabaseConfigured}/> : view === "Point of Sale" ? <PointOfSale products={rows.Products || []} complete={(name,total) => { recordActivity("Staff order created", `${name} · GH₵ ${total}`); setNotice("Staff order prepared. Connect Paystack to collect payment."); }}/> : ["Bookings","Consultations","Orders"].includes(view) ? <OperationsView view={view} rows={filtered} search={search} setSearch={setSearch} updateStatus={updateStatus} edit={row=>setModal({mode:"edit",row})} exportCsv={exportCsv} connected={isSupabaseConfigured}/> : <section className="gb-data-card"><div className="gb-table-tools"><label><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${view.toLowerCase()} by name, phone or reference…`}/></label><div><label className="gb-select">Status <ChevronDown size={14}/><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All</option>{[...new Set(activeRows.map(r => r.status))].map(s => <option key={s}>{s}</option>)}</select></label><button onClick={exportCsv}><Download size={17}/> Export CSV</button></div></div>{selected.length > 0 && <div className="gb-bulk"><strong>{selected.length} selected</strong><button onClick={() => setSelected(filtered.map(r => r.id))}>Select all</button><button className="danger" onClick={()=>setConfirmDelete(true)}><Trash2 size={15}/> Delete selected</button><button onClick={() => setSelected([])}>Clear</button></div>}<div className="gb-table"><div className="gb-tr gb-th"><span>Name / reference</span><span>Service / category</span><span>Details</span><span>Status</span><span>Action</span></div>{filtered.map(row => <div className={`gb-tr ${selected.includes(row.id) ? "selected" : ""}`} key={row.id}><span><input className="gb-check" type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected(s => s.includes(row.id) ? s.filter(id => id !== row.id) : [...s,row.id])}/><span><strong>{row.primary}</strong><small>{row.id}</small></span></span><span>{row.secondary}</span><span>{row.detail}</span><span><select className={`gb-status ${row.status.replaceAll(" ", "-")}`} value={row.status} onChange={e => updateStatus(row, e.target.value)}>{(statuses[view] || [row.status]).map(s => <option key={s}>{s}</option>)}</select></span><span><button className="gb-edit" onClick={() => setModal({ mode: "edit", row })}>Manage</button></span></div>)}{filtered.length === 0 && <div className="gb-empty"><strong>No {view.toLowerCase()} yet.</strong><span>{isSupabaseConfigured ? "New website activity will appear here automatically." : "Connect Supabase when you are ready to begin live testing."}</span></div>}</div></section>}
    </section>
    {modal && <EntryModal view={view} row={modal.row} close={() => setModal(null)} save={saveEntry}/>} {confirmDelete&&<AdminConfirmModal count={selected.length} close={()=>setConfirmDelete(false)} confirm={removeSelected}/>} {notice&&<OrderArrivalToast message={notice} close={()=>setNotice("")} openOrders={()=>{go("Orders");setNotice("")}}/>}
  </main>;
}

function OperationsView({ view, rows, search, setSearch, updateStatus, edit, exportCsv, connected }: { view: View; rows: Row[]; search: string; setSearch: (v:string)=>void; updateStatus:(row:Row,status:string)=>void; edit:(row:Row)=>void; exportCsv:()=>void; connected:boolean }) {
  const [expanded,setExpanded]=useState<string | null>(null);
  const [note,setNote]=useState("");
  const stages = view === "Orders" ? ["paid","packaged","dispatched","delivered"] : view === "Bookings" ? ["confirmed","in service","completed"] : ["contacted","booked","closed"];
  return <section className="gb-operations"><div className="gb-operation-summary"><article><span>Total {view.toLowerCase()}</span><strong>{rows.length}</strong></article><article><span>Needs attention</span><strong>{rows.filter(r=>["pending","new","pending payment"].includes(r.status)).length}</strong></article><article><span>Completed</span><strong>{rows.filter(r=>["completed","delivered","closed"].includes(r.status)).length}</strong></article></div><div className="gb-table-tools"><label><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID, name, phone or reference…"/></label><button onClick={exportCsv}><Download/> Export CSV</button></div><div className="gb-operation-list">{rows.map(row=>{const open=expanded===row.id;const phone=String(row.raw?.phone||"");return <article key={row.id} className={open?"open":""}><button className="gb-operation-head" onClick={()=>setExpanded(open?null:row.id)}><span><b>{row.id}</b><small>{row.detail}</small></span><span><strong>{row.primary}</strong><small>{row.secondary}</small></span><em className={`gb-status ${row.status.replaceAll(" ","-")}`}>{row.status}</em><ChevronDown/></button>{open&&<div className="gb-operation-body"><div className="gb-client-detail"><div><span>Client</span><strong>{row.primary}</strong></div><div><span>Phone</span><strong>{phone||"Not supplied"}</strong></div><div><span>Email</span><strong>{String(row.raw?.email||"Not supplied")}</strong></div><div><span>Address</span><strong>{String(row.raw?.address||"Studio appointment")}</strong></div><div><span>Payment</span><strong>{String(row.raw?.payment_status||"Not verified")}</strong></div><div><span>Created</span><strong>{row.raw?.created_at?new Date(String(row.raw.created_at)).toLocaleString():"Local record"}</strong></div></div><OrderProgressStepper stages={stages} status={row.status} onChange={stage=>updateStatus(row,stage)}/><div className="gb-order-note"><label>ADMIN NOTE<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Delivery estimate, stylist note, client request or internal follow-up…"/></label><div><button className="gb-primary" onClick={()=>{edit({...row,detail:note?`${row.detail} · ${note}`:row.detail});setNote("")}}>Save note</button>{phone&&<a href={`https://wa.me/233${phone.replace(/\D/g,"").replace(/^0/,"")}`} target="_blank" rel="noreferrer">Message on WhatsApp ↗</a>}</div></div></div>}</article>})}{!rows.length&&<div className="gb-empty"><strong>No {view.toLowerCase()} received</strong><span>{connected?"New website records will appear here automatically.":"The workflow is ready. Connect Supabase to begin live operations."}</span></div>}</div></section>
}

function Overview({ rows, go }: { rows: Record<string, Row[]>; go: (v: View) => void }) {
  const today = new Intl.DateTimeFormat("en-GH", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const stats = [{ label: "Active bookings", value: rows.Bookings?.filter(r => !["completed","canceled"].includes(r.status)).length || 0, note: "From the appointment diary", icon: CalendarDays }, { label: "Open orders", value: rows.Orders?.filter(r => !["delivered","canceled"].includes(r.status)).length || 0, note: "Awaiting fulfilment", icon: ShoppingBag }, { label: "Published services", value: rows.Services?.filter(r => r.status === "active").length || 0, note: "Available on the website", icon: Sparkles }, { label: "New consultations", value: rows.Consultations?.filter(r => r.status === "new").length || 0, note: "Awaiting a response", icon: MessageSquareText }];
  return <><div className="gb-welcome"><div><p className="gb-kicker">{today}</p><h2>Welcome to the Gailand office.</h2><p>Bookings, client requests, shop orders and services are managed here.</p></div><button className="gb-primary" onClick={() => go("Bookings")}><CalendarDays size={17}/> Open schedule</button></div><div className="gb-stat-grid">{stats.map(s => <article key={s.label}><div><span>{s.label}</span><s.icon size={20}/></div><strong>{s.value}</strong><small>{s.note}</small></article>)}</div><div className="gb-overview-grid"><section className="gb-panel"><header><div><p className="gb-kicker">Studio diary</p><h3>Upcoming appointments</h3></div><button onClick={() => go("Bookings")}>View all →</button></header>{rows.Bookings?.slice(0,5).map(r => <div className="gb-agenda" key={r.id}><time>{r.detail.split("·")[1] || "—"}</time><span><strong>{r.primary}</strong><small>{r.secondary}</small></span><b className={`gb-dot ${r.status}`}/><em>{r.status}</em></div>)}{!rows.Bookings?.length && <div className="gb-panel-empty"><CalendarDays/><strong>No bookings received yet</strong><span>Website appointments will appear here after Supabase is connected.</span></div>}</section><section className="gb-panel gb-attention"><header><div><p className="gb-kicker">Action centre</p><h3>Needs attention</h3></div></header><button onClick={() => go("Consultations")}><span><MessageSquareText/><b>New consultations</b><small>Reply and turn enquiries into bookings</small></span><strong>{rows.Consultations?.filter(r => r.status === "new").length || 0}</strong></button><button onClick={() => go("Orders")}><span><Package/><b>Orders to fulfil</b><small>Prepare paid items for dispatch</small></span><strong>{rows.Orders?.filter(r => !["delivered","canceled"].includes(r.status)).length || 0}</strong></button><button onClick={() => go("Reviews")}><span><Star/><b>Reviews awaiting approval</b><small>Keep website testimonials current</small></span><strong>{rows.Reviews?.filter(r => r.status === "hidden").length || 0}</strong></button></section></div></>;
}

function Insights({ rows }: { rows: Record<string, Row[]> }) { const completed=rows.Bookings?.filter(r=>r.status==="completed").length||0; const total=rows.Bookings?.length||0; const delivered=rows.Orders?.filter(r=>r.status==="delivered").length||0; return <div className="gb-insights"><div className="gb-stat-grid"><article><span>Completed appointments</span><strong>{completed}</strong><small>From {total} total bookings</small></article><article><span>Delivered orders</span><strong>{delivered}</strong><small>Confirmed fulfilments</small></article><article><span>Client records</span><strong>{rows.Clients?.length||0}</strong><small>Unique saved clients</small></article><article><span>Active catalog</span><strong>{(rows.Services?.filter(r=>r.status==="active").length||0)+(rows.Products?.filter(r=>r.status==="active").length||0)}</strong><small>Services and products</small></article></div><section className="gb-chart gb-chart-empty"><TrendingUp/><h3>Revenue reporting is ready</h3><p>Verified Paystack payments and completed bookings will populate revenue trends after the database and payment webhook are connected.</p></section><p className="gb-insight-note">No simulated revenue or conversion percentages are used.</p></div> }

function PointOfSale({ products, complete }: { products: Row[]; complete: (name:string,total:number)=>void }) { const [cart,setCart]=useState<{row:Row;qty:number}[]>([]); const [client,setClient]=useState(""); const add=(row:Row)=>setCart(c=>c.some(i=>i.row.id===row.id)?c.map(i=>i.row.id===row.id?{...i,qty:i.qty+1}:i):[...c,{row,qty:1}]); const price=(r:Row)=>Number(r.detail.replace(/[^0-9.]/g,""))||0; const total=cart.reduce((n,i)=>n+price(i.row)*i.qty,0); return <div className="gb-pos"><section><header><div><p className="gb-kicker">Staff checkout</p><h3>Place an order for a client</h3></div></header><div className="gb-pos-grid">{products.filter(p=>p.status==="active").map(p=><button key={p.id} onClick={()=>add(p)}><Package/><span><strong>{p.primary}</strong><small>{p.secondary}</small></span><b>{p.detail}</b><Plus/></button>)}</div></section><aside><p className="gb-kicker">Current sale</p><h3>Staff cart</h3><label>CLIENT NAME<input value={client} onChange={e=>setClient(e.target.value)} placeholder="Full name"/></label><div className="gb-cart-lines">{cart.map(i=><div key={i.row.id}><span><strong>{i.row.primary}</strong><small>Quantity {i.qty}</small></span><b>GH₵ {(price(i.row)*i.qty).toLocaleString()}</b><button onClick={()=>setCart(c=>c.filter(x=>x.row.id!==i.row.id))}><X/></button></div>)}{!cart.length&&<p>Add products from the catalog to begin.</p>}</div><div className="gb-pos-total"><span>Total</span><strong>GH₵ {total.toLocaleString()}</strong></div><button className="gb-primary" disabled={!cart.length||!client.trim()} onClick={()=>complete(client,total)}>Continue to payment</button><small>Payment collection requires the Paystack verification endpoint.</small></aside></div> }

function SettingsPanel({ configured }: { configured: boolean }) { return <section className="gb-settings"><div><p className="gb-kicker">Business profile</p><h3>Studio details</h3><label>BUSINESS NAME<input defaultValue={BRAND.name}/></label><label>LOCATION<input defaultValue={BRAND.location}/></label><div className="gb-two"><label>PRIMARY PHONE<input defaultValue={BRAND.primaryPhone}/></label><label>SECONDARY PHONE<input defaultValue={BRAND.secondaryPhone}/></label></div><label>OPENING HOURS<input defaultValue={BRAND.hours}/></label><button className="gb-primary" onClick={() => alert("Studio settings are ready to save after the database is connected.")}>Save changes</button></div><aside><p className="gb-kicker">Connection</p><h3>{configured ? "Main site connected" : "Database connection required"}</h3><p>{configured ? "New bookings, consultations and orders from the website are loading into this office." : "Add the Supabase details from the project guide to begin receiving live website records. No simulated transactions or revenue are shown."}</p><span className={`gb-connection ${configured ? "live" : ""}`}><i/>{configured ? "Connected" : "Not connected"}</span></aside></section> }

function EntryModal({ view, row, close, save }: { view: View; row?: Row; close: () => void; save: (d: { primary:string; secondary:string; detail:string; status:string }) => void }) { const [primary,setPrimary]=useState(row?.primary||""); const [secondary,setSecondary]=useState(row?.secondary||""); const [detail,setDetail]=useState(row?.detail||""); const [status,setStatus]=useState(row?.status||statuses[view]?.[0]||"active"); return <div className="gb-modal-backdrop" onMouseDown={close}><form className="gb-entry-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();save({primary,secondary,detail,status})}}><button type="button" className="gb-modal-close" onClick={close}><X/></button><p className="gb-kicker">{row ? "Edit" : "Create"} record</p><h2>{row ? `Update ${view.slice(0,-1)}` : `New ${view.slice(0,-1)}`}</h2><label>NAME / TITLE<input required value={primary} onChange={e=>setPrimary(e.target.value)}/></label><label>SERVICE / CATEGORY<input required value={secondary} onChange={e=>setSecondary(e.target.value)}/></label><label>DETAILS<input required value={detail} onChange={e=>setDetail(e.target.value)}/></label><label>STATUS<select value={status} onChange={e=>setStatus(e.target.value)}>{(statuses[view]||[status]).map(s=><option key={s}>{s}</option>)}</select></label><button className="gb-primary">{row ? "Save changes" : "Add to Gailand"}</button></form></div> }
