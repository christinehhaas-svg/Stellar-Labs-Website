import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import "../_group.css";

type Product = {
  name: string;
  category: string;
  descriptor: string;
  image: string;
  tone: string;
};

const products: Product[] = [
  {
    name: "100% Isolate Whey Protein Shake",
    category: "Whey protein",
    descriptor: "Vanilla · 2 lb",
    image: "isolate-vanilla.png",
    tone: "vanilla",
  },
  {
    name: "Chocolate Vegan Plant Protein Shake",
    category: "Vegan protein",
    descriptor: "Chocolate · 2 lb",
    image: "vegan-chocolate.png",
    tone: "chocolate",
  },
  {
    name: "Lemon Lime Electrolyte Powder",
    category: "Electrolytes",
    descriptor: "Lemon lime",
    image: "electrolyte-lemon.png",
    tone: "lemon",
  },
  {
    name: "Stellar Labs® Women's Ultra Multivitamin",
    category: "Vitamins",
    descriptor: "Women's Ultra Multivitamin",
    image: "womens-multi.png",
    tone: "digestive",
  },
];

const categories = [
  { name: "Whey protein", note: "Protein, made with digestion in mind", mark: "01", href: "#essentials" },
  { name: "Vegan protein", note: "Plant-based protein for your routine", mark: "02", href: "#essentials" },
  { name: "Vitamins", note: "Everyday support, thoughtfully considered", mark: "03", href: "#essentials" },
  { name: "Electrolytes", note: "A simple addition to your day", mark: "04", href: "#essentials" },
  { name: "Digestive support", note: "Small rituals for everyday comfort", mark: "05", href: "#essentials" },
  { name: "Nutrition ebooks", note: "Practical guides for the way you eat", mark: "06", href: "#guides" },
];

function BrandMark({ light = false }: { light?: boolean }) {
  return light ? (
    <img className="stellar-logo" src="/__mockup/images/stellar/logo.png" alt="Stellar Labs®" />
  ) : (
    <span className="stellar-wordmark">STELLAR LABS<span>®</span></span>
  );
}

