import light from "@/assets/edusense-logo-light.png.asset.json";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy } from "lucide-react";

/**
 * Print/download header used by every content-generation tool.
 * Shows the EduSense logo as a watermark-style brand mark and the
 * topic + class as the document heading. Hidden on screen.
 */
export function PrintDocHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="print-only print-doc-header">
      <img src={light.url} alt="EduSense" className="print-doc-logo" />
      <div className="print-doc-title">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

/** Faint logo watermark at the bottom of the printed page. */
export function PrintDocFooter() {
  return (
    <div className="print-only print-doc-footer">
      <img src={light.url} alt="EduSense" />
    </div>
  );
}

/** Copies the raw generated text (markdown stripped of heavy syntax). */
export function CopyTextButton({ text, label = "Copy text" }: { text: string; label?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText(text));
      toast.success("Text copied");
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <Button size="sm" variant="secondary" onClick={copy}>
      <Copy className="h-4 w-4 mr-1" /> {label}
    </Button>
  );
}

/** Light markdown cleanup so pasted text reads naturally. */
export function plainText(md: string) {
  return (md ?? "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(^|\s)\*(?!\s)(.*?)\*/g, "$1$2")
    .replace(/`{1,3}/g, "")
    .trim();
}
