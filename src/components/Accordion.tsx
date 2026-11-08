import { useId, type ReactNode } from "react";

type Props = {
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  children: ReactNode;
  level?: 1 | 2;
};

/** Controlled accordion row: a button header and a collapsible body. */
export function Accordion({ open, onToggle, header, children, level = 1 }: Props) {
  const id = useId();
  return (
    <div className={`acc acc-${level} ${open ? "is-open" : ""}`}>
      <button type="button" className="acc-head" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className="acc-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span className="acc-title">{header}</span>
      </button>
      {open && (
        <div className="acc-body" id={id}>
          {children}
        </div>
      )}
    </div>
  );
}
