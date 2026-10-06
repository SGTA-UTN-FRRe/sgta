import Link from "next/link";

import { cn } from "@/shared/utils";

export function TutorProfileLink({ name, className }: {
  name: string;
  className?: string;
}) {
  return (
    <Link
      aria-label={`Ver tutor ${name}`}
      className={cn("rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring", className)}
      href={`/admin/tutors?search=${encodeURIComponent(name)}`}
    >
      {name}
    </Link>
  );
}
