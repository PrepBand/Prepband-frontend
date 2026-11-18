import { ChevronDown } from "lucide-react";
import { faqs } from "../data/content";

export function FAQSection() {
  return (
    <section className="section faq-section" id="faq">
      <div className="faq-intro">
        <h2>A few things<br />you might be wondering.</h2>
        <p>Clear answers, because preparation should feel straightforward.</p>
      </div>
      <div className="faq-list">
        {faqs.map(({ question, answer }) => (
          <details className="faq-item" key={question}>
            <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
