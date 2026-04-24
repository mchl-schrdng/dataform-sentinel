"use client";
import { ChevronDown, Database } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { TargetConfig } from "@/lib/config";

export function TargetSwitcher({ targets }: { targets: TargetConfig[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Database className="h-3.5 w-3.5" />
          All repos
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Repositories</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/" className="cursor-pointer">
            <span className="font-medium">All repositories</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {targets.map((t) => (
          <DropdownMenuItem asChild key={t.key}>
            <Link href={`/repos/${t.key}`} className="cursor-pointer">
              <div className="flex flex-col">
                <span className="font-medium">{t.display_name}</span>
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  {t.project_id} · {t.location}
                </span>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
