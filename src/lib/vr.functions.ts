import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({
  query: z.string().min(1).max(80),
});

const SENSITIVE_KEYWORDS = [
  "nsfw","nude","gore","weapon","gun","violence","blood","sex","porn","kill","death","dead body","corpse"
];

export const sketchfabSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data }) => {
    const url = new URL("https://api.sketchfab.com/v3/search");
    url.searchParams.set("type", "models");
    url.searchParams.set("q", data.query);
    url.searchParams.set("downloadable", "false");
    url.searchParams.set("count", "24");

    const headers: Record<string, string> = { Accept: "application/json" };
    const token = process.env.SKETCHFAB_API_TOKEN;
    if (token) headers.Authorization = `Token ${token}`;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const t = await res.text();
      console.error(`[Sketchfab ${res.status}]`, t.slice(0, 500));
      throw new Error(`Sketchfab search failed (${res.status})`);
    }
    const json: any = await res.json();

    const results = (json.results ?? [])
      .filter((m: any) => {
        const licSlug = m.license?.slug ?? "";
        // Keep only CC-family licenses (permit reuse with attribution)
        return /^cc-/.test(licSlug) || licSlug === "cc0";
      })
      .filter((m: any) => {
        const hay = ((m.name ?? "") + " " + (m.description ?? "") + " " + (m.tags ?? []).map((t: any) => t.name).join(" ")).toLowerCase();
        return !SENSITIVE_KEYWORDS.some((k) => hay.includes(k));
      })
      .map((m: any) => ({
        uid: m.uid,
        title: m.name,
        creator: m.user?.displayName ?? m.user?.username ?? "Unknown",
        license: m.license?.label ?? m.license?.slug ?? "Creative Commons",
        thumbnail: m.thumbnails?.images?.find((i: any) => i.width && i.width < 500)?.url ?? m.thumbnails?.images?.[0]?.url ?? null,
        viewerUrl: `https://sketchfab.com/models/${m.uid}/embed`,
      }));

    return { results };
  });
