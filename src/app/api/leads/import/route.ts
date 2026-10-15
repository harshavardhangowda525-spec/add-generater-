import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { parseImportCsv } from "@/lib/csv";
import { saveLead } from "@/lib/leads-store";

const MAX_BYTES = 10 * 1024 * 1024;

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach a CSV file.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "CSV is larger than 10 MB.");
  const country = String(form.get("country") || "India");
  const { leads, errors } = parseImportCsv(await file.text(), { country });
  let inserted = 0;
  let duplicates = 0;
  for (const l of leads) {
    const res = await saveLead({ ...l, userId: user.id }, null);
    if (res.outcome === "inserted") inserted++;
    else duplicates++;
  }
  return NextResponse.json({ rows: leads.length + errors.length, inserted, duplicates, errors: errors.slice(0, 50) });
});
