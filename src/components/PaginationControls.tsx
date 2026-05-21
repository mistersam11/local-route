import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE, pageRange } from "@/lib/pagination";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type PaginationControlsProps = {
  basePath: string;
  currentPage: number;
  totalItems: number;
  searchParams?: SearchParamsRecord;
  pageParam?: string;
  pageSize?: number;
  itemLabel?: string;
};

function appendSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined
) {
  if (value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (entry) params.append(key, entry);
    });
    return;
  }

  if (value) {
    params.set(key, value);
  }
}

function pageWindow(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);

  return Array.from({ length: end - start + 1 }, (_item, index) => start + index);
}

export function PaginationControls({
  basePath,
  currentPage,
  totalItems,
  searchParams = {},
  pageParam = "page",
  pageSize = PAGE_SIZE,
  itemLabel = "items"
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const range = pageRange({ page: safePage, pageSize, totalItems });

  function hrefFor(page: number) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
      if (key !== pageParam) {
        appendSearchParam(params, key, value);
      }
    }

    if (page > 1) {
      params.set(pageParam, String(page));
    }

    const query = params.toString();

    return query ? `${basePath}?${query}` : basePath;
  }

  const pageLinkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-black transition";
  const disabledClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-black text-ink/30";

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-lg border border-canopy-900/10 bg-white p-2 shadow-sm"
    >
      <p className="px-2 text-sm font-bold text-ink/55">
        {totalItems
          ? `${range.start}-${range.end} of ${totalItems} ${itemLabel}`
          : `0 ${itemLabel}`}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {safePage > 1 ? (
          <Link
            className={`${pageLinkClass} bg-canopy-50 text-canopy-700 hover:bg-canopy-100`}
            href={hrefFor(safePage - 1)}
          >
            <ChevronLeft size={16} aria-hidden />
            <span className="sr-only">Previous page</span>
          </Link>
        ) : (
          <span className={disabledClass}>
            <ChevronLeft size={16} aria-hidden />
          </span>
        )}

        {pageWindow(safePage, totalPages).map((page) =>
          page === safePage ? (
            <span
              aria-current="page"
              className={`${pageLinkClass} bg-ink text-white`}
              key={page}
            >
              {page}
            </span>
          ) : (
            <Link
              className={`${pageLinkClass} bg-canopy-50 text-canopy-700 hover:bg-canopy-100`}
              href={hrefFor(page)}
              key={page}
            >
              {page}
            </Link>
          )
        )}

        {safePage < totalPages ? (
          <Link
            className={`${pageLinkClass} bg-canopy-50 text-canopy-700 hover:bg-canopy-100`}
            href={hrefFor(safePage + 1)}
          >
            <ChevronRight size={16} aria-hidden />
            <span className="sr-only">Next page</span>
          </Link>
        ) : (
          <span className={disabledClass}>
            <ChevronRight size={16} aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
