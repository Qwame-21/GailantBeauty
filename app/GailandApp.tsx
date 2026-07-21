"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, Menu, Minus, Package, Phone, Plus, Search, ShoppingBag, Sparkles, UserRound, X } from "lucide-react";
import { BRAND, POLICIES, PRODUCTS, SERVICES, TESTIMONIALS, type Product, type Service } from "./constants";
import { insertRecord } from "./lib/supabase";

type View = "home" | "services" | "shop" | "track" | "policies" | "admin";
type CartLine = Product & { quantity: number };
type Modal = { kind: "booking"; service: Service } | { kind: "consultation"; service: Service } | { kind: "checkout" } | null;

const money = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);

export function GailandApp() {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notice, setNotice] = useState("");

  const navigate = (next: View) => { setView(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const addToCart = (product: Product) => { setCart((current) => current.some((x) => x.id === product.id) ? current.map((x) => x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x) : [...current, { ...product, quantity: 1 }]); setCartOpen(true); };
  const updateCart = (id: string, delta: number) => setCart((current) => current.map((x) => x.id === id ? { ...x, quantity: x.quantity + delta } : x).filter((x) => x.quantity > 0));
  const count = cart.reduce((sum, x) => sum + x.quantity, 0);

  return <div className="site-shell">
    <Announcement />
    <Header view={view} navigate={navigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} cartCount={count} openCart={() => setCartOpen(true)} />
    <main>
      {view === "home" && <Home navigate={navigate} book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} addToCart={addToCart} />}
      {view === "services" && <ServicesPage book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} />}
      {view === "shop" && <ShopPage addToCart={addToCart} />}
      {view === "track" && <TrackPage />}
      {view === "policies" && <PoliciesPage />}
      {view === "admin" && <AdminPage />}
    </main>
    {view !== "admin" && <Footer navigate={navigate} />}
    {cartOpen && <CartDrawer cart={cart} close={() => setCartOpen(false)} update={updateCart} checkout={() => { setCartOpen(false); setModal({ kind: "checkout" }); }} />}
    {modal && <FlowModal modal={modal} cart={cart} close={() => setModal(null)} complete={(message) => { setModal(null); setCart([]); setNotice(message); }} />}
    {notice && <div className="toast"><Check size={17} />{notice}<button aria-label="Close notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
    <a className="whatsapp" href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">WA</a>
  </div>;
}

function Announcement() { return <div className="announcement"><span>Complimentary consultation for every new client</span><span>Abeka Free Pipe Junction · Accra</span></div>; }

function CrownMark() { return <button className="wordmark" onClick={() => window.location.reload()} aria-label="Gailand Beauty home"><span>Gailand</span><small>BEAUTY</small></button>; }

