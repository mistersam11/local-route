export const PAGE_SIZE = 20;

export function normalizePage(value: unknown) {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function clampPage(page: number, totalItems: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return Math.min(Math.max(1, page), totalPages);
}

export function pageSkip(page: number, pageSize = PAGE_SIZE) {
  return (page - 1) * pageSize;
}

export function pageRange({
  page,
  pageSize = PAGE_SIZE,
  totalItems
}: {
  page: number;
  pageSize?: number;
  totalItems: number;
}) {
  if (totalItems === 0) {
    return { start: 0, end: 0 };
  }

  return {
    start: (page - 1) * pageSize + 1,
    end: Math.min(page * pageSize, totalItems)
  };
}
