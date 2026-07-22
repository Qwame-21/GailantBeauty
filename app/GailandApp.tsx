"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, Menu, Minus, Package, Phone, Plus, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { BRAND, POLICIES, PRODUCTS, SERVICES, TESTIMONIALS, FAQS, CATEGORIES_DROPDOWN, MOCK_TRACKING_DATABASE, type Product, type Service, type TrackingRecord } from "./constants";
import { insertRecord } from "./lib/supabase";

type View = "home" | "services" | "shop" | "wishlist" | "track" | "policies";
type CartLine = Product & { quantity: number };
type Modal = { kind: "booking"; service: Service } | { kind: "consultation"; service: Service } | { kind: "checkout" } | null;

const money = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);

export function GailandApp() {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const navigate = (next: View, filter?: string) => { 
    setView(next); 
    setFilterCategory(filter || null);
    setMenuOpen(false); 
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  };

  const addToCart = (product: Product) => { 
    setCart((current) => current.some((x) => x.id === product.id) ? current.map((x) => x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x) : [...current, { ...product, quantity: 1 }]); 
    setNotice(`ADDED ${product.name.toUpperCase()} TO BAG`);
  };

  const toggleFavorite = (id: string) => { 
    setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); 
    setNotice(favorites.includes(id) ? "REMOVED FROM WISHLIST" : "ADDED TO WISHLIST"); 
  };

  const updateCart = (id: string, delta: number) => setCart((current) => current.map((x) => x.id === id ? { ...x, quantity: x.quantity + delta } : x).filter((x) => x.quantity > 0));
  const count = cart.reduce((sum, x) => sum + x.quantity, 0);

  return <div className="site-shell">
    <Announcement />
    <Header view={view} navigate={navigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} cartCount={count} favoritesCount={favorites.length} openCart={() => setCartOpen(true)} openSearch={() => setSearchOpen(true)} />
    <main>
      {view === "home" && <Home navigate={navigate} book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} addToCart={addToCart} favorites={favorites} toggleFavorite={toggleFavorite} />}
      {view === "services" && <ServicesPage book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} favorites={favorites} toggleFavorite={toggleFavorite} initialFilter={filterCategory} />}
      {view === "shop" && <ShopPage addToCart={addToCart} favorites={favorites} toggleFavorite={toggleFavorite} initialFilter={filterCategory} />}
      {view === "wishlist" && <WishlistPage favorites={favorites} addToCart={addToCart} toggleFavorite={toggleFavorite} />}
      {view === "track" && <TrackPage />}
      {view === "policies" && <PoliciesPage navigate={navigate} />}
    </main>
    <Footer navigate={navigate} />
    <FloatingTrioWidget cartCount={count} favoritesCount={favorites.length} openCart={() => setCartOpen(true)} navigate={navigate} />
    {searchOpen && <SearchModal close={() => setSearchOpen(false)} navigate={(v) => { setSearchOpen(false); navigate(v); }} />}
    {cartOpen && <CartDrawer cart={cart} close={() => setCartOpen(false)} update={updateCart} checkout={() => { setCartOpen(false); setModal({ kind: "checkout" }); }} />}
    {modal && <FlowModal modal={modal} cart={cart} close={() => setModal(null)} complete={(message) => { setModal(null); setCart([]); setNotice(message); }} />}
    {notice && <div className="toast"><Check size={17} />{notice}<button aria-label="Close notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
  </div>;
}

function SearchModal({ close, navigate }: { close: () => void; navigate: (v: View) => void }) {
  const [q, setQ] = useState("");
  const results = q.length > 1 ? [
    ...SERVICES.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || s.category.toLowerCase().includes(q.toLowerCase())).map(s => ({ label: s.name, sub: s.category, action: () => navigate("services") })),
    ...PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())).map(p => ({ label: p.name, sub: p.category, action: () => navigate("shop") })),
  ] : [];
  return (
    <div className="overlay modal-overlay" onMouseDown={close}>
      <div className="search-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="search-modal-inner">
          <Search size={20} color="#aaa" />
          <input autoFocus className="search-modal-input" placeholder="Search services, products…" value={q} onChange={e => setQ(e.target.value)} />
          <button className="search-modal-close" onClick={close} aria-label="Close search"><X size={18} /></button>
        </div>
        {results.length > 0 && <div className="search-results">
          {results.map((r, i) => <button key={i} className="search-result-row" onClick={r.action}>
            <span>{r.label}</span><small>{r.sub}</small><ArrowRight size={14} />
          </button>)}
        </div>}
        {q.length > 1 && results.length === 0 && <p className="search-empty">No results for "{q}"</p>}
      </div>
    </div>
  );
}