function Header({ view, navigate, menuOpen, setMenuOpen, cartCount, openCart }: { view: View; navigate: (v: View) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void; cartCount: number; openCart: () => void }) {
  const links: [View, string][] = [["services", "Services"], ["shop", "Shop"], ["track", "Track"], ["policies", "Policies"]];
  return <header className="header"><div className="nav-wrap">
    <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
    <CrownMark />
    <nav className={menuOpen ? "nav-links open" : "nav-links"}>{links.map(([id, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}>{label}</button>)}<button className="mobile-admin" onClick={() => navigate("admin")}>Admin</button></nav>
    <div className="nav-actions"><button className="quiet-link" onClick={() => navigate("admin")}><UserRound size={17} /> Admin</button><button className="bag-button" onClick={openCart} aria-label={`Cart with ${cartCount} items`}><ShoppingBag size={19} /><span>{cartCount}</span></button><button className="pill dark" onClick={() => navigate("services")}>Book now</button></div>
  </div></header>;
}

function Home({ navigate, book, addToCart }: { navigate: (v: View) => void; book: (s: Service) => void; addToCart: (p: Product) => void }) {
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={14} /> Beauty, crowned in Accra</p><h1>Where beauty<br />wears a <em>crown.</em></h1><p className="hero-text">{BRAND.description}</p><div className="hero-actions"><button className="pill dark large" onClick={() => navigate("services")}>Find your service <ArrowRight size={18} /></button><button className="text-button" onClick={() => navigate("shop")}>Shop the collection</button></div><div className="hero-meta"><span><MapPin size={16} /> Abeka, Accra</span><span><Clock3 size={16} /> Open today until 7pm</span></div></div>
      <div className="hero-art" aria-label="Editorial beauty studio graphic"><div className="arch"><span className="arch-number">01</span><div className="crown-lines">✦</div><strong>GB</strong><small>POLISHED · PROFESSIONAL · PERSONAL</small></div><div className="orbit orbit-one">NAILS</div><div className="orbit orbit-two">HAIR</div><div className="orbit orbit-three">LASHES</div></div>
    </section>
    <section className="marquee" aria-hidden="true"><span>NAILS</span><i>✦</i><span>HAIR</span><i>✦</i><span>LASHES</span><i>✦</i><span>MAKEUP</span><i>✦</i><span>BEAUTY, CROWNED</span></section>
    <section className="section services-preview"><SectionHead kicker="The Gailand edit" title="Services made for your moment." action="View all services" onAction={() => navigate("services")} /><div className="service-grid">{SERVICES.filter((x) => x.featured).map((service, index) => <ServiceCard key={service.id} service={service} index={index} book={book} />)}</div></section>
    <section className="statement"><p className="eyebrow light">Our philosophy</p><blockquote>“Every detail should feel <em>intentional.</em><br />Every client should leave feeling <em>royal.</em>”</blockquote><p>{BRAND.about}</p></section>
    <section className="section shop-preview"><SectionHead kicker="The beauty shelf" title="Your crown, cared for." action="Shop all" onAction={() => navigate("shop")} /><div className="product-grid">{PRODUCTS.map((product) => <ProductCard key={product.id} product={product} add={addToCart} />)}</div></section>
    <section className="experience"><div><p className="eyebrow">Beauty comes to you</p><h2>The salon experience,<br /><em>at your door.</em></h2></div><div><p>Professional beauty service, wherever you feel most at ease. Select home service when booking and we’ll take care of the rest.</p><button className="pill light" onClick={() => navigate("services")}>Book home service <ArrowRight size={17} /></button></div></section>
    <section className="section testimonials"><SectionHead kicker="Client notes" title="Loved in Accra." /><div className="testimonial-grid">{TESTIMONIALS.map((item) => <article key={item.name}><div className="stars">★★★★★</div><p>“{item.quote}”</p><footer><strong>{item.name}</strong><span>{item.service}</span></footer></article>)}</div></section>
    <section className="contact-strip"><div><MapPin /><span><small>VISIT</small>{BRAND.location}</span></div><div><Phone /><span><small>CALL / WHATSAPP</small>{BRAND.primaryPhone}</span></div><div><Clock3 /><span><small>OPEN</small>{BRAND.hours}</span></div></section>
  </>;
}

function SectionHead({ kicker, title, action, onAction }: { kicker: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-head"><div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>; }

function ServiceCard({ service, index, book }: { service: Service; index: number; book: (s: Service) => void }) { return <article className="service-card"><div className={`service-visual tone-${index + 1}`}><span>0{index + 1}</span><strong>{service.category.substring(0, 1)}</strong><small>{service.category}</small></div><div className="card-content"><div><span className="category">{service.category}</span><span>{service.duration}</span></div><h3>{service.name}</h3><p>{service.description}</p><footer><strong>{service.consultation ? "Consultation" : `From ${money(service.price)}`}</strong><button onClick={() => book(service)}>{service.consultation ? "Request" : "Book"} <ArrowRight size={16} /></button></footer></div></article>; }

function ProductCard({ product, add }: { product: Product; add: (p: Product) => void }) { return <article className="product-card"><div className={`product-visual ${product.tone}`}>{product.badge && <span className="badge">{product.badge}</span>}<span className="product-shape">G</span><button className="quick-add" onClick={() => add(product)} aria-label={`Add ${product.name} to cart`}><Plus /></button></div><div className="product-info"><span>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong></div></article>; }

function ServicesPage({ book }: { book: (s: Service) => void }) {
  const categories = ["All", ...new Set(SERVICES.map((s) => s.category))];
  const [category, setCategory] = useState("All");
  const filtered = category === "All" ? SERVICES : SERVICES.filter((s) => s.category === category);
  return <><PageHero number="01" kicker="Our services" title="Your beauty ritual," italic="perfected." text="Thoughtful artistry, unhurried care and a finish that feels unmistakably you." />
    <section className="section catalog"><div className="filter-row">{categories.map((x) => <button className={category === x ? "active" : ""} key={x} onClick={() => setCategory(x)}>{x}</button>)}</div><div className="service-list">{filtered.map((service, index) => <ServiceCard key={service.id} service={service} index={index % 3} book={book} />)}</div><div className="booking-note"><div><CalendarDays /><h3>Book with confidence.</h3></div><p>A 30% deposit secures standard appointments. Microblading, locs and training begin with a friendly consultation so we can tailor the next step.</p></div></section></>;
}

function ShopPage({ addToCart }: { addToCart: (p: Product) => void }) {
  const [query, setQuery] = useState("");
  const products = PRODUCTS.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHero number="02" kicker="The shop" title="Beauty that keeps" italic="giving." text="Studio-approved wigs, tools and essentials, selected to make every day feel polished." /><section className="section catalog"><div className="shop-tools"><p>{products.length} curated pieces</p><label><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the collection" /></label></div><div className="product-grid shop-grid">{products.map((p) => <ProductCard key={p.id} product={p} add={addToCart} />)}</div></section></>;
}

function PageHero({ number, kicker, title, italic, text }: { number: string; kicker: string; title: string; italic: string; text: string }) { return <section className="page-hero"><span>{number}</span><div><p className="eyebrow">{kicker}</p><h1>{title}<br /><em>{italic}</em></h1></div><p>{text}</p></section>; }

function TrackPage() {
  const [reference, setReference] = useState(""); const [result, setResult] = useState(false);
  return <><PageHero number="03" kicker="Track with ease" title="Know what’s" italic="next." text="Use your order or booking reference to see the latest status." /><section className="track-section"><div className="track-card"><Package size={32} /><h2>Track an order or booking</h2><p>Your reference is in the confirmation sent after checkout or booking.</p><form onSubmit={(e) => { e.preventDefault(); if (reference.trim()) setResult(true); }}><label>REFERENCE NUMBER<input required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. GB-260721-1048" /></label><button className="pill dark" type="submit">Check status <ArrowRight size={17} /></button></form>{result && <div className="track-result"><span><Check size={16} /></span><div><small>REFERENCE {reference.toUpperCase()}</small><strong>Request received</strong><p>We’re preparing your latest update. For immediate help, WhatsApp {BRAND.primaryPhone}.</p></div></div>}</div><aside><p className="eyebrow">Need help?</p><h3>We’re one message away.</h3><p>Have your reference number ready and our team will assist you.</p><a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={16} /></a></aside></section></>;
}

function PoliciesPage() { return <><PageHero number="04" kicker="Good to know" title="Simple policies," italic="beautiful visits." text="A few thoughtful guidelines help us give every client our very best." /><section className="policy-section"><div>{POLICIES.map((policy, i) => <article key={policy}><span>0{i + 1}</span><p>{policy}</p></article>)}</div><aside><p className="eyebrow light">Questions?</p><h2>Let’s make it easy.</h2><p>Talk to our team before booking if you need extra time, accessibility support or a special arrangement.</p><a className="pill light" href={`tel:${BRAND.primaryPhone}`}>Call {BRAND.primaryPhone}</a></aside></section></>;
}

function CartDrawer({ cart, close, update, checkout }: { cart: CartLine[]; close: () => void; update: (id: string, n: number) => void; checkout: () => void }) {
  const subtotal = cart.reduce((sum, x) => sum + x.price * x.quantity, 0);
  return <div className="overlay" onMouseDown={close}><aside className="cart-drawer" onMouseDown={(e) => e.stopPropagation()}><header><div><small>YOUR SELECTION</small><h2>Shopping bag</h2></div><button onClick={close} aria-label="Close cart"><X /></button></header><div className="cart-lines">{cart.length === 0 ? <div className="empty-state"><ShoppingBag /><h3>Your bag is waiting.</h3><p>Discover our curated beauty collection.</p></div> : cart.map((x) => <div className="cart-line" key={x.id}><div className={`mini-product ${x.tone}`}>G</div><div><span>{x.category}</span><strong>{x.name}</strong><div className="quantity"><button onClick={() => update(x.id, -1)}><Minus size={13} /></button><span>{x.quantity}</span><button onClick={() => update(x.id, 1)}><Plus size={13} /></button></div></div><b>{money(x.price * x.quantity)}</b></div>)}</div>{cart.length > 0 && <footer><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Delivery calculated at checkout.</p><button className="pill dark full" onClick={checkout}>Secure checkout <ArrowRight size={17} /></button><small>Payments secured by Paystack</small></footer>}</aside></div>;
}

function FlowModal({ modal, cart, close, complete }: { modal: NonNullable<Modal>; cart: CartLine[]; close: () => void; complete: (m: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [homeService, setHomeService] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", date: "", time: "", stylist: "", address: "", notes: "" });
  const service = modal.kind === "booking" || modal.kind === "consultation" ? modal.service : null;
  const total = modal.kind === "checkout" ? cart.reduce((s, x) => s + x.price * x.quantity, 0) : (service?.price || 0) + (homeService ? BRAND.homeSurcharge : 0);
  const due = modal.kind === "booking" ? Math.ceil(total * BRAND.depositPercent / 100) : total;
  const change = (key: keyof typeof form, value: string) => setForm((x) => ({ ...x, [key]: value }));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); const table = modal.kind === "checkout" ? "orders" : modal.kind === "consultation" ? "consultation_requests" : "bookings"; const payload = { ...form, service_id: service?.id, service_name: service?.name, home_service: homeService, amount: due, items: modal.kind === "checkout" ? cart : undefined, status: modal.kind === "consultation" ? "new" : "pending_payment" }; const { error } = await insertRecord(table, payload); setLoading(false); if (error) return alert(error.message); complete(modal.kind === "consultation" ? "Consultation request received. We’ll call you shortly." : `Thank you, ${form.name.split(" ")[0] || "queen"}. Your request is confirmed.`); };
  return <div className="overlay modal-overlay"><div className="flow-modal"><button className="modal-close" onClick={close} aria-label="Close"><X /></button><div className="modal-intro"><p className="eyebrow">{modal.kind === "checkout" ? "Secure checkout" : modal.kind === "consultation" ? "Let’s talk" : "Reserve your time"}</p><h2>{modal.kind === "checkout" ? "Complete your order." : service?.name}</h2><p>{modal.kind === "consultation" ? "Tell us what you have in mind and our team will reach out with the best next step." : "A few details, then your beauty moment is secured."}</p>{modal.kind !== "checkout" && <div className="modal-summary"><span>{service?.duration}</span><strong>{modal.kind === "consultation" ? "No payment today" : `${money(due)} deposit`}</strong></div>}</div><form onSubmit={submit} className="flow-form"><div className="two-col"><label>FULL NAME<input required value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="Your name" /></label><label>PHONE / WHATSAPP<input required value={form.phone} onChange={(e) => change("phone", e.target.value)} placeholder="055 000 0000" /></label></div><label>EMAIL<input type="email" value={form.email} onChange={(e) => change("email", e.target.value)} placeholder="you@example.com" /></label>{modal.kind === "booking" && <><div className="two-col"><label>PREFERRED DATE<input required type="date" value={form.date} onChange={(e) => change("date", e.target.value)} /></label><label>PREFERRED TIME<select required value={form.time} onChange={(e) => change("time", e.target.value)}><option value="">Select time</option><option>9:00 AM</option><option>11:00 AM</option><option>1:00 PM</option><option>3:00 PM</option><option>5:00 PM</option></select></label></div><label>STYLIST PREFERENCE <span>OPTIONAL</span><input value={form.stylist} onChange={(e) => change("stylist", e.target.value)} placeholder="No preference" /></label><label className="switch-row"><input type="checkbox" checked={homeService} onChange={(e) => setHomeService(e.target.checked)} /><span><strong>Bring Gailand to me</strong><small>Home service from {money(BRAND.homeSurcharge)} within Accra</small></span></label>{homeService && <label>HOME ADDRESS<input required value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Your location in Accra" /></label>}</>}{modal.kind === "checkout" && <label>DELIVERY ADDRESS<input required value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Street, area, city" /></label>}<label>NOTES <span>OPTIONAL</span><textarea value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Anything we should know?" /></label><button className="pill dark full" disabled={loading}>{loading ? "Please wait…" : modal.kind === "consultation" ? "Send consultation request" : `Continue to Paystack · ${money(due)}`}</button>{modal.kind !== "consultation" && <small className="secure-note">Secure payment · Paystack · MoMo & cards accepted</small>}</form></div></div>;
}

function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false); const [password, setPassword] = useState(""); const [tab, setTab] = useState("Dashboard");
  if (!loggedIn) return <section className="admin-login"><div><CrownMark /><p className="eyebrow">Private office</p><h1>Welcome back.</h1><p>Sign in to manage Gailand Beauty.</p><form onSubmit={(e) => { e.preventDefault(); if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "gailand2026admin")) setLoggedIn(true); else alert("Incorrect password"); }}><label>ADMIN PASSWORD<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" /></label><button className="pill dark full">Sign in <ArrowRight size={17} /></button></form><button className="back-site" onClick={() => window.location.reload()}>← Back to website</button></div><aside><span>GB</span><p>THE GAILAND OFFICE</p></aside></section>;
  const tabs = ["Dashboard", "Services", "Products", "Bookings", "Consultations", "Orders", "Testimonials"];
  return <section className="admin-shell"><aside className="admin-sidebar"><CrownMark /><nav>{tabs.map((x) => <button key={x} onClick={() => setTab(x)} className={tab === x ? "active" : ""}>{x}<span>›</span></button>)}</nav><button className="signout" onClick={() => setLoggedIn(false)}>Sign out</button></aside><div className="admin-main"><header><div><p>GAILAND BEAUTY · ADMIN</p><h1>{tab}</h1></div><button className="pill dark"><Plus size={16} /> Add new</button></header>{tab === "Dashboard" ? <Dashboard /> : <AdminTable title={tab} />}</div></section>;
}

