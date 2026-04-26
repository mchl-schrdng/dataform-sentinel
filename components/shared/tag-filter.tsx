"use client";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Filter, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TagFilterProps {
  allTags: string[];
  selected: string[];
}

export function TagFilter({ allTags, selected }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (allTags.length === 0) return null;

  function pushSelection(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) params.delete("tags");
    else params.set("tags", next.join(","));
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function toggleTag(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    pushSelection(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium hover:bg-[var(--muted)]"
          >
            <Filter className="h-3.5 w-3.5" />
            {selected.length > 0
              ? `${selected.length} tag${selected.length === 1 ? "" : "s"}`
              : "Filter by tags"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          <DropdownMenuLabel>Tags</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allTags.map((tag) => {
            const checked = selected.includes(tag);
            return (
              <DropdownMenuPrimitive.CheckboxItem
                key={tag}
                checked={checked}
                onSelect={(e) => {
                  e.preventDefault();
                  toggleTag(tag);
                }}
                className="relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus:bg-[var(--muted)]"
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-[var(--border)]">
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className={tag === "untagged" ? "italic text-[var(--muted-foreground)]" : ""}>
                  {tag}
                </span>
              </DropdownMenuPrimitive.CheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleTag(tag)}
          disabled={isPending}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[color:var(--ring)]/30 bg-[color:var(--ring)]/5 px-2 text-[11px] font-medium text-[var(--foreground)] hover:bg-[color:var(--ring)]/10"
        >
          {tag}
          <X className="h-3 w-3 opacity-70" />
        </button>
      ))}
      {selected.length > 0 ? (
        <button
          type="button"
          onClick={() => pushSelection([])}
          disabled={isPending}
          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
