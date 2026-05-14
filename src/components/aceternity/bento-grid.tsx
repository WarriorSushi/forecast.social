import { cn } from "@/lib/utils";

/**
 * Adapted from Aceternity "Bento Grid", restyled to our design tokens
 * (DESIGN.md §6: bg-surface, border, hover lifts to border-strong). The
 * grid is 3 columns on md+, with cells able to span via grid utility
 * classes passed in via `className` on each item.
 */
export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 md:auto-rows-[14rem]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  footer,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-border-strong",
        className,
      )}
    >
      {header ? <div className="grow">{header}</div> : null}
      <div className="transition duration-200 group-hover/bento:translate-x-0.5">
        {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
        {title ? (
          <div className="font-display text-title text-foreground -tracking-[0.015em]">
            {title}
          </div>
        ) : null}
        {description ? (
          <div className="mt-2 text-body-sm text-muted-foreground leading-[1.55]">
            {description}
          </div>
        ) : null}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
};
