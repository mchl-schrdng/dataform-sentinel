import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <div className="label-meta">404</div>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          The page you requested does not exist or is no longer available.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
