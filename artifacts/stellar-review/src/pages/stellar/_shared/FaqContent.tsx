import { heavyMetalsFaqQuestion, heavyMetalsFaqAnswer } from "./heavy-metals-testing";

export const faqQuestions = [
  heavyMetalsFaqQuestion,
  "What is the difference between whey protein isolate and whey protein blend?",
  "Is Stellar Labs vegan protein plant-based?",
  "How do I choose a protein powder flavor and size?",
  "How many servings are in each container?",
  "Where can I find a product’s ingredients and nutrition facts?",
  "How do I mix the Lemon Lime electrolyte powder?",
  "Which products are certified gluten-free?",
  "How do I choose supplements for my everyday needs?",
  "Where can I find recipes using Stellar Labs protein powders?",
  "Where can I find the nutrition and meal-planning e-books?",
] as const;

export function FaqContent() {
  return (
    <section className="sl-recipes-collection sl-faqs" aria-labelledby="faqs-title">
      <header className="sl-recipes-intro">
        <h1 id="faqs-title">FAQs</h1>
        <p>{faqQuestions.length} commonly asked questions about Stellar Labs.</p>
      </header>
      <ol className="sl-faq-questions">
        {faqQuestions.map(question => <li key={question} id={question === heavyMetalsFaqQuestion ? "heavy-metals" : undefined}>
          {question}
          {question === heavyMetalsFaqQuestion && <p style={{ fontSize: 16, lineHeight: 1.6, margin: "10px 0 0" }}>{heavyMetalsFaqAnswer}</p>}
        </li>)}
      </ol>
    </section>
  );
}
