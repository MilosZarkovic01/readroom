import { AppToaster } from "@/components/AppToaster";
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
    <div className="min-h-full lg:flex lg:min-h-screen lg:justify-center lg:pl-60">
      <div className="phone-shell mx-auto flex min-h-full w-full max-w-[430px] flex-col lg:mx-4 lg:my-4 lg:min-h-[calc(100vh-2rem)] lg:w-auto lg:max-w-6xl lg:flex-1 lg:rounded-[1.75rem] xl:max-w-7xl">
        {topBar ? <AppTopBar /> : null}
        <div className="flex-1 px-5 pb-28 lg:px-8 lg:pb-12 xl:px-10">{children}</div>
      </div>
      <BottomNav />
      <AppToaster />
    </div>
  );
}
