import { ArrowRight } from "lucide-react";
import { skills } from "../data/content";

export function SkillsSection() {
  return (
    <section className="section skills-section" id="skills">
      <div className="section-heading">
        <div>
          <h2>Four skills. <span>Room to grow.</span></h2>
        </div>
        <p>Build your routine one module at a time, or bring everything together in a full mock.</p>
      </div>

      <div className="skills-grid">
        {skills.map(({ name, description, detail, icon: Icon, tone }) => (
          <a className="skill-card" href="#how-it-works" key={name}>
            <div className={`skill-icon ${tone}`}><Icon size={21} strokeWidth={1.9} aria-hidden="true" /></div>
            <h3>{name}</h3>
            <strong>{description}</strong>
            <p>{detail}</p>
            <span className="skill-link">Explore module <ArrowRight size={15} aria-hidden="true" /></span>
          </a>
        ))}
      </div>
    </section>
  );
}
