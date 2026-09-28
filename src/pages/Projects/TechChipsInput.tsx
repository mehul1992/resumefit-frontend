import { useState } from "react";

interface TechChipsInputProps {
  value: string[];
  onChange: (tech: string[]) => void;
  suggestions?: string[];
  disabled?: boolean;
}

// Free-text chip input (type + Enter/comma to add, × to remove) with an
// autocomplete strip below drawn from tech already used across the user's
// projects. The template's MultiSelect only toggles a fixed option list, so
// this extends its chip styling with the type-to-add interaction 2b needs.
export default function TechChipsInput({
  value,
  onChange,
  suggestions = [],
  disabled = false,
}: TechChipsInputProps) {
  const [draft, setDraft] = useState("");

  const addTech = (raw: string) => {
    const tech = raw.trim();
    if (!tech || value.some((t) => t.toLowerCase() === tech.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tech]);
    setDraft("");
  };

  const removeTech = (tech: string) => {
    onChange(value.filter((t) => t !== tech));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTech(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTech(value[value.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !value.some((t) => t.toLowerCase() === s.toLowerCase()) &&
      (draft === "" || s.toLowerCase().includes(draft.toLowerCase()))
  );

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-2 min-h-11 dark:border-gray-700 dark:bg-gray-900 ${
          disabled ? "opacity-50" : ""
        }`}
      >
        {value.map((tech) => (
          <span
            key={tech}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
          >
            {tech}
            <button
              type="button"
              onClick={() => removeTech(tech)}
              disabled={disabled}
              className="opacity-60 hover:opacity-100 disabled:cursor-not-allowed"
              aria-label={`Remove ${tech}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={value.length === 0 ? "type & press Enter…" : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none dark:text-white/90"
        />
      </div>
      {draft && filteredSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {filteredSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTech(s)}
              className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-gray-500 hover:border-brand-400 hover:text-brand-500 dark:border-gray-600 dark:text-gray-400"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
