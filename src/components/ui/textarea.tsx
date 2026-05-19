import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea primitive matching Input chrome — same border, same focus
 * ring, same disabled/aria-invalid treatment. Replaces six places that
 * were hand-rolling the same className soup with subtle drift between
 * each.
 */
function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-base resize-none outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
