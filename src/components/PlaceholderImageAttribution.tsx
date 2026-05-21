import React from "react";
import {
  getPlaceholderAttributionEntries,
  getPlaceholderImageAttributionUrl
} from "@/lib/placeholder-images";

const unsplashUrl = getPlaceholderImageAttributionUrl("https://unsplash.com");

export function PlaceholderImageAttribution() {
  const credits = getPlaceholderAttributionEntries();

  return (
    <footer className="border-t border-canopy-900/10 px-4 py-5 text-xs font-semibold text-ink/45 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1">
        <span>Photo credits:</span>
        <a
          className="font-bold text-ink/60 underline-offset-4 hover:text-canopy-700 hover:underline"
          href={unsplashUrl}
          rel="noreferrer"
          target="_blank"
        >
          Unsplash
        </a>
        <span aria-hidden>-</span>
        <span>
          placeholder imagery by{" "}
          {credits.map((credit, index) => (
            <span key={credit.url}>
              <a
                className="font-bold text-ink/60 underline-offset-4 hover:text-canopy-700 hover:underline"
                href={credit.url}
                rel="noreferrer"
                target="_blank"
              >
                {credit.name}
              </a>
              {index < credits.length - 1 ? ", " : "."}
            </span>
          ))}
        </span>
      </div>
    </footer>
  );
}
