"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import AppIconButton from "@/components/ui/AppIconButton";

// The hamburger trigger for GlobalMobileNav's `leadingButton` slot on pages
// that don't already own a drawer of their own (homepage, cart) — restaurant
// pages instead pass their own leadingButton (see StickyRestaurantBar), since
// theirs also opens restaurant-specific controls. This one just opens the
// same browse-restaurants MobileNavDrawer used everywhere else.
export default function GlobalMobileMenuButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AppIconButton
        onClick={() => setIsOpen(true)}
        variant="nav"
        active={isOpen}
        className="size-9"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" strokeWidth={2.5} />
      </AppIconButton>
      <MobileNavDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
