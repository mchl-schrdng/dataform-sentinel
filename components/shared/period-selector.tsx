"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PeriodKey } from "@/lib/dataform/types";

const PERIODS: PeriodKey[] = ["1h", "24h", "7d", "30d", "90d"];

export interface PeriodSelectorProps {
  value: PeriodKey;
}

export function PeriodSelector({ value }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onChange = (v: string) => {
    if (!v) return;
    const next = new URLSearchParams(params.toString());
    next.set("period", v);
    router.push(`${pathname}?${next.toString()}`);
  };
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onChange}
      aria-label="Time period"
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem key={p} value={p}>
          {p}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
