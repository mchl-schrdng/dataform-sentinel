import Link from "next/link";
import { SentinelLogo } from "./logo";
import { TargetSwitcher } from "./target-switcher";
import { IdentityAvatar } from "./identity-avatar";
import { RefreshButton } from "@/components/shared/refresh-button";
import type { TargetConfig } from "@/lib/config";

export interface HeaderProps {
  targets: TargetConfig[];
  serviceAccount?: string;
  mock?: boolean;
}

export function Header({ targets, serviceAccount, mock }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <SentinelLogo />
          Dataform Sentinel
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <TargetSwitcher targets={targets} />
          <RefreshButton />
          <IdentityAvatar serviceAccount={serviceAccount} mock={mock} />
        </div>
      </div>
    </header>
  );
}
