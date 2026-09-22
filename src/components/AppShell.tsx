import { BottomNav } from "@/components/BottomNav";
import { AppTopBar } from "@/components/AppTopBar";

export function AppShell({
  children,
  topBar = true,
}: {
  children: React.ReactNode;
  topBar?: boolean;
}) {
  return (
    <div className="phone-shell mx-auto flex min-h-full w-full max-w-[430px] flex-col">
      {topBar ? <AppTopBar /> : null}
      <div className="flex-1 px-5 pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
