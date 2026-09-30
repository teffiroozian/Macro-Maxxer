import Link from "next/link";

import EmptyStateCard from "@/components/EmptyStateCard";
import { appButtonClassName } from "@/components/ui/AppButton";

export default function RestaurantNotFound() {
  return (
    <main className="mx-auto flex min-h-[var(--app-viewport-height)] w-full max-w-5xl flex-col justify-center px-4 pb-[max(3rem,var(--safe-area-bottom))] pt-[max(3rem,var(--safe-area-top))] sm:px-6">
      <EmptyStateCard
        title="Page not found"
        description="We couldn't find that restaurant or menu item. Return to the homepage and try again."
        action={
          <Link href="/" className={appButtonClassName({ variant: "ghost", size: "md" })}>
            ← Back to homepage
          </Link>
        }
      />
    </main>
  );
}
