export function CategoryChips({
  subjects,
  align = "left",
  compact = false,
}: {
  subjects: string[];
  align?: "left" | "center";
  compact?: boolean;
}) {
  if (!subjects.length) return null;

  return (
    <ul
      className={`${compact ? "mt-1" : "mt-3"} flex flex-wrap gap-1.5 ${align === "center" ? "justify-center" : ""}`}
    >
      {subjects.map((subject) => (
        <li
          key={subject}
          className="rounded-full bg-cream px-3 py-1 text-xs capitalize text-walnut"
        >
          {subject}
        </li>
      ))}
    </ul>
  );
}
