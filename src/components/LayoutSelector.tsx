"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LayoutOption = {
  id: number;
  name: string;
  holeCount: number;
};

export function LayoutSelector({
  layouts,
  selectedLayoutId
}: {
  layouts: LayoutOption[];
  selectedLayoutId?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (layouts.length <= 1) {
    return null;
  }

  return (
    <label className="grid gap-2 rounded-lg border border-canopy-900/10 bg-white p-4 text-sm font-bold text-ink/65 shadow-sm">
      <span className="text-xs font-black uppercase text-clay-700">
        Course layout
      </span>
      <select
        className="h-12 rounded-lg border border-canopy-900/10 bg-[#fffdf7] px-3 text-base font-black text-ink outline-none transition focus:border-canopy-700"
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("layout", event.target.value);
          params.delete("holesPage");
          router.push(`${pathname}?${params.toString()}`);
        }}
        value={selectedLayoutId ? String(selectedLayoutId) : String(layouts[0]?.id)}
      >
        {layouts.map((layout) => (
          <option key={layout.id} value={layout.id}>
            {layout.name} ({layout.holeCount} holes)
          </option>
        ))}
      </select>
    </label>
  );
}
