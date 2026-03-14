"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MultiSelectFilterProps {
  label: string;
  /** Distinct values for the suggestion dropdown. Ignored when freeText=true. */
  options?: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** When true, no suggestion dropdown is shown — user types free-form terms and presses Enter. */
  freeText?: boolean;
  /** Optional formatter for display labels (chips and dropdown). Raw value is kept for filtering. */
  formatLabel?: (value: string) => string;
}

export function MultiSelectFilter({ label, options = [], selected, onChange, freeText = false, formatLabel }: MultiSelectFilterProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = !freeText
    ? input.trim()
      ? options.filter(
          (o) => {
            if (selected.includes(o)) return false;
            const q = input.toLowerCase();
            const display = formatLabel ? formatLabel(o).toLowerCase() : o.toLowerCase();
            return o.toLowerCase().includes(q) || display.includes(q);
          }
        )
      : options.filter((o) => !selected.includes(o))
    : [];

  const shown = filtered.slice(0, 20);

  const addValue = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (selected.includes(trimmed)) return;
      onChange([...selected, trimmed]);
      setInput("");
    },
    [selected, onChange]
  );

  const removeValue = useCallback(
    (value: string) => {
      onChange(selected.filter((v) => v !== value));
    },
    [selected, onChange]
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex min-w-[160px] flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
        {selected.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-0.5 rounded-md bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-700"
          >
            {formatLabel ? formatLabel(v) : v}
            <button
              type="button"
              onClick={() => removeValue(v)}
              className="ml-0.5 text-gray-400 hover:text-gray-600"
              aria-label={`Remove ${formatLabel ? formatLabel(v) : v}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l6 6M8 2L2 8" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={selected.length === 0 ? label : ""}
          className="min-w-[80px] flex-1 bg-transparent py-0.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (!freeText) setOpen(true);
          }}
          onFocus={() => { if (!freeText) setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (freeText) {
                // Free-text mode: always add raw input
                addValue(input);
              } else if (shown.length > 0 && input.trim()) {
                // Suggestion mode: prefer top match
                addValue(shown[0]);
              } else if (input.trim()) {
                addValue(input);
              }
            }
            if (e.key === "Backspace" && !input && selected.length > 0) {
              removeValue(selected[selected.length - 1]);
            }
          }}
        />
      </div>
      {!freeText && open && shown.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {shown.map((opt) => (
            <button
              key={opt}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              onMouseDown={(e) => {
                e.preventDefault();
                addValue(opt);
              }}
            >
              {input.trim() ? highlightMatch(formatLabel ? formatLabel(opt) : opt, input) : (formatLabel ? formatLabel(opt) : opt)}
            </button>
          ))}
          {filtered.length > 20 && (
            <div className="px-3 py-1.5 text-xs text-gray-400">
              {filtered.length - 20} more — type to narrow
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Highlight the matching substring in an option */
function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-gray-900">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
