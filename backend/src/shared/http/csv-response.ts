import type { Response } from "express";

/* CSV para el contador: se descargan con un link normal (la cookie viaja sola). */
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function sendCsvResponse(res: Response, filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  // BOM para que Excel abra los tildes bien
  res.send("﻿" + body);
}
