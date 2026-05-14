import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-display text-title text-foreground">
          forecast<span className="text-accent">.</span>social
        </span>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 -mt-12">
        <p className="text-overline text-muted-foreground">
          phase 0 · foundation
        </p>
        <h1 className="font-display text-display-md text-foreground text-center max-w-2xl">
          Be right. Get famous.
        </h1>
        <p className="text-body-lg text-muted-foreground max-w-md text-center">
          Tokens, fonts, and theme switching wired. The real landing comes next.
        </p>
        <p className="font-mono text-body-sm text-muted-foreground">
          2,400 · top 1% · 47-day streak
        </p>
      </main>
    </div>
  );
}
