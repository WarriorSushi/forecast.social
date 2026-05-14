import { AppMobileHeader } from "@/components/app/app-mobile-header";
import { AppRail } from "@/components/app/app-rail";
import { AppTabBar } from "@/components/app/app-tab-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppMobileHeader />
      <div className="mx-auto w-full max-w-[1120px] lg:flex lg:gap-10 lg:px-8">
        <AppRail />
        <main className="flex-1 min-w-0 px-5 sm:px-6 lg:px-0 pt-5 lg:pt-10 pb-24 lg:pb-16">
          {children}
        </main>
      </div>
      <AppTabBar />
    </div>
  );
}
