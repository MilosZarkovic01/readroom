import type { ReactNode } from "react";

export const authCardClass =
  "mx-auto w-full max-w-[430px] space-y-4 px-6 py-10 lg:rounded-[2rem] lg:border lg:border-beige lg:bg-ivory lg:px-10 lg:py-12 lg:shadow-[0_24px_80px_rgba(45,33,27,0.08)]";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px] lg:flex lg:min-h-screen lg:max-w-none lg:flex-col lg:items-center lg:justify-center lg:bg-transparent lg:px-6 lg:py-16 lg:shadow-none">
      {children}
    </div>
  );
}
