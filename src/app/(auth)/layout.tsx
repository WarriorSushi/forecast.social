import Link from "next/link";

import { AuthTabs } from "@/components/auth/auth-tabs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-stylized text-title font-semibold leading-none tracking-tight hover:opacity-90 transition-opacity"
        >
          forecast<span className="text-accent">.</span>social
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-5 sm:px-8 pb-12 pt-4 sm:pt-0">
        <div className="w-full max-w-[420px]">
          <AuthTabs />
          {children}
        </div>
      </main>
    </div>
  );
}
