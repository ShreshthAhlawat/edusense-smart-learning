import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Normalises the LaTeX flavours Gemini tends to emit ( \( … \), \[ … \] )
 * into the $ / $$ delimiters remark-math understands, so equations render
 * properly instead of showing raw brackets and backslashes.
 */
function normalizeMath(src: string) {
  return src
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `\n\n$$${inner}$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${inner}$`);
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <article
      className={
        "prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 " +
        className
      }
    >
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(children ?? "")}
      </ReactMarkdown>
    </article>
  );
}

/** Inline math-aware renderer for short strings like quiz question text. */
export function MathText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={"[&_p]:m-0 [&_p]:inline " + className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(children ?? "")}
      </ReactMarkdown>
    </span>
  );
}
