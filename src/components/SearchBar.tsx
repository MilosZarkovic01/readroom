import { IconSearch } from "@/components/Icons";

export function SearchBar({
  defaultQuery = "",
  field = "all",
}: {
  defaultQuery?: string;
  field?: string;
}) {
  return (
    <form action="/search" className="relative flex-1">
      <IconSearch className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-warm-gray" />
      <input
        id="q"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search books or authors..."
        className="w-full rounded-full border border-beige bg-ivory py-3 pr-4 pl-11 text-sm outline-none placeholder:text-warm-gray"
      />
      <input type="hidden" name="field" value={field} />
    </form>
  );
}
