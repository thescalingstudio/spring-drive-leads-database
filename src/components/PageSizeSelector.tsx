"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500] as const;

interface PageSizeSelectorProps {
  currentPageSize: number;
  basePath: string;
}

export function PageSizeSelector({ currentPageSize, basePath }: PageSizeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: number) {
    const next = new URLSearchParams(searchParams);
    next.set("pageSize", String(value));
    next.set("page", "1");
    const base = basePath.replace(/\?.*$/, "");
    router.push(`${base}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="page-size" className="text-sm text-gray-500">
        Per page
      </label>
      <select
        id="page-size"
        value={currentPageSize}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
