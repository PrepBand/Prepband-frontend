import { Target } from "lucide-react";

type DashboardHeroProps = {
  firstName: string;
  targetBand: number | null;
};

export function DashboardHero({ firstName, targetBand }: DashboardHeroProps) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="dashboard-hero-head">
      <div>
        <h1>
          {timeGreeting}, {firstName}!
        </h1>
        <p>One more session. One more step toward your target band.</p>
      </div>
      {targetBand != null && (
        <span className="target-pill">
          <Target size={14} aria-hidden="true" /> Target band {targetBand.toFixed(1)}
        </span>
      )}
    </div>
  );
}