function Dashboard() { const stats = [["Today’s bookings", "06", "+2 from yesterday"], ["Pending orders", "04", "2 ready to dispatch"], ["Month revenue", "GH₵ 8,420", "+18% this month"], ["Consultations", "03", "Awaiting response"]]; return <><div className="stat-grid">{stats.map((x) => <article key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]}</small></article>)}</div><div className="admin-panels"><section><header><h2>Today’s appointments</h2><button>View all</button></header>{["Akosua Mensah", "Mabel Ofori", "Dede Boateng"].map((x, i) => <div className="appointment" key={x}><time>{["09:00", "11:30", "14:00"][i]}</time><span><strong>{x}</strong><small>{SERVICES[i].name}</small></span><b className={i === 0 ? "confirmed" : "pending"}>{i === 0 ? "Confirmed" : "Pending"}</b></div>)}</section><section className="quick-panel"><header><h2>At a glance</h2></header><div><span>Services live</span><strong>{SERVICES.length}</strong></div><div><span>Products in shop</span><strong>{PRODUCTS.length}</strong></div><div><span>Reviews published</span><strong>{TESTIMONIALS.length}</strong></div></section></div></>;
}

function AdminTable({ title }: { title: string }) { const source = title === "Products" ? PRODUCTS.map((x) => [x.name, x.category, money(x.price), "Live"]) : SERVICES.slice(0, 5).map((x) => [x.name, x.category, x.duration, x.consultation ? "Consultation" : "Live"]); return <div className="admin-table"><div className="table-tools"><label><Search size={17} /><input placeholder={`Search ${title.toLowerCase()}`} /></label><button>Filter <ChevronDown size={15} /></button></div><div className="table-row table-head"><span>Name / Client</span><span>Category</span><span>Price / Time</span><span>Status</span><span></span></div>{source.map((row) => <div className="table-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><b>{row[3]}</b><button>•••</button></div>)}</div>; }

function Footer({ navigate }: { navigate: (v: View) => void }) { return <footer className="footer"><div className="footer-main"><div><CrownMark /><p>{BRAND.tagline}</p><div className="socials"><a href="#" aria-label="Instagram">IG</a><a href={`https://wa.me/${BRAND.whatsapp}`} aria-label="WhatsApp">WA</a></div></div><div><small>EXPLORE</small><button onClick={() => navigate("services")}>Services</button><button onClick={() => navigate("shop")}>Shop</button><button onClick={() => navigate("track")}>Track</button></div><div><small>VISIT & CONTACT</small><p>{BRAND.location}</p><a href={`tel:${BRAND.primaryPhone}`}>{BRAND.primaryPhone}</a><a href={`tel:${BRAND.secondaryPhone}`}>{BRAND.secondaryPhone}</a></div><div><small>OPENING HOURS</small><p>Mon–Sat<br />8:00am — 7:00pm</p><p>Sunday<br />12:00pm — 7:00pm</p></div></div><div className="footer-bottom"><span>© 2026 Gailand Beauty</span><button onClick={() => navigate("policies")}>Policies & terms</button><span>Beauty, crowned.</span></div></footer>; }
