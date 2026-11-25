import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { HomeExploreSpot } from "@/lib/native/exploreSpots";

const SLOT = 128;
// Looping repeats the list and, once a swipe settles, jumps back to the middle
// copy. Enough copies that a single swipe can't reach the end.
const COPIES = 7;
const SETTLE_MS = 140;

export default function ExploreCarousel({ spots }: { spots: HomeExploreSpot[] }) {
  const track = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const count = spots.length;
  const loops = count >= 4; // fewer would show the same arch twice on screen
  const middle = loops ? Math.floor(COPIES / 2) : 0;
  const start = count > 2 ? 1 : 0;
  const [active, setActive] = useState(start);
  const slots = loops ? Array.from({ length: COPIES }, () => spots).flat() : spots;

  useEffect(() => {
    if (track.current) track.current.scrollLeft = (middle * count + start) * SLOT;
    return () => window.clearTimeout(settle.current);
  }, [middle, count, start]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const index = Math.min(slots.length - 1, Math.max(0, Math.round(el.scrollLeft / SLOT)));
    setActive(index % count);
    if (!loops) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const shift = (middle - Math.floor(Math.round(el.scrollLeft / SLOT) / count)) * count * SLOT;
      if (shift) el.scrollLeft += shift;
    }, SETTLE_MS);
  };

  return (
    <section className="mt-5">
      <h2 className="flex h-11 items-center px-0.5 text-xl font-bold text-slate-900">Explore something new</h2>
      {count ? (
        <div ref={track} onScroll={onScroll} className="native-home-arches flex items-end overflow-x-auto" role="group" aria-label="Explore by restaurant">
          {slots.map((spot, index) => {
            // Every copy of the active arch is tall, so the jump is invisible.
            const isActive = index % count === active;
            const isDuplicate = Math.floor(index / count) !== middle;
            return (
              <Link
                key={index}
                href={`/restaurant/${spot.id}`}
                aria-label={`Explore ${spot.name}`}
                aria-hidden={isDuplicate || undefined}
                tabIndex={isDuplicate ? -1 : undefined}
                className="relative flex h-[236px] w-32 shrink-0 snap-center flex-col justify-end focus-ring"
              >
                <span className={`native-home-arch relative mx-auto block ${isActive ? "h-[236px] w-[128px]" : "h-[176px] w-[112px]"}`}>
                  <RestaurantItemImage src={spot.image} alt="" imagePresentation={spot.imagePresentation} fallbackClassName="object-cover" containerClassName="absolute inset-x-0 bottom-6 top-0 overflow-hidden rounded-t-[64px] rounded-b-[20px] border border-black/8 bg-white" />
                  <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 rounded-full border-[3px] border-slate-50"><NativeRestaurantLogo src={spot.logo} size={isActive ? 44 : 36} /></span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
      <div className="mt-4 text-center">
        <Link href="/restaurants" className="inline-flex h-12 items-center rounded-full bg-accent-strong px-[22px] text-base font-bold text-white active:opacity-80 focus-ring">Explore restaurants</Link>
      </div>
    </section>
  );
}
