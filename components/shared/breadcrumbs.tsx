import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: ReactNode;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]", className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-[var(--foreground)]">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[var(--foreground)]" : undefined}>{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
