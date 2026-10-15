"use client";

import { useState } from "react";

type Result = { rows: number; inserted: number; duplicates: number; errors: { row: number; message: string }[] };

export function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/leads/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Import leads">
      <button className="absolute inset-0 bg-ink/70" aria-label="Close" onClick={onClose} />
      <div className="card relative w-full max-w-md p-5">
        <h2 className="text-lg font-bold text-white">Import leads from CSV</h2>
        <p className="mt-1 text-sm text-slate-400">
          Needs a <strong>Business Name</strong> column. Recognised: Phone, Category, Locality, City, Website, Instagram, Status, Notes, Follow-up Date.
          Rows matching an existing lead (by phone, or name + locality) are skipped as duplicates.
        </p>
        <input type="file" accept=".csv,text/csv" className="mt-4 block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {result && (
          <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
            <p><strong>{result.inserted}</strong> imported · <strong>{result.duplicates}</strong> duplicates skipped · {result.errors.length} rows with errors</p>
            {result.errors.length > 0 && (
              <ul className="mt-1 max-h-32 overflow-auto text-xs text-red-200">
                {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>{result ? "Close" : "Cancel"}</button>
          {!result && <button className="btn-primary" disabled={!file || busy} onClick={upload}>{busy ? "Importing…" : "Import"}</button>}
        </div>
      </div>
    </div>
  );
}
