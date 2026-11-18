import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { useScrollToHash } from "../hooks/useScrollToHash";
import { Hero } from "../sections/Hero";
import { SkillsSection } from "../sections/SkillsSection";
import { MockSection } from "../sections/MockSection";
import { ApproachSection } from "../sections/ApproachSection";
import { StepsSection } from "../sections/StepsSection";
import { FAQSection } from "../sections/FAQSection";
import { FinalCTA } from "../sections/FinalCTA";

export function LandingPage() {
  useScrollToHash();

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Hero />
        <SkillsSection />
        <MockSection />
        <ApproachSection />
        <StepsSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
