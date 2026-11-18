const steps = [
  ["01", "Choose your track", "Set your focus: Academic or General Training."],
  ["02", "Practice with purpose", "Work on one skill or follow a full mock."],
  ["03", "See your progress", "Review objective scores and thoughtful diagnostics."],
];

export function StepsSection() {
  return (
    <section className="steps-section">
      <div className="section steps-inner">
        <div className="steps-heading">
          <h2>Start where you are.</h2>
        </div>
        <div className="steps-grid">
          {steps.map(([number, title, description]) => (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