function FloatingTrioWidget({ cartCount, favoritesCount, openCart, navigate }: { cartCount: number; favoritesCount: number; openCart: () => void; navigate: (v: View) => void }) {
  return (
    <div className="floating-trio-widget" aria-label="Quick actions menu">
      <button onClick={openCart} title="Shopping Bag">
        <ShoppingBag size={15} />
        <span>BAG ({cartCount})</span>
      </button>
      <div className="divider" />
      <button onClick={() => navigate("wishlist")} title="Wishlist / Favorites">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span>WISHLIST {favoritesCount > 0 ? `(${favoritesCount})` : ''}</span>
      </button>
      <div className="divider" />
      <button onClick={() => navigate("services")} title="Categories">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="6" x="3" y="3" rx="1"/><rect width="6" height="6" x="15" y="3" rx="1"/><rect width="6" height="6" x="15" y="15" rx="1"/><rect width="6" height="6" x="3" y="15" rx="1"/></svg>
        <span>CATEGORIES</span>
      </button>
    </div>
  );
}

function Announcement() { return <div className="announcement"><span>COMPLIMENTARY CONSULTATION FOR EVERY NEW CLIENT</span><span>ABEKA FREE PIPE JUNCTION · ACCRA</span></div>; }

function CrownMark() { return <button className="wordmark" onClick={() => window.location.reload()} aria-label="Gailand Beauty home"><span>GAILAND</span><small>BEAUTY</small></button>; }

