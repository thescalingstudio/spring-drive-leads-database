import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getLeadsForExport, getInteractionsForExport } from "@/lib/queries/export";
import type { ExportFilters } from "@/lib/queries/export";

const CONCURRENCY = 10;

async function sendRows(rows: unknown[], webhookUrl: string) {
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map((row) =>
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        })
      )
    );
  }
}

export async function POST(req: NextRequest) {
  const { source, filters, webhookUrl } = (await req.json()) as {
    source: "leads" | "interactions";
    filters: ExportFilters;
    webhookUrl: string;
  };

  const rows =
    source === "leads"
      ? await getLeadsForExport(filters)
      : await getInteractionsForExport(filters);

  // Schedule sending AFTER the response is returned — continues even if user navigates away
  after(async () => {
    await sendRows(rows, webhookUrl);
  });

  return NextResponse.json({ started: true, count: rows.length });
}
