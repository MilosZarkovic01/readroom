import { logoutAction } from "@/lib/actions";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          compact
            ? "rounded-full bg-cream px-3 py-2 text-sm font-medium text-espresso"
            : "w-full rounded-full border border-beige py-3 text-sm font-medium text-espresso"
        }
      >
        Log out
      </button>
    </form>
  );
}
