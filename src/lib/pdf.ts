import { toast } from "sonner";

/**
 * Extracts text from EVERY page of a PDF (or reads a plain text file).
 * Runs in the browser via pdf.js so the whole document reaches the AI,
 * not just the first page.
 */
export async function extractFileText(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return await file.text();
  }

  const pdfjs: any = await import(/* @vite-ignore */ "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs" as any);
  pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;

  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    onProgress?.(p, pdf.numPages);
  }
  return out.trim();
}

export async function safeExtract(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  try {
    return await extractFileText(file, onProgress);
  } catch {
    toast.error("Could not read that file — try pasting the text instead.");
    return "";
  }
}
