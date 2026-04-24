"use client";
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5",
      className,
    )}
    {...props}
  />
));
ToggleGroup.displayName = "ToggleGroup";

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md px-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors",
      "hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
      "data-[state=on]:bg-[var(--secondary)] data-[state=on]:text-[var(--secondary-foreground)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
      className,
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = "ToggleGroupItem";
