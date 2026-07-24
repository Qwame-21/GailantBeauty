"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Check, ChevronDown, Clock, Download, Heart, MapPin, Menu, Minus, Package, Plus, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { BRAND, POLICIES, PRODUCTS, SERVICES, TESTIMONIALS, FAQS, CATEGORIES_DROPDOWN, MOCK_TRACKING_DATABASE, type Product, type Service, type TrackingRecord } from "./constants";
import { insertRecord, signInAdmin, trackReference, updateRecord } from "./lib/supabase";
import { GAILAND_DATA_EVENT, loadCatalog, patchLocalRecord } from "./lib/gailand-store";
import { openPaystackPayment } from "./lib/paystack";

type View = "home" | "services" | "shop" | "wishlist" | "track" | "policies";
type CartLine = Product & { quantity: number };
type Modal = { kind: "booking"; service: Service } | { kind: "consultation"; service: Service } | null;

const money = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);

export function GailantApp() {
  const [, refreshCatalog] = useState(0);
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const overlayOpen = cartOpen || searchOpen || modal !== null;

  useEffect(() => {
    const syncCatalog = () => {
      const catalog = loadCatalog({ services: SERVICES, products: PRODUCTS, testimonials: TESTIMONIALS });
      SERVICES.splice(0, SERVICES.length, ...catalog.services);
      PRODUCTS.splice(0, PRODUCTS.length, ...catalog.products);
      TESTIMONIALS.splice(0, TESTIMONIALS.length, ...catalog.testimonials.map(({ quote, name, service, rating }) => ({ quote, name, service, rating })));
      refreshCatalog(v => v + 1);
    };
    syncCatalog();
    window.addEventListener(GAILAND_DATA_EVENT, syncCatalog);
    return () => window.removeEventListener(GAILAND_DATA_EVENT, syncCatalog);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const targets = document.querySelectorAll<HTMLElement>(
        ".section-head, .service-card, .product-card, .flash-card, .statement blockquote, .experience > div"
      );
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

      targets.forEach((target, index) => {
        target.classList.add("scroll-reveal");
        target.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
        observer.observe(target);
      });

      document.body.dataset.revealObserverReady = "true";
      (window as Window & { __gailandRevealObserver?: IntersectionObserver }).__gailandRevealObserver = observer;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const revealWindow = window as Window & { __gailandRevealObserver?: IntersectionObserver };
      revealWindow.__gailandRevealObserver?.disconnect();
      delete revealWindow.__gailandRevealObserver;
    };
  }, [view]);

  useEffect(() => {
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeTopLayer = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSearchOpen(false);
      setCartOpen(false);
      setModal(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeTopLayer);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeTopLayer);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const navigate = (next: View, filter?: string) => {
    setView(next);
    setFilterCategory(filter || null);
    setMenuOpen(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const addToCart = (product: Product) => {
    setCart((current) => current.some((x) => x.id === product.id) ? current.map((x) => x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x) : [...current, { ...product, quantity: 1 }]);
    setNotice(`ADDED ${product.name.toUpperCase()} TO BAG`);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const removing = prev.includes(id);
      setNotice(removing ? "REMOVED FROM WISHLIST" : "ADDED TO WISHLIST");
      return removing ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const updateCart = (id: string, delta: number) => setCart((current) => current.map((x) => x.id === id ? { ...x, quantity: x.quantity + delta } : x).filter((x) => x.quantity > 0));
  const count = cart.reduce((sum, x) => sum + x.quantity, 0);

  return <div className="site-shell">
    <Header view={view} navigate={navigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} cartCount={count} favoritesCount={favorites.length} openCart={() => setCartOpen(true)} openSearch={() => setSearchOpen(true)} />
    <main>
      {view === "home" && <Home navigate={navigate} book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} addToCart={addToCart} favorites={favorites} toggleFavorite={toggleFavorite} />}
      {view === "services" && <ServicesPage book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} favorites={favorites} toggleFavorite={toggleFavorite} initialFilter={filterCategory} />}
      {view === "shop" && <ShopPage addToCart={addToCart} favorites={favorites} toggleFavorite={toggleFavorite} initialFilter={filterCategory} />}
      {view === "wishlist" && <WishlistPage favorites={favorites} addToCart={addToCart} toggleFavorite={toggleFavorite} book={(service) => setModal(service.consultation ? { kind: "consultation", service } : { kind: "booking", service })} />}
      {view === "track" && <TrackPage />}
      {view === "policies" && <PoliciesPage />}
    </main>
    <Footer navigate={navigate} />
    <FloatingTrioWidget cartCount={count} favoritesCount={favorites.length} openCart={() => setCartOpen(true)} navigate={navigate} />
    {searchOpen && <SearchModal close={() => setSearchOpen(false)} navigate={(v) => { setSearchOpen(false); navigate(v); }} />}
    {cartOpen && <CartDrawer cart={cart} close={() => setCartOpen(false)} update={updateCart} complete={(message) => { setCartOpen(false); setCart([]); setNotice(message); }} />}
    {modal && <FlowModal modal={modal} close={() => setModal(null)} complete={(message) => { setModal(null); setNotice(message); }} />}
    {notice && <div className="toast" role="status" aria-live="polite"><Check size={17} />{notice}<button aria-label="Close notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
  </div>;
}

function SearchModal({ close, navigate }: { close: () => void; navigate: (v: View) => void }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = term.length > 0 ? [
    ...SERVICES.filter(s => `${s.name} ${s.category} ${s.subCategory || ""} ${s.description}`.toLowerCase().includes(term)).map(s => ({ label: s.name, sub: `${s.category} service`, action: () => navigate("services") })),
    ...PRODUCTS.filter(p => `${p.name} ${p.category} ${p.subCategory || ""}`.toLowerCase().includes(term)).map(p => ({ label: p.name, sub: `${p.category} product`, action: () => navigate("shop") })),
  ] : [];
  return (
    <div className="overlay modal-overlay" onMouseDown={close}>
      <div className="search-modal" role="dialog" aria-modal="true" aria-label="Search Gailant Beauty" onMouseDown={e => e.stopPropagation()}>
        <div className="search-modal-inner">
          <Search size={20} color="#aaa" />
          <input autoFocus className="search-modal-input" placeholder="Search services, products…" value={q} onChange={e => setQ(e.target.value)} />
          <button className="search-modal-close" onClick={close} aria-label="Close search"><X size={18} /></button>
        </div>
        {!term && <div className="search-suggestions">
          <small>POPULAR SEARCHES</small>
          <ul className="search-popular-list">
            {["Nails", "Hair", "Lashes", "Makeup", "Wigs"].map(item => (
              <li key={item}>
                <button type="button" onClick={() => setQ(item)}>
                  <span>{item}</span>
                  <ArrowRight size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>}
        {results.length > 0 && <div className="search-results">
          {results.map((r, i) => <button key={i} className="search-result-row" onClick={r.action}>
            <span>{r.label}</span><small>{r.sub}</small><ArrowRight size={14} />
          </button>)}
        </div>}
        {term && results.length === 0 && <p className="search-empty">No results for &quot;{q}&quot;. Try nails, wigs, hair, lashes, or makeup.</p>}
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
        <span>WISHLIST {favoritesCount > 0 ? `(${favoritesCount})` : ''}</span>
      </button>
      <div className="divider" />
      <button onClick={() => navigate("services")} title="Categories">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="6" x="3" y="3" rx="1" /><rect width="6" height="6" x="15" y="3" rx="1" /><rect width="6" height="6" x="15" y="15" rx="1" /><rect width="6" height="6" x="3" y="15" rx="1" /></svg>
        <span>CATEGORIES</span>
      </button>
    </div>
  );
}

function CrownMark({ onHome }: { onHome?: () => void }) { return <button className="wordmark" onClick={onHome || (() => window.location.assign("/"))} aria-label="Gailant Beauty home"><Image src="/gailand-crowned-g.png" alt="" width={1024} height={1024} priority /></button>; }

function Header({ view, navigate, menuOpen, setMenuOpen, cartCount, favoritesCount, openCart, openSearch }: { view: View; navigate: (v: View, f?: string) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void; cartCount: number; favoritesCount: number; openCart: () => void; openSearch: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const links: [View, string][] = [["services", "SERVICES"], ["shop", "SHOP"], ["track", "TRACK"], ["policies", "POLICIES"]];

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const hero = document.querySelector<HTMLElement>(".hero, .page-hero");
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 128;

      setScrolled(currentScrollY >= heroBottom - 68);

      // Hide on scroll-down after 120px, show on scroll-up
      if (currentScrollY > 120 && currentScrollY > lastScrollY && !menuOpen) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [menuOpen]);

  const headerClass = `header${scrolled ? " header--scrolled" : " header--transparent"}${hidden ? " header--hidden" : ""}${menuOpen ? " header--menu-open" : ""}`;

  return <header className={headerClass}><div className="nav-wrap">
    <CrownMark onHome={() => navigate("home")} />
    <nav id="primary-navigation" className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
      {links.map(([id, label]) => (
        <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}>
          {label}
        </button>
      ))}
      <div className="mobile-nav-categories">
        <span className="mobile-nav-heading">CATEGORIES</span>
        {CATEGORIES_DROPDOWN.flatMap(col => col.items).slice(0, 5).map((item) => (
          <button
            key={`mob-${item.label}`}
            className="mobile-category-item"
            onClick={() => navigate(item.target, item.filter)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
    <div className="nav-actions">
      <button className="search-icon-btn" onClick={openSearch} aria-label="Open search">
        <Search size={17} />
      </button>
      <button className="nav-action-btn bag-btn" onClick={openCart} aria-label={`Bag with ${cartCount} items`}>
        <ShoppingBag size={16} />
        <span className="btn-label">BAG ({cartCount})</span>
        {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
      </button>
      <button className="search-icon-btn wishlist-icon-btn" onClick={() => navigate("wishlist")} aria-label="Open wishlist">
        <Heart size={17} />
        {favoritesCount > 0 && <span className="wishlist-count" aria-label={`${favoritesCount} saved items`}>{favoritesCount}</span>}
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="6" x="3" y="3" rx="1" /><rect width="6" height="6" x="14" y="3" rx="1" /><rect width="6" height="6" x="14" y="14" rx="1" /><rect width="6" height="6" x="3" y="14" rx="1" /></svg>
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
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen} aria-controls="primary-navigation">{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>;
}

function Home({ navigate, book, addToCart, favorites, toggleFavorite }: { navigate: (v: View, f?: string) => void; book: (s: Service) => void; addToCart: (p: Product) => void; favorites: string[]; toggleFavorite: (id: string) => void }) {
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(2);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth <= 760 ? 1 : 2);
      setTestimonialIndex(0);
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const maxPages = Math.ceil(TESTIMONIALS.length / itemsPerPage);
  const visibleTestimonials = TESTIMONIALS.slice(testimonialIndex * itemsPerPage, (testimonialIndex + 1) * itemsPerPage);

  const prevTestimonials = () => setTestimonialIndex((prev) => (prev > 0 ? prev - 1 : maxPages - 1));
  const nextTestimonials = () => setTestimonialIndex((prev) => (prev < maxPages - 1 ? prev + 1 : 0));

  return <>
    <section className="hero hero-editorial" aria-label="Gailant Beauty hero">
      <div className="hero-image-panel" aria-hidden="true">
        <picture>
          <source srcSet="/hero-editorial.jpg" type="image/jpeg" />
          <img
            src="/hero-editorial.jpg"
            alt="Gailant Beauty editorial, model at marble counter with luxury haircare products in a gold-lit salon"
            className="hero-img"
            fetchPriority="high"
            decoding="async"
            width="1200"
            height="800"
          />
        </picture>
        <div className="hero-fade" aria-hidden="true" />
      </div>

      <div className="hero-copy">
        <h1>Where beauty<br />wears a <em>crown.</em></h1>
        <p className="hero-text">{BRAND.description}</p>
        <div className="hero-actions">
          <button className="hero-btn-primary" onClick={() => navigate("services")} id="hero-cta-services">
            <CrownMarkIcon />
            <span>FIND YOUR SERVICE</span>
            <ArrowRight size={14} />
          </button>
          <button className="hero-btn-secondary" onClick={() => navigate("shop")} id="hero-cta-shop">
            <ShoppingBag size={14} />
            <span>SHOP CATALOG</span>
            <ArrowRight size={14} />
          </button>
          <a className="hero-btn-secondary hero-btn-location" href={BRAND.mapsUrl} target="_blank" rel="noreferrer" id="hero-cta-location">
            <MapPin size={14} />
            <span>GET DIRECTIONS</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>

      <p className="hero-category-label">EXPLORE OUR SERVICES</p>
      <div className="hero-category-cards" aria-label="Explore beauty categories">
        {[
          { name: "NAILS", note: "Sets, care & artistry", filter: "Nails" },
          { name: "HAIR", note: "Braids, locs & treatments", filter: "Hair" },
          { name: "LASHES", note: "Classic to full volume", filter: "Lashes" },
          { name: "MAKEUP", note: "Soft and full glam", filter: "Makeup" },
        ].map((category) => (
          <button key={category.name} className="hero-category-card" onClick={() => navigate("services", category.filter)}>
            <span className="hero-category-photo" aria-hidden="true" />
            <span className="hero-category-copy">
              <strong>{category.name}</strong>
              <small>{category.note}</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
    <section className="section services-preview"><SectionHead kicker="The Gailant edit" title="Services made for your moment." action="View all services" onAction={() => navigate("services")} /><div className="service-grid">{SERVICES.filter((x) => x.featured).map((service, index) => <ServiceCard key={service.id} service={service} index={index} book={book} isFav={favorites.includes(service.id)} toggleFav={toggleFavorite} />)}</div></section>
    <section className="statement"><p className="eyebrow light">Our philosophy</p><blockquote>“Every detail should feel <em>intentional.</em><br />Every client should leave feeling <em>royal.</em>”</blockquote><p>{BRAND.about}</p></section>
    <section className="section shop-preview"><SectionHead kicker="The beauty shelf" title="Your crown, cared for." action="Shop all" onAction={() => navigate("shop")} /><div className="product-grid">{PRODUCTS.map((product) => <ProductCard key={product.id} product={product} add={addToCart} isFav={favorites.includes(product.id)} toggleFav={toggleFavorite} />)}</div></section>
    <section className="experience"><div><p className="eyebrow">Beauty comes to you</p><h2>The salon experience,<br /><em>at your door.</em></h2></div><div><p>Professional beauty service, wherever you feel most at ease. Select home service when booking and we’ll take care of the rest.</p><button className="pill light" onClick={() => navigate("services")}>Book home service <ArrowRight size={17} /></button></div></section>

    {/* Client Notes: two-up desktop, single-card mobile carousel */}
    <section className="section testimonials">
      <div className="section-head testimonial-heading" style={{ alignItems: "center" }}>
        <div>
          <p className="eyebrow">Client notes</p>
          <h2>Loved in Accra.</h2>
        </div>
      </div>
      <div className="testimonial-carousel-shell">
        <button className="carousel-nav-btn carousel-nav-prev" onClick={prevTestimonials} aria-label="Previous testimonials">←</button>
        <div className="testimonial-flash-grid">
          {visibleTestimonials.map((item, idx) => (
            <article key={item.name + testimonialIndex} className="flash-card glass-reveal">
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
        <button className="carousel-nav-btn carousel-nav-next" onClick={nextTestimonials} aria-label="Next testimonials">→</button>
      </div>
    </section>

  </>;
}

function CrownMarkIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" /><circle cx="12" cy="17" r="1" /></svg>;
}

function SectionHead({ kicker, title, action, onAction }: { kicker: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-head"><div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>; }

function ServiceCard({ service, index, book, isFav, toggleFav }: { service: Service; index: number; book: (s: Service) => void; isFav?: boolean; toggleFav?: (id: string) => void }) {
  return <article className="service-card">
    <div className={`service-visual tone-${index + 1}`}>
      <span>0{index + 1}</span>
      <strong>{service.category.substring(0, 1)}</strong>
      <small>{service.category}</small>
      {toggleFav && (
        <button className={`product-action-glass ${isFav ? "active" : ""}`} onClick={() => toggleFav(service.id)} aria-label="Toggle wishlist" style={{ position: "absolute", top: 14, right: 14, zIndex: 5 }}>
          <Heart size={16} fill={isFav ? "currentColor" : "none"} />
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
  const [expanded, setExpanded] = useState(false);

  return <>
    <article className="product-card" onClick={() => setExpanded(true)} style={{ cursor: "pointer" }}>
      <div className={`product-visual ${product.tone}`}>
        <span className="product-shape">G</span>

        {/* Right vertical action stack (+ and heart) with identical glass style */}
        <div className="product-actions-stack" onClick={(e) => e.stopPropagation()}>
          {toggleFav && (
            <button
              className={`product-action-glass ${isFav ? "active" : ""}`}
              onClick={() => toggleFav(product.id)}
              aria-label="Toggle wishlist"
            >
              <Heart size={16} fill={isFav ? "currentColor" : "none"} />
            </button>
          )}
          <button
            className="product-action-glass"
            onClick={() => add(product)}
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-card-header-row">
          <span className="category">{product.category}</span>
          {product.badge && <span className="product-inline-badge">{product.badge}</span>}
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <strong>{money(product.price)}</strong>
      </div>
    </article>

    {/* Product Quick View Drawer */}
    {expanded && (
      <div className="overlay quickview-overlay" onMouseDown={() => setExpanded(false)}>
        <aside className="quickview-drawer" onMouseDown={e => e.stopPropagation()}>
          <button className="ref-close-btn quickview-close" onClick={() => setExpanded(false)} aria-label="Close panel"><X size={18} /></button>

          <div className={`quickview-image-container ${product.tone}`}>
            <span className="product-shape" aria-hidden="true">G</span>
            {product.badge && <span className="product-inline-badge quickview-badge">{product.badge}</span>}
          </div>

          <div className="quickview-body">
            <span className="quickview-category">{product.category}</span>
            <h2 className="quickview-title">{product.name}</h2>
            <p className="quickview-desc">{product.description}</p>

            <div className="quickview-price-block">
              <strong className="quickview-price">{money(product.price)}</strong>
              <small className="quickview-tax-note">Tax included • Studio shipping calculated at checkout</small>
            </div>

            <div className="quickview-actions">
              <button className="pill dark full" onClick={() => { add(product); setExpanded(false); }}>
                Add to Shopping Bag • {money(product.price)}
              </button>
              {toggleFav && (
                <button className="quickview-wishlist-link" onClick={() => toggleFav(product.id)}>
                  <Heart size={16} fill={isFav ? "currentColor" : "none"} /> {isFav ? "Saved in Wishlist" : "Save to Wishlist"}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    )}
  </>;
}

function ServicesPage({ book, favorites, toggleFavorite, initialFilter }: { book: (s: Service) => void; favorites: string[]; toggleFavorite: (id: string) => void; initialFilter?: string | null }) {
  const [filter, setFilter] = useState(initialFilter || "All");
  const categories = ["All", "Nails", "Hair", "Lashes", "Makeup", "Brows", "Locs", "Long Hair", "Short Hair", "Treatments"];
  const list = SERVICES.filter(s => filter === "All" || s.category === filter || s.subCategory === filter);

  return <><PageHero variant="services" number="01" kicker="Services menu" title="Curated for your" italic="crowning moment." text="Detailed gel sets, braids, silk press and customized lash applications in Accra." />
    <section className="section catalog">
      <div className="filter-row">
        {categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      {list.length === 0 ? (
        <div className="empty-state catalog-empty" style={{ padding: "60px 20px", textTransform: "none" }}>
          <Sparkles size={40} style={{ margin: "0 auto 16px", color: "#c89534", opacity: 0.8 }} />
          <h3 style={{ font: "500 28px var(--display)", margin: "8px 0" }}>No services found</h3>
          <p style={{ color: "#777", marginBottom: 20 }}>There are currently no services listed under &quot;{filter}&quot;.</p>
          <button className="pill dark" onClick={() => setFilter("All")}>View all services</button>
        </div>
      ) : (
        <div className="service-grid service-list">
          {list.map((service, index) => <ServiceCard key={service.id} service={service} index={index} book={book} isFav={favorites.includes(service.id)} toggleFav={toggleFavorite} />)}
        </div>
      )}
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

  return <><PageHero variant="shop" number="02" kicker="The shop" title="Beauty that keeps" italic="giving." text="Studio-approved wigs, tools and essentials, selected to make every day feel polished." />
    <section className="section catalog">
      <div className="shop-controls-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div className="filter-row" style={{ margin: 0 }}>
          {categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}
        </div>
        <div className="shop-search-inline">
          <label className="shop-search-label">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the collection…" />
          </label>
          <span className="shop-count-tag">{products.length} items</span>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="empty-state catalog-empty" style={{ padding: "60px 20px", textTransform: "none" }}>
          <ShoppingBag size={40} style={{ margin: "0 auto 16px", color: "#c89534", opacity: 0.8 }} />
          <h3 style={{ font: "500 28px var(--display)", margin: "8px 0" }}>No products found</h3>
          <p style={{ color: "#777", marginBottom: 20 }}>{query ? `No items matched "${query}".` : `No items in category "${filter}".`}</p>
          <button className="pill dark" onClick={() => { setFilter("All"); setQuery(""); }}>Clear filter</button>
        </div>
      ) : (
        <div className="product-grid shop-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} add={addToCart} isFav={favorites.includes(p.id)} toggleFav={toggleFavorite} />)}
        </div>
      )}
    </section>
  </>;
}

function WishlistPage({ favorites, addToCart, toggleFavorite, book }: { favorites: string[]; addToCart: (p: Product) => void; toggleFavorite: (id: string) => void; book: (s: Service) => void }) {
  const savedProducts = PRODUCTS.filter((p) => favorites.includes(p.id));
  const savedServices = SERVICES.filter((s) => favorites.includes(s.id));

  return <><PageHero variant="wishlist" number="02" kicker="Saved pieces" title="Your personal" italic="wishlist." text="Keep track of your favorite beauty pieces and studio essentials." />
    <section className="section catalog">
      {savedProducts.length === 0 && savedServices.length === 0 ? (
        <div className="empty-state" style={{ padding: "80px 20px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.6 }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
          <h3 style={{ font: "500 32px var(--display)", margin: "8px 0" }}>Your wishlist is empty</h3>
          <p style={{ color: "#777", marginBottom: 24 }}>Explore our shop collection and save your favorites.</p>
        </div>
      ) : (
        <>
          {savedServices.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ font: "500 24px var(--display)", marginBottom: 16 }}>Saved Services</h3>
              <div className="service-grid">
                {savedServices.map((s, i) => <ServiceCard key={s.id} service={s} index={i} book={book} isFav={true} toggleFav={toggleFavorite} />)}
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

function PageHero({ variant, number, kicker, title, italic, text }: { variant: "services" | "shop" | "wishlist" | "track" | "policies"; number: string; kicker: string; title: string; italic: string; text: string }) { return <section className={`page-hero page-hero-${variant}`}><span>{number}</span><div><p className="eyebrow">{kicker}</p><h1>{title}<br /><em>{italic}</em></h1></div><p>{text}</p></section>; }

function TrackPage() {
  const [activeTab, setActiveTab] = useState<"order" | "booking">("order");

  // Track Order state
  const [orderRef, setOrderRef] = useState("");
  const [orderCredential, setOrderCredential] = useState("");
  const [orderRecord, setOrderRecord] = useState<TrackingRecord | null>(null);
  const [orderSearched, setOrderSearched] = useState(false);
  const [orderTracking, setOrderTracking] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Track Booking state
  const [bookingRef, setBookingRef] = useState("");
  const [bookingCredential, setBookingCredential] = useState("");
  const [bookingRecord, setBookingRecord] = useState<TrackingRecord | null>(null);
  const [bookingSearched, setBookingSearched] = useState(false);
  const [bookingTracking, setBookingTracking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // Booking modification modal state
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [payingPaystack, setPayingPaystack] = useState(false);
  const [modifyMessage, setModifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = orderRef.trim().toUpperCase();
    setOrderTracking(true);
    setOrderError("");
    const live = await trackReference(cleanRef);
    const found = live.data || MOCK_TRACKING_DATABASE[cleanRef] || null;
    if (found && found.type !== "Order") {
      setOrderRecord(null);
      setOrderError(`Reference "${cleanRef}" is a Booking record. Switch to the "Track Booking" tab.`);
    } else {
      setOrderRecord(found as TrackingRecord | null);
    }
    setOrderTracking(false);
    setOrderSearched(true);
  };

  const handleTrackBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = bookingRef.trim().toUpperCase();
    setBookingTracking(true);
    setBookingError("");
    const live = await trackReference(cleanRef);
    const found = live.data || MOCK_TRACKING_DATABASE[cleanRef] || null;
    if (found && found.type !== "Booking") {
      setBookingRecord(null);
      setBookingError(`Reference "${cleanRef}" is an Order record. Switch to the "Track Order" tab.`);
    } else {
      setBookingRecord(found as TrackingRecord | null);
    }
    setBookingTracking(false);
    setBookingSearched(true);
  };

  const executePaystackModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingRecord) return;
    if (!newDate || !newTime) {
      setModifyMessage({ type: "error", text: "Please select both a new date and time slot." });
      return;
    }

    setPayingPaystack(true);
    setModifyMessage(null);

    const clientEmail = bookingRecord.email || "client@gailantbeauty.com";
    const modFeeGHS = 10;

    try {
      await openPaystackPayment({
        email: clientEmail,
        amountGHS: modFeeGHS,
        metadata: {
          bookingReference: bookingRecord.reference,
          newDate,
          newTime,
          type: "booking_modification"
        },
        onSuccess: async (paymentRef) => {
          // Update DB / store on payment success
          const updatePayload = {
            appointment_date: newDate,
            appointment_time: newTime,
            status: "rescheduled",
            rescheduled_at: new Date().toISOString(),
            modification_payment_ref: paymentRef
          };

          if (bookingRecord.reference) {
            await updateRecord("bookings", bookingRecord.reference, updatePayload);
            patchLocalRecord("bookings", bookingRecord.reference, updatePayload);
          }

          // Update local state
          setBookingRecord(prev => prev ? {
            ...prev,
            status: "Rescheduled",
            date: `${newDate} at ${newTime}`,
            appointmentDate: newDate,
            appointmentTime: newTime,
            adminNote: `Rescheduled to ${newDate} at ${newTime}. Modification fee (GH₵ 10) confirmed via Paystack (${paymentRef}).`
          } : null);

          setPayingPaystack(false);
          setModifyModalOpen(false);
          setModifyMessage({ type: "success", text: `Booking rescheduled successfully! Paystack reference: ${paymentRef}` });
        },
        onClose: () => {
          setPayingPaystack(false);
          setModifyMessage({ type: "error", text: "Payment was cancelled. Your appointment was not modified." });
        }
      });
    } catch (err: unknown) {
      setPayingPaystack(false);
      const msg = err instanceof Error ? err.message : "Paystack payment could not be initialized.";
      setModifyMessage({ type: "error", text: msg });
    }
  };

  // Order timeline stages (5 stages)
  const orderStages = [
    { key: "received", label: "Order Received", icon: Package },
    { key: "preparing", label: "Preparing", icon: RefreshCw },
    { key: "ready", label: "Ready for Delivery", icon: ShieldCheck },
    { key: "out", label: "Out for Delivery", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Check }
  ];

  // Booking timeline stages (4 stages)
  const bookingStages = [
    { key: "booked", label: "Booked", icon: Calendar },
    { key: "review", label: "Under Review", icon: Clock },
    { key: "confirmed", label: "Confirmed", icon: ShieldCheck },
    { key: "completed", label: "Completed", icon: Sparkles }
  ];

  return <><PageHero variant="track" number="03" kicker="Track with ease" title="Know what’s" italic="next." text="Real-time order delivery status and appointment schedule tracking." />
    <section className="track-section">
      <div className="track-card">
        <div className="track-subpage-tabs">
          <button
            className={`track-tab-btn ${activeTab === "order" ? "active" : ""}`}
            onClick={() => setActiveTab("order")}
          >
            <Package size={18} />
            <span>Track Order</span>
          </button>
          <button
            className={`track-tab-btn ${activeTab === "booking" ? "active" : ""}`}
            onClick={() => setActiveTab("booking")}
          >
            <Calendar size={18} />
            <span>Track Booking</span>
          </button>
        </div>

        {activeTab === "order" ? (
          <div className="track-subpage">
            <p className="track-intro">Enter your Order ID (e.g. <strong>GB-2026-002</strong>) and your phone or email to track your delivery status.</p>

            <form onSubmit={handleTrackOrder} className="track-form" style={{ marginTop: 24 }}>
              <div className="two-col" style={{ marginBottom: 16 }}>
                <label>ORDER ID / REFERENCE
                  <input required value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="e.g. GB-2026-002" />
                </label>
                <label>PHONE OR EMAIL
                  <input value={orderCredential} onChange={(e) => setOrderCredential(e.target.value)} placeholder="Phone number or email" />
                </label>
              </div>
              <button className="pill dark" type="submit" disabled={orderTracking} style={{ minHeight: 48, width: "100%" }}>
                {orderTracking ? "Searching…" : "Check Order Status"} <ArrowRight size={17} />
              </button>
            </form>

            {orderError && <p className="tracking-error" role="alert">{orderError}</p>}

            {orderSearched && orderRecord && (
              <div className="track-result order-result-view">
                {/* 1. Order Details block */}
                <div className="track-meta-header">
                  <div>
                    <span className="order-num-tag">ORDER #{orderRecord.reference}</span>
                    <h3>{orderRecord.item}</h3>
                    <p className="client-sub">{orderRecord.clientName} • Placed {orderRecord.orderPlacedDate || orderRecord.date}</p>
                  </div>
                  <div className="order-meta-stats">
                    <div><span>Status</span><strong className={`badge-status ${orderRecord.status.toLowerCase().replace(/\s+/g, '-')}`}>{orderRecord.status}</strong></div>
                    <div><span>Est. Delivery</span><strong>{orderRecord.orderDeliveredDate || "Pending dispatch"}</strong></div>
                    <div><span>Items</span><strong>{orderRecord.itemsList?.length || 1}</strong></div>
                    <button className="invoice-btn" onClick={() => alert("Invoice download starting...")} title="Download Invoice">
                      <Download size={14} /> Invoice
                    </button>
                  </div>
                </div>

                {/* 2. Order Tracking Timeline block (5 stages with icons) */}
                <div className="timeline-block">
                  <h4 className="timeline-title">Delivery Progress</h4>
                  <div className="icon-timeline-row">
                    {orderStages.map((stg, idx) => {
                      const currentStageIdx = orderRecord.orderStage ?? 0;
                      const isComplete = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      const StageIcon = stg.icon;
                      const timestampInfo = orderRecord.stageTimestamps?.[idx];

                      return (
                        <div key={stg.key} className={`icon-timeline-node ${isComplete ? "complete" : "pending"} ${isCurrent ? "current" : ""}`}>
                          <div className="node-icon-wrapper">
                            <StageIcon size={20} />
                            {isComplete && <span className="checkmark-badge"><Check size={10} /></span>}
                          </div>
                          <strong>{stg.label}</strong>
                          <small>
                            {isComplete ? (timestampInfo?.timestamp || "Confirmed") : (timestampInfo?.expected || "Expected")}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Items breakdown */}
                {orderRecord.itemsList && orderRecord.itemsList.length > 0 && (
                  <div className="order-items-block">
                    <h4>Order Summary</h4>
                    <div className="order-items-table">
                      {orderRecord.itemsList.map(item => (
                        <div key={item.id} className="order-item-row">
                          <div className="item-thumb"><Package size={20} /></div>
                          <div className="item-info">
                            <strong>{item.name}</strong>
                            <small>{item.size ? `Size: ${item.size} • ` : ""}ID: {item.productId}</small>
                          </div>
                          <span className="item-qty">Qty: {item.quantity}</span>
                          <strong className="item-price">{money(item.price * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Totals block */}
                <div className="order-totals-block">
                  <div className="totals-row"><span>Subtotal</span><span>{money(orderRecord.subtotal || 0)}</span></div>
                  <div className="totals-row"><span>Delivery Fee</span><span>{money(orderRecord.deliveryFee || 50)}</span></div>
                  {Boolean(orderRecord.discount) && <div className="totals-row discount"><span>Discount</span><span>-{money(orderRecord.discount || 0)}</span></div>}
                  <div className="totals-row grand-total"><span>Total</span><strong>{money(orderRecord.totalAmount || (orderRecord.subtotal || 0) + (orderRecord.deliveryFee || 50))}</strong></div>
                </div>

                {orderRecord.adminNote && (
                  <aside className="studio-note"><small>STUDIO UPDATE</small><p>{orderRecord.adminNote}</p></aside>
                )}
              </div>
            )}

            {orderSearched && !orderRecord && !orderError && (
              <div className="track-not-found">
                <Package size={36} />
                <h3>We couldn&apos;t find an order with those details</h3>
                <p>Please double-check your Order ID (e.g. <strong>GB-2026-002</strong>) and try again. If you continue to have trouble, our studio team is here on WhatsApp.</p>
                <button className="pill light" onClick={() => { setOrderSearched(false); setOrderRef(""); }}>Try another Order ID</button>
              </div>
            )}
          </div>
        ) : (
          <div className="track-subpage">
            <p className="track-intro">Enter your Booking Code (e.g. <strong>GB-2026-001</strong> or <strong>GB-2026-003</strong>) to check appointment status or request a schedule change.</p>

            <form onSubmit={handleTrackBooking} className="track-form" style={{ marginTop: 24 }}>
              <div className="two-col" style={{ marginBottom: 16 }}>
                <label>BOOKING CODE / REFERENCE
                  <input required value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="e.g. GB-2026-001" />
                </label>
                <label>PHONE OR EMAIL
                  <input value={bookingCredential} onChange={(e) => setBookingCredential(e.target.value)} placeholder="Phone number or email" />
                </label>
              </div>
              <button className="pill dark" type="submit" disabled={bookingTracking} style={{ minHeight: 48, width: "100%" }}>
                {bookingTracking ? "Searching…" : "Check Appointment"} <ArrowRight size={17} />
              </button>
            </form>

            {bookingError && <p className="tracking-error" role="alert">{bookingError}</p>}
            {modifyMessage && (
              <div className={`modify-toast ${modifyMessage.type}`} role="alert">
                <p>{modifyMessage.text}</p>
              </div>
            )}

            {bookingSearched && bookingRecord && (
              <div className="track-result booking-result-view">
                <div className="track-meta-header">
                  <div>
                    <span className="order-num-tag">BOOKING #{bookingRecord.reference}</span>
                    <h3>{bookingRecord.item}</h3>
                    <p className="client-sub">{bookingRecord.clientName} • {bookingRecord.date}</p>
                  </div>
                  <div className="order-meta-stats">
                    <div><span>Status</span><strong className={`badge-status ${bookingRecord.status.toLowerCase().replace(/\s+/g, '-')}`}>{bookingRecord.status}</strong></div>
                    <div><span>Service Price</span><strong>{money(bookingRecord.servicePrice || 0)}</strong></div>
                    <div><span>Deposit Paid</span><strong>{money(bookingRecord.depositPaid || 0)}</strong></div>
                    {(bookingRecord.status === "Confirmed" || bookingRecord.status === "Rescheduled" || bookingRecord.status === "Paid") && (
                      <button className="pill dark modify-btn" onClick={() => setModifyModalOpen(true)}>
                        Modify Booking (GH₵ 10)
                      </button>
                    )}
                  </div>
                </div>

                {/* Booking Timeline (4 stages) */}
                <div className="timeline-block">
                  <h4 className="timeline-title">Appointment Status</h4>
                  <div className="icon-timeline-row booking-timeline-row">
                    {bookingStages.map((stg, idx) => {
                      const currentStageIdx = bookingRecord.bookingStage ?? (bookingRecord.status === "Canceled" ? 1 : 2);
                      const isComplete = idx <= currentStageIdx && bookingRecord.status !== "Canceled";
                      const isCurrent = idx === currentStageIdx && bookingRecord.status !== "Canceled";
                      const StageIcon = stg.icon;
                      const timestampInfo = bookingRecord.stageTimestamps?.[idx];

                      return (
                        <div key={stg.key} className={`icon-timeline-node ${isComplete ? "complete" : "pending"} ${isCurrent ? "current" : ""}`}>
                          <div className="node-icon-wrapper">
                            <StageIcon size={20} />
                            {isComplete && <span className="checkmark-badge"><Check size={10} /></span>}
                          </div>
                          <strong>{stg.label}</strong>
                          <small>
                            {isComplete ? (timestampInfo?.timestamp || "Verified") : (timestampInfo?.expected || "Upcoming")}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {bookingRecord.adminNote && (
                  <aside className="studio-note"><small>STUDIO NOTE</small><p>{bookingRecord.adminNote}</p></aside>
                )}

                {bookingRecord.status === "Canceled" && (
                  <aside className="refund-note"><small>CANCELLATION & REFUND</small><p>{bookingRecord.refundNote || "Appointment canceled. Deposit status processed according to studio policy."}</p></aside>
                )}
              </div>
            )}

            {bookingSearched && !bookingRecord && !bookingError && (
              <div className="track-not-found">
                <Calendar size={36} />
                <h3>We couldn&apos;t find a booking with those details</h3>
                <p>Please check your Booking Code (e.g. <strong>GB-2026-001</strong>) and try again. For assistance, reach out via WhatsApp.</p>
                <button className="pill light" onClick={() => { setBookingSearched(false); setBookingRef(""); }}>Try another code</button>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="support-card-compact track-sidebar">
        <p className="eyebrow light">Customer Support</p>
        <h3>We’re one message away.</h3>
        <p>Need to modify your appointment or inquire about home delivery? Chat directly with our Abeka studio team.</p>

        <div className="support-meta-details">
          <span>🕐 Open Mon – Sat: 8:00 AM – 7:00 PM</span>
          <span>⚡ Average response time: under 15 mins</span>
        </div>

        <div className="support-card-actions">
          <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" className="pill light">
            Chat on WhatsApp <ArrowRight size={16} />
          </a>
          <a href={`tel:${BRAND.primaryPhone}`} className="pill light">Call {BRAND.primaryPhone}</a>
        </div>
      </aside>

      {/* Real Paystack Booking Modification Modal */}
      {modifyModalOpen && bookingRecord && (
        <div className="overlay" onMouseDown={() => !payingPaystack && setModifyModalOpen(false)}>
          <div className="flow-modal booking-modify-modal" onMouseDown={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !payingPaystack && setModifyModalOpen(false)} aria-label="Close"><X /></button>
            <div className="modal-intro">
              <p className="eyebrow">Modify Appointment</p>
              <h2>{bookingRecord.item}</h2>
              <p>Select your new preferred date and time. Paystack will collect the GH₵ 10 modification fee before confirming your update.</p>
            </div>

            <form onSubmit={executePaystackModification} className="flow-form">
              <div className="fee-disclosure-banner">
                <ShieldCheck size={20} />
                <div>
                  <strong>Modification Fee: GH₵ 10.00</strong>
                  <p>Charged via Paystack (MoMo or card). Your appointment will be updated immediately upon payment success.</p>
                </div>
              </div>

              <label>New Appointment Date
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </label>

              <label>New Time Slot
                <select required value={newTime} onChange={e => setNewTime(e.target.value)}>
                  <option value="">Select a time slot</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="01:30 PM">01:30 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="05:30 PM">05:30 PM</option>
                </select>
              </label>

              <button className="pill dark full" type="submit" disabled={payingPaystack}>
                {payingPaystack ? "Connecting to Paystack…" : "Pay GH₵ 10 & Confirm Modification"}
              </button>
              <small className="secure-note" style={{ textAlign: "center", display: "block", marginTop: 8 }}>
                Secured by Paystack • MoMo and cards accepted
              </small>
            </form>
          </div>
        </div>
      )}
    </section>
  </>;
}

function PoliciesPage() {
  const [reviews, setReviews] = useState(TESTIMONIALS);
  const [newReview, setNewReview] = useState({ name: "", service: "", quote: "", rating: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"policies" | "faqs" | "review">("policies");

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.name && newReview.quote) {
      setReviews([{ quote: newReview.quote, name: newReview.name, service: newReview.service || "Client Review", rating: newReview.rating || 5 }, ...reviews]);
      setSubmitted(true);
      setNewReview({ name: "", service: "", quote: "", rating: 5 });
    }
  };

  return <><PageHero variant="policies" number="04" kicker="Good to know" title="Policies, FAQs &" italic="reviews." text="Clear studio guidelines, frequently asked questions, and real client reviews." />
    <section className="policy-section">
      <div>
        {/* Navigation Tabs for Reorganized Layout */}
        <div className="track-subpage-tabs policy-tab-bar" style={{ marginBottom: 32 }}>
          <button
            className={`track-tab-btn ${activeTab === "policies" ? "active" : ""}`}
            onClick={() => setActiveTab("policies")}
          >
            <span>Studio Guidelines</span>
          </button>
          <button
            className={`track-tab-btn ${activeTab === "faqs" ? "active" : ""}`}
            onClick={() => setActiveTab("faqs")}
          >
            <span>FAQs</span>
          </button>
          <button
            className={`track-tab-btn ${activeTab === "review" ? "active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            <span>Leave a Review</span>
          </button>
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
            <div className="review-form-header">
              <Sparkles size={24} style={{ color: "#c89534" }} />
              <div>
                <h3>Leave a Review</h3>
                <p>Loved your Gailant experience? Share your thoughts with our studio team!</p>
              </div>
            </div>
            {submitted ? (
              <div className="review-success-banner">
                <Check size={20} />
                <p>Thank you for your feedback! Your review has been submitted and will appear after verification.</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="modern-review-form">
                <div className="rating-select-group">
                  <label className="field-label">Your Rating</label>
                  <div className="star-rating-buttons">
                    {[5, 4, 3, 2, 1].map((num) => (
                      <button
                        type="button"
                        key={num}
                        className={`star-select-btn ${newReview.rating === num ? "selected" : ""}`}
                        onClick={() => setNewReview({ ...newReview, rating: num })}
                      >
                        {"★".repeat(num)} <small>({num}/5)</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="two-col">
                  <div className="form-field">
                    <label className="field-label">Your Name *</label>
                    <input required placeholder="e.g. Abena Mansa" value={newReview.name} onChange={e => setNewReview({ ...newReview, name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Service Received</label>
                    <input placeholder="e.g. Knotless Braids, Soft Glam" value={newReview.service} onChange={e => setNewReview({ ...newReview, service: e.target.value })} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="field-label">Your Review *</label>
                  <textarea required placeholder="Describe your experience with our stylists, nails, or home delivery..." value={newReview.quote} onChange={e => setNewReview({ ...newReview, quote: e.target.value })} style={{ height: 100 }} />
                </div>
                <button className="pill dark" type="submit" style={{ width: "max-content" }}>Submit Review <ArrowRight size={16} /></button>
              </form>
            )}
          </div>
        )}
      </div>

      <aside className="support-card-compact">
        <p className="eyebrow light">Customer Support</p>
        <h2>Let’s make it easy.</h2>
        <p>Talk to our team before booking if you need extra time, accessibility support or a special arrangement.</p>

        <div className="support-meta-details">
          <span>🕐 Open Mon – Sat: 8:00 AM – 7:00 PM</span>
          <span>⚡ Average response time: under 15 mins</span>
        </div>

        <div className="support-card-actions">
          <a className="pill light" href={`tel:${BRAND.primaryPhone}`}>Call {BRAND.primaryPhone}</a>
          <a className="pill light" href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp Us</a>
        </div>
      </aside>
    </section>
  </>;
}

function CartDrawer({ cart, close, update, complete }: { cart: CartLine[]; close: () => void; update: (id: string, n: number) => void; complete: (message: string) => void }) {
  const [step, setStep] = useState<"bag" | "checkout">("bag");
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+233");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    unit: "",
    country: "Ghana",
    postalCode: "",
    notes: ""
  });

  const subtotal = cart.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const fullPhone = `${countryCode} ${form.phone.trim()}`;
    const fullAddress = `${form.street}${form.unit ? `, ${form.unit}` : ""}, ${form.city}, ${form.country}${form.postalCode ? ` (${form.postalCode})` : ""}`;

    const { error } = await insertRecord("orders", {
      name: form.name,
      phone: fullPhone,
      email: form.email,
      address: fullAddress,
      notes: form.notes,
      items: cart,
      total_amount: subtotal,
      status: "pending_payment"
    });

    setLoading(false);
    if (error) return alert(error);
    complete(`Thank you, ${form.name.split(" ")[0] || "queen"}. Your order request is confirmed.`);
  };

  return <div className="overlay" onMouseDown={close}>
    <aside className={`cart-drawer ref-cart-drawer ${step === "checkout" ? "checkout-step" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cart-title" onMouseDown={(e) => e.stopPropagation()}>
      <header className="ref-cart-header">
        <h2 id="cart-title">{step === "bag" ? "Your Bag" : "Delivery details"}</h2>
        <button className="ref-close-btn" onClick={close} aria-label="Close cart"><X size={20} /></button>
      </header>

      {step === "bag" ? <>
        <div className="cart-lines ref-cart-lines">
          {cart.length === 0 ? (
            <div className="empty-state cart-empty-centered">
              <ShoppingBag size={48} style={{ color: "#bd8427", margin: "0 auto 16px" }} />
              <h3>Your bag is empty</h3>
              <p>Discover studio-approved wigs, tools and beauty essentials.</p>
              <button className="pill light cart-shop-cta" onClick={() => { close(); navigate("shop"); }}>
                Explore Shop Catalog <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            cart.map((x) => (
              <div className="cart-line ref-cart-line" key={x.id}>
                <div className={`mini-product ${x.tone}`}>
                  <span>G</span>
                </div>
                <div className="ref-line-details">
                  <span className="ref-product-code">{x.id.toUpperCase()}</span>
                  <strong className="ref-product-name">{x.name}</strong>
                  <span className="ref-product-subtitle">{x.category} Collection</span>
                  <div className="ref-stepper-row">
                    <div className="quantity">
                      <button onClick={() => update(x.id, -1)} aria-label={`Remove one ${x.name}`}><Minus size={12} /></button>
                      <span>{x.quantity}</span>
                      <button onClick={() => update(x.id, 1)} aria-label={`Add one ${x.name}`}><Plus size={12} /></button>
                    </div>
                    <button className="ref-remove-link" onClick={() => update(x.id, -x.quantity)}>Remove</button>
                  </div>
                </div>
                <b className="ref-line-price">{money(x.price * x.quantity)}</b>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <footer className="ref-cart-footer">
            <div className="ref-summary-row">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <button className="pill dark full ref-primary-btn" onClick={() => setStep("checkout")}>
              Continue <ArrowRight size={17} />
            </button>
          </footer>
        )}
      </> : (
        <form className="cart-checkout-form ref-checkout-form" onSubmit={submit}>
          <div className="ref-form-fields">
            <label>Full Name *
              <input required value={form.name} onChange={e => change("name", e.target.value)} autoComplete="name" placeholder="Full name" />
            </label>

            <label>Phone Number *
              <div className="phone-country-input-group">
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="country-code-select">
                  <option value="+233">🇬🇭 +233</option>
                  <option value="+234">🇳🇬 +234</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+225">🇨🇮 +225</option>
                </select>
                <input required value={form.phone} onChange={e => change("phone", e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+233 XXXXXXXXX" />
              </div>
            </label>

            <label>Street Address *
              <input required value={form.street} onChange={e => change("street", e.target.value)} placeholder="Street address" />
            </label>

            <div className="two-col">
              <label>Town / City *
                <input required value={form.city} onChange={e => change("city", e.target.value)} placeholder="Accra" />
              </label>

              <label>Apartment, suite, unit <span>Optional</span>
                <input value={form.unit} onChange={e => change("unit", e.target.value)} placeholder="Apt / Unit" />
              </label>
            </div>

            <div className="two-col">
              <label>Country *
                <select value={form.country} onChange={e => change("country", e.target.value)}>
                  <option value="Ghana">Ghana</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                </select>
              </label>

              <label>Postal / ZIP Code <span>Optional</span>
                <input value={form.postalCode} onChange={e => change("postalCode", e.target.value)} placeholder="00233" />
              </label>
            </div>

            <label>Email Address <span>Optional</span>
              <input type="email" value={form.email} onChange={e => change("email", e.target.value)} autoComplete="email" placeholder="queen@example.com" />
            </label>

            <label>Order Notes <span>Optional</span>
              <textarea value={form.notes} onChange={e => change("notes", e.target.value)} placeholder="Landmarks or delivery instructions" />
            </label>
          </div>

          <div className="ref-payment-section">
            <p>Pay securely with Mobile Money or card via Paystack.</p>
            <span className="ref-payment-amount">Amount Due: <strong>{money(subtotal)}</strong></span>
          </div>

          <footer className="ref-checkout-footer">
            <div className="ref-footer-total-bar">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="ref-footer-buttons">
              <button type="button" className="pill light ref-back-btn" onClick={() => setStep("bag")}>
                ← Back
              </button>
              <button type="submit" className="pill dark ref-pay-btn" disabled={loading}>
                {loading ? "Connecting…" : "Pay with Paystack"}
              </button>
            </div>
          </footer>
        </form>
      )}
    </aside>
  </div>;
}

function FlowModal({ modal, close, complete }: { modal: NonNullable<Modal>; close: () => void; complete: (m: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [homeService, setHomeService] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", date: "", time: "", stylist: "", address: "", notes: "" });

  const service = modal.service;
  const total = (service?.price || 0) + (homeService ? BRAND.homeSurcharge : 0);
  const due = modal.kind === "booking" ? Math.ceil(total * BRAND.depositPercent / 100) : total;

  const change = (key: keyof typeof form, value: string) => setForm((x) => ({ ...x, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const table = modal.kind === "consultation" ? "consultation_requests" : "bookings";
    const payload = modal.kind === "consultation" ? { name: form.name, phone: form.phone, email: form.email, service_id: service?.id, service_name: service?.name, notes: form.notes, status: "new" } : { name: form.name, phone: form.phone, email: form.email, service_id: service?.id, service_name: service?.name, appointment_date: form.date, appointment_time: form.time, stylist_preference: form.stylist, home_service: homeService, address: form.address, notes: form.notes, total_amount: total, deposit_amount: due, status: "pending_payment" };
    const { error } = await insertRecord(table, payload);
    setLoading(false);
    if (error) return alert(error);
    complete(modal.kind === "consultation" ? "Consultation request received. We’ll call you shortly." : `Thank you, ${form.name.split(" ")[0] || "queen"}. Your request is confirmed.`);
  };

  return (
    <div className="flow-modal-fullpage" role="dialog" aria-modal="true" aria-labelledby="flow-modal-title">
      <div className="fullpage-bar">
        <button className="fullpage-close-btn" onClick={close}>
          <X size={18} />
          <span>CLOSE PAGE</span>
        </button>
        <span className="fullpage-brand-title">GAILANT BEAUTY • SERVICE BOOKING</span>
      </div>
      <div className="flow-modal flow-modal-inner" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-intro">
          <p className="eyebrow">{modal.kind === "consultation" ? "Let’s talk" : "Reserve your time"}</p>
          <h2 id="flow-modal-title">{service?.name}</h2>
          <p>{modal.kind === "consultation" ? "Tell us what you have in mind and our team will reach out with the best next step." : "A few details, then your beauty moment is secured."}</p>

          <div className="modal-highlights">
            <span>✧ Studio consultation & prep</span>
            <span>✧ Premium Ghana-imported products</span>
            <span>✧ Refreshments & studio WiFi</span>
          </div>

          <div className="modal-summary">
            <span>{service?.duration}</span>
            <strong>{modal.kind === "consultation" ? "No payment today" : `${money(due)} deposit`}</strong>
          </div>
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
                  <strong>Bring Gailant to me</strong>
                  <small>Home service from {money(BRAND.homeSurcharge)} within Accra</small>
                </span>
              </label>
              {homeService && <label>HOME ADDRESS<input required value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Your location in Accra" /></label>}
            </>
          )}

          <label>NOTES <span>OPTIONAL</span><textarea value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Anything we should know?" className="squared-textarea" /></label>
          <button className="pill dark full" disabled={loading}>{loading ? "Please wait…" : modal.kind === "consultation" ? "Send consultation request" : `Continue to Paystack • ${money(due)}`}</button>
          {modal.kind !== "consultation" && <small className="secure-note">Secure payment • Paystack • MoMo & cards accepted</small>}
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
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("Dashboard");

  if (!loggedIn) return (
    <section className="admin-login">
      <div>
        <div className="admin-brand" style={{ cursor: "default" }}>
          <span>Gailant</span><small>BEAUTY</small>
        </div>
        <div className="login-card">
          <p className="eyebrow">Staff access</p>
          <h1>Welcome back.</h1>
          <p>Enter your credentials to open the Gailant Beauty office.</p>
          <form onSubmit={async (e) => { e.preventDefault(); const result = await signInAdmin(username.trim().toLowerCase(), password); if (!result.error && !result.local) { setLoggedIn(true); setLoginError(""); } else setLoginError(result.error || "Supabase authentication is not configured."); }}>
            <label>USERNAME<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin username" /></label>
            <label>PASSWORD
              <div className="password-wrap">
                <input autoComplete="current-password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
                <button type="button" className="eye-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </label>
            {loginError && <p className="form-error">{loginError}</p>}
            <button className="pill dark large full">Enter dashboard <ArrowRight size={17} /></button>
          </form>
          <Link className="back-site" href="/">← Return to main website</Link>
        </div>
      </div>
      <aside><span>GB</span><p>THE GAILANT OFFICE</p></aside>
    </section>
  );

  const tabs = ["Dashboard", "Services", "Products", "Bookings", "Consultations", "Orders", "Reviews"];

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div className="wordmark" style={{ cursor: "default" }}>
          <span>GAILANT</span><small>BEAUTY</small>
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
            <p>GAILANT BEAUTY • ADMIN OFFICE</p>
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
      <a href={BRAND.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
      </a>
      <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></svg>
      </a>
    </div>
  </div><div><small>EXPLORE</small><button onClick={() => navigate("services")}>Services</button><button onClick={() => navigate("shop")}>Shop</button><button onClick={() => navigate("track")}>Track</button></div><div><small>VISIT & CONTACT</small><p>{BRAND.location}</p><a href={BRAND.mapsUrl} target="_blank" rel="noreferrer" className="footer-location-link"><MapPin size={13} /> Get Directions on Google Maps</a><a href={`tel:${BRAND.primaryPhone}`}>{BRAND.primaryPhone}</a><a href={`tel:${BRAND.secondaryPhone}`}>{BRAND.secondaryPhone}</a></div><div className="footer-hours"><small>OPENING HOURS</small><p><strong>Mon to Sat</strong><br />8:00am, 7:00pm</p><p><strong>Sunday</strong><br />12:00pm, 7:00pm</p></div></div><div className="footer-bottom"><span>© 2026 Gailant Beauty • {BRAND.rating}</span><button onClick={() => navigate("policies")}>Policies & terms</button><span>Beauty, crowned.</span></div></footer>;
}
