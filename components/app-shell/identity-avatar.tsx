"use client";
import { User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface IdentityAvatarProps {
  /** Actor service account email, as resolved from SENTINEL_SERVICE_ACCOUNT or config. */
  serviceAccount?: string;
  /** True when the app is serving fixture data. Dims the avatar + labels it. */
  mock?: boolean;
}

export function IdentityAvatar({ serviceAccount, mock }: IdentityAvatarProps) {
  const initials = serviceAccount ? deriveInitials(serviceAccount) : "—";
  const labelLine = mock ? "Mock mode" : serviceAccount ? "Running as" : "No service account configured";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Identity: ${serviceAccount ?? "none"}`}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
            "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
            "hover:ring-2 hover:ring-[var(--ring)] hover:ring-offset-2 hover:ring-offset-[var(--background)]",
            mock && "opacity-60",
          )}
        >
          {serviceAccount ? initials : <User className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <div className="label-meta mb-1 text-[10px]">{labelLine}</div>
        {serviceAccount ? (
          <div className="font-mono text-[11px] break-all">{serviceAccount}</div>
        ) : (
          <div className="text-[11px] text-[var(--muted-foreground)]">
            Set <span className="font-mono">service_account</span> in <span className="font-mono">config.yaml</span> or{" "}
            <span className="font-mono">SENTINEL_SERVICE_ACCOUNT</span> env.
          </div>
        )}
        {mock && (
          <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            SENTINEL_MOCK=1 — no Dataform API calls are being made.
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * `dataform-sentinel@…`  → `DS`
 * `data_pipeline@…`      → `DP`
 * `runner@example.com`   → `RU` (falls back to first two chars of local part)
 */
function deriveInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[-._]/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}
