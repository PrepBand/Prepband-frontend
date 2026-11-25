import axe from "axe-core";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

/** Renders a screen inside a router at the given path. */
export function renderAt(ui: ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

/** axe-core WCAG 2.x A/AA checks (spec 12.1 "Accessibility"). jsdom can't
 * compute colours, so contrast is checked manually, not here. */
export async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}