function Header({ onExplore }: { onExplore: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  return (
    <header className="stellar-header">
      <a className="stellar-header-brand" href="#top" aria-label="Stellar Labs home" onClick={close}>
        <BrandMark />
      </a>
      <nav className={`stellar-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
        <a href="#essentials" onClick={close}>Shop nutrition</a>
        <a href="#approach" onClick={close}>Our approach</a>
        <a href="#reviews" onClick={close}>Reviews</a>
        <a href="#guides" onClick={close}>Nutrition guides</a>
        <button className="nav-mobile-cta" onClick={() => { close(); onExplore(); }}>Explore essentials <ArrowRight size={16} /></button>
      </nav>
      <button className="stellar-header-cta" onClick={onExplore}>Explore essentials <ArrowUpRight size={16} /></button>
      <button
        className="stellar-menu-toggle"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  );
}

function Hero() {
  return (
    <section className="stellar-hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> Nutrition for your next chapter</p>
        <h1>High protein.<br /><em>More human.</em></h1>
      </div>
      <div className="hero-support">
        <p className="hero-intro">Nutritionist-founded protein and everyday essentials, designed with digestion in mind.</p>
        <div className="hero-actions">
          <a className="button button-dark" href="#essentials">Explore protein & more <ArrowRight size={17} /></a>
          <a className="text-link hero-secondary" href="#approach">Why Stellar Labs <ArrowDown size={15} /></a>
        </div>
        <p className="hero-footnote">Low-lactose whey. No artificial colors or flavors.</p>
      </div>
    </section>
  );
}

function Principles() {
  const callouts = [
    "Made in a cGMP-compliant facility in the USA",
    "Certified gluten-free",
    "Easy to digest",
    "rBGH-Free Whey",
    "Non-GMO",
    "GLP-1 Friendly",
    "Easy-to-Digest Ingredients",
  ];
  return (
    <section className="stellar-principles" aria-label="Product callouts">
      <ul className="callouts-row" tabIndex={0} aria-label="Product callouts; scroll horizontally on narrow screens">
        {callouts.map((callout) => (
          <li className="callout" key={callout}>
            <Check size={16} aria-hidden="true" />
            <span>{callout}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductSection({ onSelect }: { onSelect: (product: Product) => void }) {
  return (
    <section className="stellar-products section-pad" id="essentials">
      <div className="section-heading">
        <div>
          <h2>Your daily <em>essentials.</em></h2>
        </div>
        <div className="section-heading-aside">
          <a className="text-link" href="#discover">Find your kind of nutrition <ArrowRight size={16} /></a>
        </div>
      </div>
      <div className="product-grid">
        {products.map((product, index) => (
          <article className={`product-card product-${product.tone}`} key={product.name}>
            <button className="product-image-button" onClick={() => onSelect(product)} aria-label={`Preview ${product.name}`}>
              <span className="product-number">0{index + 1}</span>
              <span className="product-category">{product.category}</span>
              <img src={`/__mockup/images/stellar/${product.image}`} alt={product.name} />
              <span className="product-image-arrow"><ArrowUpRight size={19} /></span>
            </button>
            <div className="product-info">
              <div>
                <h3>{product.name}</h3>
                <p>{product.descriptor}</p>
              </div>
              <button className="product-explore" onClick={() => onSelect(product)}>Explore <ArrowRight size={15} /></button>
            </div>
          </article>
        ))}
      </div>
      <div className="product-endnote"><span>Good things, chosen with care.</span><span>01 — 04</span></div>
    </section>
  );
}

function Approach() {
  return (
    <section className="stellar-approach" id="approach">
      <div className="approach-photo">
        <img src="/__mockup/images/stellar/hero.png" alt="A ready-to-enjoy Stellar Labs protein shake" />
        <div className="approach-image-tag">A daily routine, not a regimen.</div>
      </div>
      <div className="approach-copy">
        <p className="eyebrow light-eyebrow"><span className="eyebrow-dot" /> A more thoughtful formula</p>
        <h2>Nutrition for<br />the way life <em>is.</em></h2>
        <p className="approach-lede">Founded by a licensed nutritionist, Stellar Labs® supports today’s weight-loss approaches—including GLP-1 medications, surgery and high-protein diets—with nutrition made for smaller appetites and everyday routines.</p>
        <p>Our formulas are designed to help you get enough protein to protect lean muscle and support recovery, with easy-to-digest ingredients that fit a daily routine.</p>
        <a className="button button-light" href="#discover">Get to know our approach <ArrowRight size={16} /></a>
        <span className="approach-note">GROUNDED IN NUTRITIONIST-LED THINKING</span>
      </div>
      <span className="approach-side-label">OUR POINT OF VIEW — 02</span>
    </section>
  );
}

function Discovery() {
  return (
    <section className="stellar-discovery section-pad" id="discover">
      <div className="discovery-top">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> Find your way</p>
          <h2>Start where<br /><em>you are.</em></h2>
        </div>
        <p className="discovery-intro">A daily ritual looks different for everyone. Find the kind of support that feels right for you.</p>
      </div>
      <div className="discovery-list">
        {categories.map((category) => (
          <a className="discovery-row" key={category.name} href={category.href}>
            <span className="discovery-number">{category.mark}</span>
            <span className="discovery-title">{category.name}</span>
            <span className="discovery-note">{category.note}</span>
            <span className="discovery-arrow"><ArrowUpRight size={20} /></span>
          </a>
        ))}
      </div>
      <p className="discovery-foot">A little guidance goes a long way. Explore our <a href="#guides">nutrition guides <ArrowUpRight size={12} /></a>.</p>
    </section>
  );
}

function Reviews() {
  return (
    <section className="stellar-reviews section-pad" id="reviews">
      <div className="reviews-intro">
        <p className="eyebrow light-eyebrow"><span className="eyebrow-dot" /> Notes from the routine</p>
        <h2>Good things,<br /><em>said simply.</em></h2>
        <p>Words shared by customers on the Stellar Labs® store.</p>
      </div>
      <article className="review-quote">
        <span className="quote-mark">“</span>
        <div className="quote-stars" aria-label="5 out of 5 stars">★★★★★</div>
        <blockquote>This was recommended from my dietitian. And its the best. Blends up incredibly smooth, plus tastes delicious</blockquote>
        <p className="quote-source">CUSTOMER REVIEW · STELLAR LABS® STORE</p>
      </article>
      <article className="review-quote review-quote-secondary">
        <span className="quote-mark">“</span>
        <div className="quote-stars" aria-label="5 out of 5 stars">★★★★★</div>
        <h3>The BEST Protein Powder</h3>
        <blockquote>Tastes so good just mixed with almond milk. Last but definitely not least, it gives no tummy troubles.</blockquote>
        <p className="quote-source">CUSTOMER REVIEW · STELLAR LABS® STORE</p>
      </article>
      <span className="reviews-footnote">Individual experiences vary. Customer reviews reflect personal opinions.</span>
    </section>
  );
}

function Guides() {
  return (
    <section className="stellar-guides section-pad" id="guides">
      <div className="guide-art">
        <div className="guide-orbit orbit-one" />
        <div className="guide-orbit orbit-two" />
        <img className="guide-real-cover" src="/__mockup/images/stellar/heart-healthy-ebook.jpg" alt="E-Book: Heart-Healthy Eating System — original Stellar Labs® cover" loading="lazy" />
        <span className="guide-art-caption">A SMALL LIBRARY FOR BIGGER PICTURE THINKING</span>
      </div>
      <div className="guides-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> The reading room</p>
        <h2>Good guidance<br />for <em>real life.</em></h2>
        <p>Explore approachable nutrition ebooks for heart-healthy, vegan, vegetarian and gluten-free eating, plus The Low & Lean guide.</p>
        <a className="button button-dark" href="#discover">Browse nutrition guides <ArrowRight size={16} /></a>
        <a className="text-link guide-more" href="#discover">See all ways to explore <ArrowUpRight size={15} /></a>
      </div>
    </section>
  );
}

function Footer({ onExplore }: { onExplore: () => void }) {
  return (
    <footer className="stellar-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <BrandMark light />
          <p>High-protein nutrition,<br />made with digestion in mind.</p>
          <a href="#top" className="footer-top-link">BACK TO THE TOP <ArrowUpRight size={14} /></a>
        </div>
        <div className="footer-column">
          <h3>Explore nutrition</h3>
          <a href="#essentials">Whey protein</a>
          <a href="#essentials">Vegan protein</a>
          <a href="#discover">Vitamins</a>
          <a href="#essentials">Electrolytes</a>
          <a href="#essentials">Digestive support</a>
          <a href="#guides">Nutrition ebooks</a>
        </div>
        <div className="footer-column">
          <h3>Keep exploring</h3>
          <a href="#approach">Our approach</a>
          <a href="#reviews">Customer reviews</a>
          <a href="#discover">Women's Ultra Multivitamin</a>
          <a href="#discover">Men's Ultra Multivitamin</a>
          <a href="#discover">Magnesium Citrate</a>
          <a href="#discover">Probiotic</a>
        </div>
        <div className="footer-invite">
          <span className="footer-orbit">✳</span>
          <p>A more livable<br />kind of nutrition.</p>
          <button onClick={onExplore}>Find your essentials <ArrowRight size={16} /></button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© STELLAR LABS®</span>
        <span>GOOD NUTRITION, IN YOUR ORBIT.</span>
        <a href="#top">BACK TO THE TOP <ChevronDown size={12} className="footer-up-icon" /></a>
      </div>
    </footer>
  );
}

function ProductPreview({ product, onClose }: { product: Product | null; onClose: () => void }) {
  useEffect(() => {
    if (!product) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [product, onClose]);

  if (!product) return null;
  return (
    <div className="preview-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <button className="preview-close" onClick={onClose} aria-label="Close product preview"><X size={20} /></button>
        <div className={`preview-art product-${product.tone}`}>
          <img src={`/__mockup/images/stellar/${product.image}`} alt="" />
        </div>
        <div className="preview-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> {product.category}</p>
          <h2 id="preview-title">{product.name}</h2>
          <p>{product.descriptor}</p>
          <div className="preview-note"><span className="preview-note-dot" /> Concept preview — checkout is not connected</div>
          <button className="button button-dark preview-done" onClick={onClose}>Back to essentials <ArrowRight size={16} /></button>
        </div>
      </section>
    </div>
  );
}

export function Homepage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const scrollToEssentials = () => document.getElementById("essentials")?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="stellar-page">
      <div className="stellar-announcement"><span>HIGH-PROTEIN NUTRITION, MADE FOR REAL LIFE</span><a href="#approach">Meet a more thoughtful routine <ArrowRight size={13} /></a></div>
      <Header onExplore={scrollToEssentials} />
      <main>
        <Hero />
        <Principles />
        <ProductSection onSelect={setSelectedProduct} />
        <Approach />
        <Discovery />
        <Reviews />
        <Guides />
      </main>
      <Footer onExplore={scrollToEssentials} />
      <ProductPreview product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}