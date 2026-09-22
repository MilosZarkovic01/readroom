export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-24 w-24 text-4xl" : size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-beige font-sans text-espresso ${box}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
