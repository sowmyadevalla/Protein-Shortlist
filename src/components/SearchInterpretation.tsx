interface SearchInterpretationProps {
  recognized: string[];
  notes: string[];
}

export function SearchInterpretation({ recognized, notes }: SearchInterpretationProps) {
  if (recognized.length === 0 && notes.length === 0) return null;

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      {recognized.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recognized.map((item) => (
            <span key={item} className="ps-badge bg-lavender text-aubergine">
              {item}
            </span>
          ))}
        </div>
      )}
      {notes.map((note) => (
        <p key={note} className="text-xs leading-relaxed text-slate">{note}</p>
      ))}
    </div>
  );
}
