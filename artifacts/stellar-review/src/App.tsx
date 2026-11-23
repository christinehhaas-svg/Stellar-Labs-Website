import { useEffect, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import ReviewContent from '@/ReviewContent';
import { reviewPages } from '@/review-pages';
import { ProteinProductPage } from '@/pages/stellar/_shared/ProteinProductPage';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

function RouteContent() {
  const [location] = useLocation();
  const activePage = reviewPages.find((page) => page.path === location);

  useEffect(() => {
    const title = activePage
      ? `${activePage.label} | Stellar Labs`
      : 'Page not found | Stellar Labs';
    const description = activePage
      ? `Review the ${activePage.label} wording in this separate, review-only Stellar Labs website. No orders or checkout are available.`
      : 'This Stellar Labs review preview does not include that page. Return to the homepage to continue reviewing approved wording.';

    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
    for (const [attribute, key, content] of [
      ['property', 'og:title', title],
      ['property', 'og:description', description],
      ['name', 'twitter:title', title],
      ['name', 'twitter:description', description],
    ]) {
      document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.setAttribute('content', content);
    }
  }, [activePage]);

  return (
    <div className="review-app">
      <main className="review-stage" aria-label="Selected page preview">
        <div className="review-page-body">
          <ErrorBoundary resetKey={location}>
            <Switch>
              <Route path="/products/strawberry-electrolyte-powder" component={() => (
                <ProteinProductPage component="ElectrolyteStrawberry" />
              )} />
              {reviewPages.map((page) => (
                <Route
                  key={page.path}
                  path={page.path}
                  component={() => (
                    <div className="review-page-content" data-testid={`content-review-${page.id}`}>
                      <ReviewContent id={page.id} />
                    </div>
                  )}
                />
              ))}
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <section className="review-not-found" aria-labelledby="not-found-title">
      <p className="review-not-found-kicker">Review page unavailable</p>
      <h1 id="not-found-title">This page isn’t in the review.</h1>
      <p>The approved wording preview may have moved. Return to the homepage to continue.</p>
      <Link href="/" className="review-home-link" data-testid="link-not-found-home">
        <ArrowLeft aria-hidden="true" size={15} />
        Back to review homepage
      </Link>
    </section>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <RoutedErrorBoundary>
        <RouteContent />
      </RoutedErrorBoundary>
    </WouterRouter>
  );
}

export default App;
