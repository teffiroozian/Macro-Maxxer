"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Store } from "lucide-react";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import AppIconButton, { appIconButtonClassName } from "@/components/ui/AppIconButton";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

const GlobalNavContext = createContext<{
  mobileNavVisible: boolean;
  mobileNavHeight: number;
  setHideOnScroll: (enabled: boolean) => void;
} | null>(null);

export function useGlobalNav() {
  const context = useContext(GlobalNavContext);
  if (!context) throw new Error("useGlobalNav must be used within GlobalNav");
  return context;
}

// The root layout mounts this once. Restaurant controls only consume the
// measured mobile height/visibility; they never render another global nav.
export default function GlobalNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileVisibility, setMobileVisibility] = useState({ pathname, visible: true });
  const [mobileNavHeight, setMobileNavHeight] = useState(52);
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const previousScroll = useRef(0);
  const direction = useRef<"up" | "down" | null>(null);
  const distance = useRef(0);
  const isRestaurant = pathname.startsWith("/restaurant/");

  useEffect(() => {
    if (!hideOnScroll) return;
    previousScroll.current = window.scrollY;
    direction.current = null;
    distance.current = 0;
    const handleScroll = () => {
      const next = window.scrollY;
      const delta = next - previousScroll.current;
      if (next <= 12) {
        setMobileVisibility({ pathname, visible: true });
        distance.current = 0;
      } else if (delta !== 0) {
        const nextDirection = delta > 0 ? "down" : "up";
        if (direction.current !== nextDirection) {
          direction.current = nextDirection;
          distance.current = 0;
        }
        distance.current += Math.abs(delta);
        if (distance.current >= 12) {
          setMobileVisibility({ pathname, visible: nextDirection === "up" });
          distance.current = 0;
        }
      }
      previousScroll.current = next;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hideOnScroll, pathname]);

  const visible = !hideOnScroll || mobileVisibility.pathname !== pathname || mobileVisibility.visible;
  return (
    <GlobalNavContext.Provider value={{ mobileNavVisible: visible, mobileNavHeight, setHideOnScroll }}>
      {!IS_CAPACITOR_BUILD ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[var(--z-nav)] hidden lg:block" data-sticky-nav="true">
            <DesktopNav />
          </div>
          <GlobalMobileNav
            markStickyNav
            visible={visible}
            onHeightChange={setMobileNavHeight}
            middleSlot={
              <AppIconButton onClick={() => guardNavigation(() => router.push("/restaurants"))} variant="nav" size="nav" aria-label="Browse restaurants">
                <Store className="h-4 w-4" strokeWidth={2.4} />
              </AppIconButton>
            }
            cartSlot={<CartIconDropdown variant="sheet" buttonClassName={appIconButtonClassName({ variant: "navSlate", size: "nav", className: "relative shrink-0" })} />}
          />
        </>
      ) : null}
      {IS_CAPACITOR_BUILD || isRestaurant ? children : (
        <div className="pt-[var(--global-mobile-nav-height)] lg:pt-16" style={{ "--global-mobile-nav-height": `${mobileNavHeight}px` } as CSSProperties}>
          {children}
        </div>
      )}
    </GlobalNavContext.Provider>
  );
}
