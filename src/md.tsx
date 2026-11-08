import { Fragment } from "react";

/**
 * Minimal inline markdown: **bold**, `code`, _italic_, [text](link).
 * Bold tags like **[placeholder]** render as tag chips.
 * Links point at repo files that don't exist here, so only the text is shown.
 */
export function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|_[^_\s][^_]*_)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          const inner = p.slice(2, -2);
          const tag = inner.match(/^\[(.+)\]$/);
          if (tag) return <span key={i} className={`tag tag-${tag[1].replace(/\s+/g, "-").toLowerCase()}`}>{tag[1]}</span>;
          return <strong key={i}>{inner}</strong>;
        }
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1, -1)}</code>;
        const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) return <span key={i} className="doc-ref" title={link[2]}>{link[1]}</span>;
        if (p.length > 2 && p.startsWith("_") && p.endsWith("_")) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
