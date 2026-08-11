/** Подсвечивает вхождения query в text (без учёта регистра). */
export function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return text;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'giu'));
  const needle = q.toLocaleLowerCase('ru');

  return (
    <>
      {parts.map((part, index) =>
        part.toLocaleLowerCase('ru') === needle ? (
          <mark key={index} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
