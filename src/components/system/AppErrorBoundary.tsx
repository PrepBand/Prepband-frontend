import { Component, type ErrorInfo, type ReactNode } from "react";
import { StatusPage } from "../../pages/StatusPage";
import { reportClientEvent } from "../../lib/clientEvents";

/** A crash in any screen shows the 500 page instead of a blank screen
 * (spec 5.4). Saved work lives on the server, so a reload is safe. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
    reportClientEvent("render_error", `${error.name}: ${error.message}`, {
      stack: `${error.stack ?? ""}
--- component stack ---${info.componentStack ?? ""}`,
    });
  }

  render() {
    return this.state.failed ? <StatusPage kind="error" /> : this.props.children;
  }
}
