import Link from "next/link";
import { PageSizeSelector } from "@/components/PageSizeSelector";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  baseParams: URLSearchParams;
  basePath?: string;
}

export function Pagination({ page, pageSize, total, baseParams, basePath = "/" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const base = basePath.replace(/\?.*$/, "");

  function pageUrl(p: number) {
    const next = new URLSearchParams(baseParams);
    next.set("page", String(p));
    const q = next.toString();
    return q ? `${base}?${q}` : base;
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-500">
          Showing {from}–{to} of {total.toLocaleString()}
        </p>
        <PageSizeSelector currentPageSize={pageSize} basePath={basePath} />
      </div>
      <nav className="flex gap-1">
        {page > 1 && (
          <Link
            href={pageUrl(page - 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageUrl(page + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
