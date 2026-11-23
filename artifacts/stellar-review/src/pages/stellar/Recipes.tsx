import { createPortal } from "react-dom";
import styles from "./_recipes.css?inline";
import { recipes as recipesData } from "./_shared/recipe-copy";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";
import { useProductSnapshot } from "./_shared/useProductSnapshot";

type Recipe = (typeof recipesData)[number];

function initializeSnapshot(doc: Document, view: Window) {
  const header = doc.querySelector("#header-component");
  header?.querySelectorAll<HTMLAnchorElement>('a[href="#"]').forEach((link) => {
    link.href = "#supplements-app-mount";
  });
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  const setupLinks = () => initializeReviewLinks(doc);
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", setupLinks, { once: true });
  else setupLinks();
  if (!doc.getElementById("stellar-recipes-style")) {
    const style = doc.createElement("style");
    style.id = "stellar-recipes-style";
    style.textContent = styles;
    doc.head.append(style);
  }
  return () => {
    view.removeEventListener("resize", updateHeader);
    doc.removeEventListener("DOMContentLoaded", setupLinks);
  };
}

function recipeBodyHtml(recipe: Recipe) {
  return recipe.bodyHtml.replace(/\/__mockup\/images\/[^"'()\s]+/g, (path) => reviewAsset(path));
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const href = reviewUrl(`/recipes/${recipe.slug}`);
  return (
    <article className="sl-recipe-card" data-testid={`card-recipe-${recipe.slug}`}>
      <a
        className="sl-recipe-card__link"
        href={href}
        target="_parent"
        rel="noopener noreferrer"
        aria-label={`Read ${recipe.title}`}
        data-testid={`link-recipe-${recipe.slug}`}
      >
        <span className="sl-recipe-card__image-wrap">
          <img className="sl-recipe-card__image" src={reviewAsset(recipe.image)} alt="" loading="lazy" />
        </span>
        <h2 className="sl-recipe-card__title">{recipe.title}</h2>
        <span className="sl-recipe-card__action">View recipe <span aria-hidden="true">→</span></span>
      </a>
    </article>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  return (
    <article className="sl-recipe-article" data-testid={`article-recipe-${recipe.slug}`}>
      <a className="sl-recipe-back" href={reviewUrl("/recipes")} target="_parent" rel="noopener noreferrer" data-testid="link-back-recipes">
        <span aria-hidden="true">←</span> All recipes
      </a>
      <header className="sl-recipe-article__header">
        <p className="sl-recipes-eyebrow">Stellar Labs recipes</p>
        <h1>{recipe.title}</h1>
      </header>
      <img className="sl-recipe-cover" src={reviewAsset(recipe.image)} alt={recipe.title} />
      <div className="sl-recipe-body" dangerouslySetInnerHTML={{ __html: recipeBodyHtml(recipe) }} />
      <nav className="sl-recipe-links" aria-label="More about this recipe">
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-source-${recipe.slug}`}>View original recipe</a>
        {recipe.videoUrls.map((url, index) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-video-${recipe.slug}-${index + 1}`}>
            Watch recipe video
          </a>
        ))}
      </nav>
    </article>
  );
}

function RecipesContent({ slug }: { slug?: string }) {
  const selected = slug ? recipesData.find((recipe) => recipe.slug === slug) : undefined;
  if (slug && !selected) {
    return (
      <section className="sl-recipes-not-found" role="status" data-testid="status-recipe-not-found">
        <p className="sl-recipes-eyebrow">Recipe unavailable</p>
        <h1>We couldn’t find that recipe.</h1>
        <p>Browse the complete collection to find another recipe.</p>
        <a href={reviewUrl("/recipes")} target="_parent" rel="noopener noreferrer" data-testid="link-back-recipes">Back to all recipes</a>
      </section>
    );
  }
  if (selected) return <RecipeDetail recipe={selected} />;
  return (
    <section className="sl-recipes-collection" aria-labelledby="recipes-title">
      <header className="sl-recipes-intro">
        <p className="sl-recipes-eyebrow">A little inspiration for your everyday</p>
        <h1 id="recipes-title">Recipes</h1>
        <p>Simple ideas from the Stellar Labs kitchen, gathered in one place.</p>
      </header>
      <p className="sl-recipes-count">{recipesData.length} recipes</p>
      <div className="sl-recipes-grid">
        {recipesData.map((recipe) => <RecipeCard key={recipe.slug} recipe={recipe} />)}
      </div>
    </section>
  );
}

export function RecipesPage({ slug }: { slug?: string }) {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot);
  return (
    <main className="stellar-supplements-shell" aria-label="Stellar Labs recipes" style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={attempt}
        ref={iframeRef}
        title="Stellar Labs recipes"
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=recipes`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-supplements-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && (
        <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, overflow: "auto", padding: "42px 24px", background: "#fff", color: "#23201f" }}>
          <h1>Recipes</h1>
          <p>{status === "error" ? "The recipes preview could not load." : "Loading the recipes preview…"}</p>
          {status === "error" && <button type="button" onClick={retry}>Try again</button>}
        </section>
      )}
      {mount ? createPortal(<div className="sl-recipes"><RecipesContent slug={slug} /></div>, mount) : null}
    </main>
  );
}

export default RecipesPage;
