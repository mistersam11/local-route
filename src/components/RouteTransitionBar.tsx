"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteTransitionBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(() => searchParams.toString(), [searchParams]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, search]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href);

      if (nextUrl.origin !== window.location.origin) return;

      const currentUrl = new URL(window.location.href);

      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search
      ) {
        return;
      }

      setLoading(true);
    }

    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      aria-hidden
      className={`fixed left-0 top-0 z-[100] h-1 bg-canopy-700 shadow-[0_0_18px_rgba(32,92,58,0.35)] transition-all ${
        loading ? "w-2/3 opacity-100 duration-500" : "w-0 opacity-0 duration-200"
      }`}
    />
  );
}
