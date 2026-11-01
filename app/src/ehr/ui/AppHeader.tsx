import "./chrome.css";
import { ClinicalIcon } from "./Icons";

/** Shared application chrome. Clinical controls remain in the semantic screen. */
export function AppHeader({
  active,
  children,
}: {
  active: "browse" | "dashboard" | "live";
  children?: React.ReactNode;
}) {
  return (
    <>
      <header className="app-header">
        <a className="app-wordmark" href="/">
          <ClinicalIcon name="pill" size={20} />
          <strong>
            VGI <span>HEALTH</span>
          </strong>
        </a>
        <span className="app-header-divider" />
        <span className="app-workspace-name">
          {active === "browse"
            ? "UI browser"
            : active === "dashboard"
              ? "Recorded dashboard"
              : "Clinical workspace"}
        </span>
        <span className="app-header-context">
          {children ?? "Synthetic training environment"}
        </span>
      </header>
      <nav className="app-activities" aria-label="Application activities">
        {(
          [
            ["live", "/", "Live EHR"],
            ["browse", "/browse", "UI browser"],
            ["dashboard", "/dashboard", "Dashboard"],
          ] as const
        ).map(([key, href, label]) =>
          key === active ? (
            <span key={key} aria-current="page">
              {label}
            </span>
          ) : (
            <a key={key} href={href}>
              {label}
            </a>
          ),
        )}
      </nav>
    </>
  );
}
