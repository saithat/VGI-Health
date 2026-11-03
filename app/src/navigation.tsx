import { lazy, Suspense, useEffect, useState } from "react";

const Adt = lazy(() => import("./AdtApp").then((m) => ({ default: m.AdtApp })));
const Live = lazy(() =>
  import("./LiveApp").then((m) => ({ default: m.LiveApp })),
);
const Browse = lazy(() =>
  import("./browser/Browse").then((m) => ({ default: m.Browse })),
);
const Replay = lazy(() => import("./App").then((m) => ({ default: m.App })));
const Dashboard = lazy(() =>
  import("./dashboard/Dashboard").then((m) => ({ default: m.Dashboard })),
);

export function navigate(to: string) {
  const url = new URL(to, location.href);
  if (url.origin !== location.origin) {
    location.assign(to);
    return;
  }
  history.pushState(null, "", url);
  dispatchEvent(new PopStateEvent("popstate"));
}
/** One document per tab. Standard modified clicks and external links retain browser behavior. */
export function Router() {
  const [episode, setEpisode] = useState(0);
  const [route, setRoute] = useState(() => location.pathname + location.search);
  useEffect(() => {
    const update = () => {
      setRoute(location.pathname + location.search);
      setEpisode((n) => n + 1);
      window.scrollTo(0, 0);
    };
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        event.defaultPrevented ||
        event.button ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href);
      if (
        url.hash &&
        url.pathname === location.pathname &&
        url.search === location.search
      )
        return;
      if (
        url.origin !== location.origin ||
        !["/", "/browse", "/ehr", "/dashboard"].includes(
          url.pathname.replace(/\/$/, "") || "/",
        )
      )
        return;
      event.preventDefault();
      navigate(link.href);
    };
    addEventListener("popstate", update);
    document.addEventListener("click", click);
    return () => {
      removeEventListener("popstate", update);
      document.removeEventListener("click", click);
    };
  }, []);
  const url = new URL(route, location.origin);
  const path = url.pathname.replace(/\/$/, "");
  return (
    <Suspense fallback={<p role="status">Loading workspace…</p>}>
      {path === "/dashboard" ? (
        <Dashboard key={`${route}:${episode}`} />
      ) : path === "/browse" ? (
        <Browse key={`${route}:${episode}`} />
      ) : url.searchParams.get("workflow") === "adt" ? (
        <Adt key={`${route}:${episode}`} />
      ) : url.searchParams.get("mode") === "replay" ? (
        <Replay key={`${route}:${episode}`} />
      ) : (
        <Live key={`${route}:${episode}`} />
      )}
    </Suspense>
  );
}
