import "./chrome.css";
import { ClinicalIcon } from "./Icons";

/** Shared application chrome. Clinical controls remain in the semantic screen. */
export function AppHeader({
  active,
  children,
  title,
}: {
  active: "browse" | "dashboard" | "live";
  children?: React.ReactNode;
  title?: string;
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
        {title ? (
          <h1 className="app-workspace-name">{title}</h1>
        ) : (
          <span className="app-workspace-name">
            {active === "browse"
              ? "UI browser"
              : active === "dashboard"
                ? "Recorded dashboard"
                : "Clinical workspace"}
          </span>
        )}
        <div
          className={`app-header-context${children ? " app-header-controls" : ""}`}
        >
          {children ?? "Synthetic training environment"}
        </div>
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