function Header({ view, navigate, menuOpen, setMenuOpen, cartCount, favoritesCount, openCart, openSearch }: { view: View; navigate: (v: View, f?: string) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void; cartCount: number; favoritesCount: number; openCart: () => void; openSearch: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const links: [View, string][] = [["services", "SERVICES"], ["shop", "SHOP"], ["track", "TRACK"], ["policies", "POLICIES"]];

  return <header className="header"><div className="nav-wrap">
    <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
    <CrownMark />
    <nav className={menuOpen ? "nav-links open" : "nav-links"}>{links.map(([id, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}>{label}</button>)}</nav>
    <div className="nav-actions">
      <button className="search-icon-btn" onClick={openSearch} aria-label="Open search">
        <Search size={17} />
      </button>
      <button className="nav-action-btn bag-btn" onClick={openCart} aria-label={`Bag with ${cartCount} items`}>
        <ShoppingBag size={16} />
        <span className="btn-label">BAG ({cartCount})</span>
      </button>
      
      {/* Categories Dropdown Menu - Main button navigates directly to services on click */}
      <div className="dropdown-wrapper" onMouseLeave={() => setDropdownOpen(false)}>
        <button 
          className="nav-action-btn categorize-btn" 
          onClick={() => {
            if (!dropdownOpen) setDropdownOpen(true);
            else navigate("services");
          }}
          aria-label="Browse categories dropdown"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="6" x="3" y="3" rx="1"/><rect width="6" height="6" x="14" y="3" rx="1"/><rect width="6" height="6" x="14" y="14" rx="1"/><rect width="6" height="6" x="3" y="14" rx="1"/></svg>
          <span className="btn-label">CATEGORIES</span>
          <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)" }} />
        </button>

        {dropdownOpen && (
          <div className="categories-menu">
            {CATEGORIES_DROPDOWN.map((col) => (
              <div className="categories-menu-col" key={col.title}>
                <h4>{col.title}</h4>
                {col.items.map((item) => (
                  <button 
                    key={item.label} 
                    onClick={() => { 
                      setDropdownOpen(false); 
                      navigate(item.target, item.filter); 
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div></header>;
}

function Home({ navigate, book, addToCart, favorites, toggleFavorite }: { navigate: (v: View, f?: string) => void; book: (s: Service) => void; addToCart: (p: Product) => void; favorites: string[]; toggleFavorite: (id: string) => void }) {
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const itemsPerPage = 3;
  const maxPages = Math.ceil(TESTIMONIALS.length / itemsPerPage);
  const visibleTestimonials = TESTIMONIALS.slice(testimonialIndex * itemsPerPage, (testimonialIndex + 1) * itemsPerPage);

  const prevTestimonials = () => setTestimonialIndex((prev) => (prev > 0 ? prev - 1 : maxPages - 1));
  const nextTestimonials = () => setTestimonialIndex((prev) => (prev < maxPages - 1 ? prev + 1 : 0));

  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={14} /> Beauty, crowned in Accra</p><h1>Where beauty<br />wears a <em>crown.</em></h1><p className="hero-text">{BRAND.description}</p><div className="hero-actions">
      <button className="pill dark large" onClick={() => navigate("services")}>
        <CrownMarkIcon /> FIND YOUR SERVICE <ArrowRight size={16} />
      </button>
      <button className="pill light large" onClick={() => navigate("shop")}>
        <ShoppingBag size={15} /> SHOP OUR CATALOG <ArrowRight size={16} />
      </button>
    </div><div className="hero-meta"><span><MapPin size={16} /> Abeka, Accra</span><span><Clock3 size={16} /> Open today until 7pm</span></div></div>
      <div className="hero-art" aria-label="Editorial beauty studio graphic">
        <div className="arch">
          <span className="arch-number">01</span>
          <div className="crown-lines">✦</div>
          <strong>GB</strong>
          <small>POLISHED · PROFESSIONAL · PERSONAL</small>
          <div className="arch-service-pills">
            <button className="arch-pill" onClick={() => navigate("services", "Nails")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              NAILS
            </button>
            <button className="arch-pill" onClick={() => navigate("services", "Hair")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
              HAIR
            </button>
            <button className="arch-pill" onClick={() => navigate("services", "Lashes")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
              LASHES
            </button>
          </div>
        </div>
      </div>
    </section>
    <section className="marquee" aria-hidden="true"><span>NAILS</span><i>✦</i><span>HAIR</span><i>✦</i><span>LASHES</span><i>✦</i><span>MAKEUP</span><i>✦</i><span>BEAUTY, CROWNED</span></section>
    <section className="section services-preview"><SectionHead kicker="The Gailand edit" title="Services made for your moment." action="View all services" onAction={() => navigate("services")} /><div className="service-grid">{SERVICES.filter((x) => x.featured).map((service, index) => <ServiceCard key={service.id} service={service} index={index} book={book} isFav={favorites.includes(service.id)} toggleFav={toggleFavorite} />)}</div></section>
    <section className="statement"><p className="eyebrow light">Our philosophy</p><blockquote>“Every detail should feel <em>intentional.</em><br />Every client should leave feeling <em>royal.</em>”</blockquote><p>{BRAND.about}</p></section>
    <section className="section shop-preview"><SectionHead kicker="The beauty shelf" title="Your crown, cared for." action="Shop all" onAction={() => navigate("shop")} /><div className="product-grid">{PRODUCTS.map((product) => <ProductCard key={product.id} product={product} add={addToCart} isFav={favorites.includes(product.id)} toggleFav={toggleFavorite} />)}</div></section>
    <section className="experience"><div><p className="eyebrow">Beauty comes to you</p><h2>The salon experience,<br /><em>at your door.</em></h2></div><div><p>Professional beauty service, wherever you feel most at ease. Select home service when booking and we’ll take care of the rest.</p><button className="pill light" onClick={() => navigate("services")}>Book home service <ArrowRight size={17} /></button></div></section>
    
    {/* Client Notes Section with 3-per-line Flash Card Carousel */}
    <section className="section testimonials">
      <div className="section-head" style={{ alignItems: "center" }}>
        <div>
          <p className="eyebrow">Client notes</p>
          <h2>Loved in Accra.</h2>
        </div>
        <div className="carousel-controls" style={{ display: "flex", gap: 10 }}>
          <button className="carousel-nav-btn" onClick={prevTestimonials} aria-label="Previous testimonials">←</button>
          <button className="carousel-nav-btn" onClick={nextTestimonials} aria-label="Next testimonials">→</button>
        </div>
      </div>
      <div className="testimonial-flash-grid">
        {visibleTestimonials.map((item, idx) => (
          <article key={item.name + idx} className="flash-card glass-reveal">
            <div className="flash-card-header">
              <span className="stars">★★★★★</span>
              <span className="card-number">0{testimonialIndex * itemsPerPage + idx + 1}</span>
            </div>
            <p className="flash-quote">“{item.quote}”</p>
            <footer>
              <strong>{item.name}</strong>
              <span className="service-tag">{item.service}</span>
            </footer>
          </article>
        ))}
      </div>
    </section>

    <section className="contact-strip"><div><MapPin /><span><small>VISIT</small>{BRAND.location}</span></div><div><Phone /><span><small>CALL / WHATSAPP</small>{BRAND.primaryPhone}</span></div><div><Clock3 /><span><small>OPEN</small>{BRAND.hours}</span></div></section>
  </>;
}

function CrownMarkIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><circle cx="12" cy="17" r="1"/></svg>;
}

function SectionHead({ kicker, title, action, onAction }: { kicker: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-head"><div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>; }

function ServiceCard({ service, index, book, isFav, toggleFav }: { service: Service; index: number; book: (s: Service) => void; isFav?: boolean; toggleFav?: (id: string) => void }) { 
  return <article className="service-card">
    <div className={`service-visual tone-${index + 1}`}>
      <span>0{index + 1}</span>
      <strong>{service.category.substring(0, 1)}</strong>
      <small>{service.category}</small>
      {toggleFav && (
        <button className="fav-toggle-btn" onClick={() => toggleFav(service.id)} aria-label="Toggle wishlist" style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.85)", border: 0, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "#0a0a0a" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
      )}
    </div>
    <div className="card-content">
      <div><span className="category">{service.category}</span><span>{service.duration}</span></div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <footer><strong>{service.consultation ? "Consultation" : `From ${money(service.price)}`}</strong><button onClick={() => book(service)}>{service.consultation ? "Request" : "Book"} <ArrowRight size={16} /></button></footer>
    </div>
  </article>; 
}

function ProductCard({ product, add, isFav, toggleFav }: { product: Product; add: (p: Product) => void; isFav?: boolean; toggleFav?: (id: string) => void }) { 
  return <article className="product-card">
    <div className={`product-visual ${product.tone}`}>
      {product.badge && <span className="badge">{product.badge}</span>}
      {toggleFav && (
        <button className="fav-toggle-btn" onClick={() => toggleFav(product.id)} aria-label="Toggle wishlist" style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.85)", border: 0, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "#0a0a0a" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
      )}
      <span className="product-shape">G</span>
      <button className="quick-add" onClick={() => add(product)} aria-label={`Add ${product.name} to cart`}><Plus /></button>
    </div>
    <div className="product-info"><span>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong></div>
  </article>; 
}

function ServicesPage({ book, favorites, toggleFavorite, initialFilter }: { book: (s: Service) => void; favorites: string[]; toggleFavorite: (id: string) => void; initialFilter?: string | null }) {
  const [filter, setFilter] = useState(initialFilter || "All");
  const categories = ["All", "Nails", "Hair", "Lashes", "Makeup", "Brows", "Locs", "Long Hair", "Short Hair", "Treatments"];
  const list = SERVICES.filter(s => filter === "All" || s.category === filter || s.subCategory === filter);

  return <><PageHero number="01" kicker="Services menu" title="Curated for your" italic="crowning moment." text="Detailed gel sets, braids, silk press and customized lash applications in Accra." />
    <section className="section catalog">
      <div className="filter-row">
        {categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      <div className="service-grid service-list">
        {list.map((service, index) => <ServiceCard key={service.id} service={service} index={index} book={book} isFav={favorites.includes(service.id)} toggleFav={toggleFavorite} />)}
      </div>
    </section>
  </>;
}

function ShopPage({ addToCart, favorites, toggleFavorite, initialFilter }: { addToCart: (p: Product) => void; favorites: string[]; toggleFavorite: (id: string) => void; initialFilter?: string | null }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter || "All");
  const categories = ["All", "Wigs", "Short Hair", "Long Hair", "Accessories", "Beauty"];
  const products = PRODUCTS.filter((p) => {
    const matchesFilter = filter === "All" || p.category === filter || p.subCategory === filter;
    const matchesSearch = `${p.name} ${p.category} ${p.subCategory || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return <><PageHero number="02" kicker="The shop" title="Beauty that keeps" italic="giving." text="Studio-approved wigs, tools and essentials, selected to make every day feel polished." />
    <section className="section catalog">
      <div className="filter-row" style={{ marginBottom: 20 }}>
        {categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      <div className="shop-tools">
        <p>{products.length} curated pieces</p>
        <label><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the collection" /></label>
      </div>
      <div className="product-grid shop-grid">
        {products.map((p) => <ProductCard key={p.id} product={p} add={addToCart} isFav={favorites.includes(p.id)} toggleFav={toggleFavorite} />)}
      </div>
    </section>
  </>;
}

function WishlistPage({ favorites, addToCart, toggleFavorite }: { favorites: string[]; addToCart: (p: Product) => void; toggleFavorite: (id: string) => void }) {
  const savedProducts = PRODUCTS.filter((p) => favorites.includes(p.id));
  const savedServices = SERVICES.filter((s) => favorites.includes(s.id));

  return <><PageHero number="02" kicker="Saved pieces" title="Your personal" italic="wishlist." text="Keep track of your favorite beauty pieces and studio essentials." />
    <section className="section catalog">
      {savedProducts.length === 0 && savedServices.length === 0 ? (
        <div className="empty-state" style={{ padding: "80px 20px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.6 }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          <h3 style={{ font: "500 32px var(--display)", margin: "8px 0" }}>Your wishlist is empty</h3>
          <p style={{ color: "#777", marginBottom: 24 }}>Explore our shop collection and save your favorites.</p>
        </div>
      ) : (
        <>
          {savedServices.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ font: "500 24px var(--display)", marginBottom: 16 }}>Saved Services</h3>
              <div className="service-grid">
                {savedServices.map((s, i) => <ServiceCard key={s.id} service={s} index={i} book={() => {}} isFav={true} toggleFav={toggleFavorite} />)}
              </div>
            </div>
          )}
          {savedProducts.length > 0 && (
            <div>
              <h3 style={{ font: "500 24px var(--display)", marginBottom: 16 }}>Saved Products</h3>
              <div className="product-grid shop-grid">
                {savedProducts.map((p) => <ProductCard key={p.id} product={p} add={addToCart} isFav={true} toggleFav={toggleFavorite} />)}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  </>;
}

function PageHero({ number, kicker, title, italic, text }: { number: string; kicker: string; title: string; italic: string; text: string }) { return <section className="page-hero"><span>{number}</span><div><p className="eyebrow">{kicker}</p><h1>{title}<br /><em>{italic}</em></h1></div><p>{text}</p></section>; }

function TrackPage() {
  const [reference, setReference] = useState(""); 
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = reference.trim().toUpperCase();
    const found = MOCK_TRACKING_DATABASE[cleanRef] || null;
    setRecord(found);
    setSearched(true);
  };

  return <><PageHero number="03" kicker="Track with ease" title="Know what’s" italic="next." text="Use your order or booking reference to see real-time payment status and schedule updates." />
    <section className="track-section">
      <div className="track-card">
        <Package size={32} />
        <h2>Track an order or booking</h2>
        <p>Try sample references: <strong>GB-2026-001</strong> (Paid), <strong>GB-2026-002</strong> (Guaranteed), <strong>GB-2026-003</strong> (Rescheduled), or <strong>GB-2026-004</strong> (Canceled).</p>
        <form onSubmit={handleTrack}>
          <label>REFERENCE NUMBER
            <input required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. GB-2026-001" />
          </label>
          <button className="pill dark" type="submit">Check status <ArrowRight size={17} /></button>
        </form>

        {searched && record && (
          <div className="track-result" style={{ flexDirection: "column", gap: 12, marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <small style={{ color: "#777" }}>REF: {record.reference}</small>
                <h3 style={{ font: "500 22px var(--display)", margin: "4px 0" }}>{record.item}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Client: <strong>{record.clientName}</strong> · {record.type}</p>
              </div>
              <span className={`badge-status ${record.status.toLowerCase()}`}>{record.status}</span>
            </div>
            <div style={{ borderTop: "1px solid #ddd", paddingTop: 12, fontSize: 13 }}>
              <p style={{ margin: "0 0 6px" }}>📅 <strong>Scheduled Date / Details:</strong> {record.date}</p>
              {record.adminNote && <p style={{ margin: "6px 0", background: "#fff", padding: "10px 14px", borderRadius: 6, borderLeft: "3px solid #111" }}>💬 <strong>Studio Note:</strong> {record.adminNote}</p>}
              {record.status === "Canceled" && (
                <div style={{ marginTop: 10, background: "#fff5f5", padding: "12px 14px", borderRadius: 6, border: "1px solid #fecaca", color: "#991b1b" }}>
                  ⚠️ <strong>Canceled & Refunded Status:</strong> {record.refundNote || "Appointment canceled. 100% Refund has been processed back to your original payment method."}
                </div>
              )}
            </div>
          </div>
        )}

        {searched && !record && (
          <div className="track-result" style={{ marginTop: 24, background: "#fff8f6" }}>
            <div>
              <strong>Reference Not Found</strong>
              <p>We couldn't find reference "{reference}". Please double check your code or WhatsApp our team for help.</p>
            </div>
          </div>
        )}
      </div>
      <aside>
        <p className="eyebrow">Customer Support</p>
        <h3>We’re one message away.</h3>
        <p>Need to modify your appointment or inquire about your home delivery? Chat with our team directly.</p>
        <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" style={{ marginBottom: 12 }}>Chat on WhatsApp <ArrowRight size={16} /></a>
        <a href={`tel:${BRAND.primaryPhone}`}>Call {BRAND.primaryPhone}</a>
      </aside>
    </section>
  </>;
}

function PoliciesPage({ navigate }: { navigate: (v: View) => void }) { 
  const [reviews, setReviews] = useState(TESTIMONIALS);
  const [newReview, setNewReview] = useState({ name: "", service: "", quote: "" });
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"policies" | "faqs" | "review">("policies");

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.name && newReview.quote) {
      setReviews([{ quote: newReview.quote, name: newReview.name, service: newReview.service || "Client Review", rating: 5 }, ...reviews]);
      setSubmitted(true);
      setNewReview({ name: "", service: "", quote: "" });
    }
  };

  return <><PageHero number="04" kicker="Good to know" title="Policies, FAQs &" italic="reviews." text="Clear studio guidelines, frequently asked questions, and real client reviews." />
    <section className="policy-section">
      <div>
        {/* Navigation Tabs for Reorganized Layout */}
        <div className="policy-tab-bar" style={{ display: "flex", gap: 12, marginBottom: 32, borderBottom: "1px solid #ddd", paddingBottom: 12 }}>
          <button className={`pill ${activeTab === "policies" ? "dark" : "light"}`} onClick={() => setActiveTab("policies")}>Studio Guidelines</button>
          <button className={`pill ${activeTab === "faqs" ? "dark" : "light"}`} onClick={() => setActiveTab("faqs")}>FAQs</button>
          <button className={`pill ${activeTab === "review" ? "dark" : "light"}`} onClick={() => setActiveTab("review")}>Leave a Review</button>
        </div>

        {activeTab === "policies" && (
          <div className="policy-group">
            <h3 style={{ font: "500 30px var(--display)", marginBottom: 20 }}>Studio Guidelines</h3>
            {POLICIES.map((policy, i) => <article key={policy}><span>0{i + 1}</span><p>{policy}</p></article>)}
          </div>
        )}

        {activeTab === "faqs" && (
          <div className="faq-group">
            <h3 style={{ font: "500 30px var(--display)", marginBottom: 20 }}>Frequently Asked Questions</h3>
            <div className="faq-grid">
              {FAQS.map((faq, idx) => (
                <details key={idx} className="faq-item">
                  <summary>{faq.question} <ChevronDown size={16} /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {activeTab === "review" && (
          <div className="review-form-card" style={{ marginTop: 0 }}>
            <h3>Leave a Review</h3>
            <p>Loved your Gailand experience? Share your notes with us!</p>
            {submitted ? (
              <p style={{ color: "#166534", fontWeight: 600 }}>Thank you for your feedback! Your review has been added.</p>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="two-col">
                  <input required placeholder="Your Name" value={newReview.name} onChange={e => setNewReview({ ...newReview, name: e.target.value })} />
                  <input placeholder="Service Received (e.g. Knotless Braids)" value={newReview.service} onChange={e => setNewReview({ ...newReview, service: e.target.value })} />
                </div>
                <textarea required placeholder="Write your review here..." value={newReview.quote} onChange={e => setNewReview({ ...newReview, quote: e.target.value })} style={{ height: 80, padding: 12 }} />
                <button className="pill dark" type="submit" style={{ width: "max-content" }}>Submit Review <ArrowRight size={16} /></button>
              </form>
            )}
          </div>
        )}
      </div>

      <aside>
        <p className="eyebrow light">Customer Support</p>
        <h2>Let’s make it easy.</h2>
        <p>Talk to our team before booking if you need extra time, accessibility support or a special arrangement.</p>
        <a className="pill light" href={`tel:${BRAND.primaryPhone}`} style={{ marginBottom: 16 }}>Call {BRAND.primaryPhone}</a>
        <a className="pill light" href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp Us</a>
      </aside>
    </section>
  </>;
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
  
  const submit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setLoading(true); 
    const table = modal.kind === "checkout" ? "orders" : modal.kind === "consultation" ? "consultation_requests" : "bookings"; 
    const payload = modal.kind === "checkout" ? { name: form.name, phone: form.phone, email: form.email, address: form.address, items: cart, total_amount: due, status: "pending_payment" } : modal.kind === "consultation" ? { name: form.name, phone: form.phone, email: form.email, service_id: service?.id, service_name: service?.name, notes: form.notes, status: "new" } : { name: form.name, phone: form.phone, email: form.email, service_id: service?.id, service_name: service?.name, appointment_date: form.date, appointment_time: form.time, stylist_preference: form.stylist, home_service: homeService, address: form.address, notes: form.notes, total_amount: total, deposit_amount: due, status: "pending_payment" }; 
    const { error } = await insertRecord(table, payload); 
    setLoading(false); 
    if (error) return alert(error.message); 
    complete(modal.kind === "consultation" ? "Consultation request received. We’ll call you shortly." : `Thank you, ${form.name.split(" ")[0] || "queen"}. Your request is confirmed.`); 
  };

  return (
    <div className="overlay modal-overlay">
      <div className="flow-modal">
        <button className="modal-close" onClick={close} aria-label="Close"><X /></button>
        <div className="modal-intro">
          <p className="eyebrow">{modal.kind === "checkout" ? "Secure checkout" : modal.kind === "consultation" ? "Let’s talk" : "Reserve your time"}</p>
          <h2>{modal.kind === "checkout" ? "Complete your order." : service?.name}</h2>
          <p>{modal.kind === "consultation" ? "Tell us what you have in mind and our team will reach out with the best next step." : "A few details, then your beauty moment is secured."}</p>
          {modal.kind !== "checkout" && (
            <div className="modal-summary">
              <span>{service?.duration}</span>
              <strong>{modal.kind === "consultation" ? "No payment today" : `${money(due)} deposit`}</strong>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="flow-form">
          <div className="two-col">
            <label>FULL NAME<input required value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="Your name" /></label>
            <label>PHONE / WHATSAPP<input required value={form.phone} onChange={(e) => change("phone", e.target.value)} placeholder="055 000 0000" /></label>
          </div>
          <label>EMAIL<input type="email" value={form.email} onChange={(e) => change("email", e.target.value)} placeholder="you@example.com" /></label>
          
          {modal.kind === "booking" && (
            <>
              <div className="two-col">
                <label>PREFERRED DATE<input required type="date" value={form.date} onChange={(e) => change("date", e.target.value)} /></label>
                <label>PREFERRED TIME
                  <select required value={form.time} onChange={(e) => change("time", e.target.value)}>
                    <option value="">Select time</option>
                    <option>9:00 AM</option>
                    <option>11:00 AM</option>
                    <option>1:00 PM</option>
                    <option>3:00 PM</option>
                    <option>5:00 PM</option>
                  </select>
                </label>
              </div>
              <label>STYLIST PREFERENCE <span>OPTIONAL</span><input value={form.stylist} onChange={(e) => change("stylist", e.target.value)} placeholder="No preference" /></label>
              <label className="switch-row">
                <input type="checkbox" checked={homeService} onChange={(e) => setHomeService(e.target.checked)} />
                <span>
                  <strong>Bring Gailand to me</strong>
                  <small>Home service from {money(BRAND.homeSurcharge)} within Accra</small>
                </span>
              </label>
              {homeService && <label>HOME ADDRESS<input required value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Your location in Accra" /></label>}
            </>
          )}

          {modal.kind === "checkout" && (
            <label>DELIVERY ADDRESS<input required value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Street, area, city" /></label>
          )}
          
          <label>NOTES <span>OPTIONAL</span><textarea value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Anything we should know?" /></label>
          <button className="pill dark full" disabled={loading}>{loading ? "Please wait…" : modal.kind === "consultation" ? "Send consultation request" : `Continue to Paystack · ${money(due)}`}</button>
          {modal.kind !== "consultation" && <small className="secure-note">Secure payment · Paystack · MoMo & cards accepted</small>}
        </form>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState("Dashboard");

  if (!loggedIn) return (
    <section className="admin-login">
      <div>
        <div className="admin-brand" style={{ cursor: "default" }}>
          <span>Gailand</span><small>BEAUTY</small>
        </div>
        <div className="login-card">
          <p className="eyebrow">Staff access</p>
          <h1>Welcome back.</h1>
          <p>Enter your credentials to open the Gailand Beauty office.</p>
          <form onSubmit={(e) => { e.preventDefault(); const validUser = username.trim().toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin").toLowerCase(); const validPassword = password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "gailand2026admin"); if (validUser && validPassword) setLoggedIn(true); else alert("Incorrect username or password"); }}>
            <label>USERNAME<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin username" /></label>
            <label>PASSWORD
              <div className="password-wrap">
                <input autoComplete="current-password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
                <button type="button" className="eye-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </label>
            <button className="pill dark large full">Enter dashboard <ArrowRight size={17} /></button>
          </form>
          <a className="back-site" href="/">← Return to main website</a>
        </div>
      </div>
      <aside><span>GB</span><p>THE GAILAND OFFICE</p></aside>
    </section>
  );

  const tabs = ["Dashboard", "Services", "Products", "Bookings", "Consultations", "Orders", "Reviews"];
  
  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div className="wordmark" style={{ cursor: "default" }}>
          <span>GAILAND</span><small>BEAUTY</small>
        </div>
        <nav>
          {tabs.map((x) => (
            <button key={x} onClick={() => setTab(x)} className={tab === x ? "active" : ""}>
              {x}<span>›</span>
            </button>
          ))}
        </nav>
        <button className="signout" onClick={() => setLoggedIn(false)}>Sign out</button>
      </aside>
      <div className="admin-main">
        <header>
          <div>
            <p>GAILAND BEAUTY · ADMIN OFFICE</p>
            <h1>{tab}</h1>
          </div>
          <button className="pill dark large"><Plus size={16} /> Add new entry</button>
        </header>
        {tab === "Dashboard" ? <Dashboard /> : <AdminTable title={tab} />}
      </div>
    </section>
  );
}

function Dashboard() { 
  const stats = [["Active Bookings", "06", "Real-time appointments"], ["Pending Orders", "04", "Ready to dispatch"], ["Total Revenue", "GH₵ 8,420", "Live Paystack data"], ["Consultations", "03", "Awaiting response"]]; 
  return <><div className="stat-grid">{stats.map((x) => <article key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]}</small></article>)}</div><div className="admin-panels"><section><header><h2>Today’s scheduled appointments</h2><button>View all</button></header>{["Akosua Mensah", "Mabel Ofori", "Dede Boateng"].map((x, i) => <div className="appointment" key={x}><time>{["09:00", "11:30", "14:00"][i]}</time><span><strong>{x}</strong><small>{SERVICES[i].name}</small></span><b className={i === 0 ? "confirmed" : "pending"}>{i === 0 ? "Confirmed" : "Pending"}</b></div>)}</section><section className="quick-panel"><header><h2>System Status</h2></header><div><span>Services live</span><strong>{SERVICES.length}</strong></div><div><span>Products live</span><strong>{PRODUCTS.length}</strong></div><div><span>Reviews live</span><strong>{TESTIMONIALS.length}</strong></div></section></div></>;
}

function AdminTable({ title }: { title: string }) { 
  const [searchTerm, setSearchTerm] = useState("");
  
  let rows: [string, string, string, string][] = [];
  if (title === "Products") {
    rows = PRODUCTS.map((x) => [x.name, x.category, money(x.price), "Active"]);
  } else if (title === "Services") {
    rows = SERVICES.map((x) => [x.name, x.category, x.duration, x.consultation ? "Consultation" : "Active"]);
  } else if (title === "Reviews") {
    rows = TESTIMONIALS.map((x) => [x.name, x.service, `★ ${x.rating || 5}.0`, "Published"]);
  } else if (title === "Bookings") {
    rows = [
      ["Abena Mansa", "Knotless Braids", "July 24, 10:00 AM", "Confirmed"],
      ["Efya Mensah", "Signature Gel Set", "July 26, 02:00 PM", "Rescheduled"],
      ["Akosua Addo", "Soft Glam", "July 22, 11:00 AM", "Canceled"]
    ];
  } else if (title === "Orders") {
    rows = [
      ["Kofi Owusu", "The Accra Bob", "GH₵ 950", "Guaranteed"],
      ["Ama Serwaa", "Crown Melt Band", "GH₵ 60", "Paid"]
    ];
  } else {
    rows = [
      ["Nana Yaa", "Locs Consultation", "Needs Call", "New"],
      ["Kwadwo Antwi", "Beauty Training", "Needs Call", "New"]
    ];
  }

  const filtered = rows.filter(r => r[0].toLowerCase().includes(searchTerm.toLowerCase()) || r[1].toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="admin-table">
      <div className="table-tools">
        <label>
          <Search size={17} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} />
        </label>
        <button>Export CSV</button>
      </div>
      <div className="table-row table-head">
        <span>Title / Name</span>
        <span>Category / Service</span>
        <span>Price / Time / Rating</span>
        <span>Status</span>
        <span></span>
      </div>
      {filtered.map((row, idx) => (
        <div className="table-row" key={idx}>
          <strong>{row[0]}</strong>
          <span>{row[1]}</span>
          <span>{row[2]}</span>
          <b className={`badge-status ${row[3].toLowerCase()}`}>{row[3]}</b>
          <button style={{ cursor: "pointer", opacity: 0.7 }}>•••</button>
        </div>
      ))}
    </div>
  );
}

function Footer({ navigate }: { navigate: (v: View) => void }) { 
  return <footer className="footer"><div className="footer-main"><div><CrownMark /><p>{BRAND.tagline}</p>
    <div className="socials">
      <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
      </a>
      <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
      </a>
    </div>
  </div><div><small>EXPLORE</small><button onClick={() => navigate("services")}>Services</button><button onClick={() => navigate("shop")}>Shop</button><button onClick={() => navigate("track")}>Track</button></div><div><small>VISIT & CONTACT</small><p>{BRAND.location}</p><a href={`tel:${BRAND.primaryPhone}`}>{BRAND.primaryPhone}</a><a href={`tel:${BRAND.secondaryPhone}`}>{BRAND.secondaryPhone}</a></div><div><small>OPENING HOURS</small><p>Mon–Sat<br />8:00am — 7:00pm</p><p>Sunday<br />12:00pm — 7:00pm</p></div></div><div className="footer-bottom"><span>© 2026 Gailand Beauty</span><button onClick={() => navigate("policies")}>Policies & terms</button><span>Beauty, crowned.</span></div></footer>; 
}
