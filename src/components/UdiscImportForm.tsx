"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CheckSquare, Link2, Loader2, UploadCloud } from "lucide-react";

type ImportPreviewLayout = {
  key: string;
  name: string;
  holeCount: number;
  parTotal: number | null;
  distanceFeetTotal: number | null;
};

type ImportPreview = {
  token: string;
  courseName: string;
  sourceUrl: string;
  warnings: string[];
  layouts: ImportPreviewLayout[];
};

export function UdiscImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedLayoutKeys, setSelectedLayoutKeys] = useState<Set<string>>(
    new Set()
  );
  const [savingAction, setSavingAction] = useState<"preview" | "create" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const isReading = savingAction === "preview";
  const isCreating = savingAction === "create";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAction("preview");
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/courses/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url, preview: true })
        });

        const payload = (await response.json()) as {
          error?: string;
          preview?: ImportPreview;
        };

        if (!response.ok || !payload.preview) {
          setError(payload.error ?? "That UDisc link could not be read");
          return;
        }

        setPreview(payload.preview);
        setSelectedLayoutKeys(
          new Set(payload.preview.layouts.map((layout) => layout.key))
        );
      } finally {
        setSavingAction(null);
      }
    })();
  }

  function createDraft() {
    if (!preview) {
      return;
    }

    setSavingAction("create");
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/courses/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            previewToken: preview.token,
            selectedLayoutKeys: [...selectedLayoutKeys]
          })
        });

        const payload = (await response.json()) as {
          error?: string;
          redirectTo?: string;
        };

        if (!response.ok || !payload.redirectTo) {
          setError(payload.error ?? "That UDisc link could not be imported");
          return;
        }

        router.push(payload.redirectTo);
        router.refresh();
      } finally {
        setSavingAction(null);
      }
    })();
  }

  function toggleLayout(key: string) {
    setSelectedLayoutKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function formatDistance(feet: number | null) {
    if (!feet) {
      return null;
    }

    return `${feet.toLocaleString()} ft`;
  }

  const canCreate =
    preview !== null &&
    !savingAction &&
    ((preview?.layouts.length ?? 0) === 0 || selectedLayoutKeys.size > 0);

  return (
    <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-clay-700">
            Import from UDisc
          </p>
          <h2 className="mt-1 text-2xl font-black text-ink">
            Start with a public course link
          </h2>
        </div>
        <span className="rounded-full bg-water-100 px-3 py-1 text-xs font-black uppercase text-water-700">
          Draft only
        </span>
      </div>

      <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
        <label className="flex h-12 items-center gap-3 rounded-lg border border-canopy-900/10 bg-white px-3">
          <Link2 size={18} className="shrink-0 text-canopy-700" aria-hidden />
          <input
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-ink/40"
            onChange={(event) => {
              setUrl(event.target.value);
              setPreview(null);
              setSelectedLayoutKeys(new Set());
            }}
            placeholder="https://udisc.com/courses/..."
            type="url"
            value={url}
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
          disabled={Boolean(savingAction) || !url.trim()}
          type="submit"
        >
          {isReading ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <CheckSquare size={17} aria-hidden />
          )}
          {isReading ? "Reading" : "Find layouts"}
        </button>
      </form>

      {preview ? (
        <section className="grid gap-4 rounded-lg border border-canopy-900/10 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-clay-700">
                Import preview
              </p>
              <h3 className="mt-1 text-xl font-black text-ink">
                {preview.courseName}
              </h3>
              <p className="mt-1 break-all text-sm font-semibold text-ink/55">
                {preview.sourceUrl}
              </p>
            </div>
            {preview.layouts.length ? (
              <div className="flex gap-2">
                <button
                  className="rounded-full bg-canopy-50 px-3 py-2 text-xs font-black uppercase text-canopy-700 transition hover:bg-canopy-100"
                  onClick={() =>
                    setSelectedLayoutKeys(
                      new Set(preview.layouts.map((layout) => layout.key))
                    )
                  }
                  type="button"
                >
                  All
                </button>
                <button
                  className="rounded-full bg-clay-100 px-3 py-2 text-xs font-black uppercase text-clay-700 transition hover:bg-clay-300/45"
                  onClick={() => setSelectedLayoutKeys(new Set())}
                  type="button"
                >
                  None
                </button>
              </div>
            ) : null}
          </div>

          {preview.warnings.length ? (
            <div
              className="grid gap-1 rounded-lg border border-clay-300 bg-clay-100 p-3 text-sm font-bold text-clay-700"
              role="alert"
            >
              {preview.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {preview.layouts.length ? (
            <div className="grid gap-2">
              {preview.layouts.map((layout) => {
                const checked = selectedLayoutKeys.has(layout.key);
                const distance = formatDistance(layout.distanceFeetTotal);

                return (
                  <label
                    className={`grid cursor-pointer gap-2 rounded-lg border p-3 transition sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                      checked
                        ? "border-canopy-700 bg-canopy-50"
                        : "border-canopy-900/10 bg-[#fffdf7] hover:bg-canopy-50"
                    }`}
                    key={layout.key}
                  >
                    <input
                      checked={checked}
                      className="mt-1 accent-canopy-700 sm:mt-0"
                      onChange={() => toggleLayout(layout.key)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-black text-ink">
                        {layout.name}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-ink/55">
                        {layout.holeCount} holes
                        {layout.parTotal ? ` - Par ${layout.parTotal}` : ""}
                        {distance ? ` - ${distance}` : ""}
                      </span>
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-canopy-700 shadow-sm">
                      {checked ? "Included" : "Skipped"}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
              No complete layouts were found. Continue to create a manual draft.
            </p>
          )}

          <button
            className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
            disabled={!canCreate}
            onClick={createDraft}
            type="button"
          >
            {isCreating ? (
              <Loader2 size={17} className="animate-spin" aria-hidden />
            ) : (
              <UploadCloud size={17} aria-hidden />
            )}
            {isCreating ? "Creating draft" : "Continue to edit"}
          </button>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
