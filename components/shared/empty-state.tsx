import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-[var(--muted-foreground)]" aria-hidden />
      <div>
        <div className="text-sm font-medium">{title}</div>
        {description && (
          <p className="mt-1 max-w-md text-xs text-[var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
