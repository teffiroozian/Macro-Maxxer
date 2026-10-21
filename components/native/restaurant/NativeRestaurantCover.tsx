import Image from "next/image";
import { COVER_HEIGHT } from "./useCoverScrolled";

export default function NativeRestaurantCover({ name, logo, cover, itemCount, updatedLabel }: {
  name: string;
  logo: string;
  cover?: string;
  itemCount: number;
  updatedLabel?: string;
}) {
  return (
    <div className="relative w-full overflow-hidden bg-slate-900" style={{ height: COVER_HEIGHT }}>
      {cover ? <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(15,23,42,.5), rgba(15,23,42,0) 32%, rgba(15,23,42,0) 42%, rgba(15,23,42,.84))" }}
      />
      <div className="absolute inset-x-5 bottom-[18px] flex items-end gap-3">
        <span className="relative size-[60px] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white">
          <Image src={logo} alt="" fill sizes="60px" className="object-cover" />
        </span>
        <div className="flex min-w-0 flex-col gap-[5px] pb-0.5">
          <h1 className="font-heading text-2xl font-bold leading-[1.15] tracking-[-0.02em] text-white">{name}</h1>
          <p className="text-[13px] font-medium text-slate-200">{itemCount} menu items{updatedLabel ? ` · Updated ${updatedLabel}` : ""}</p>
        </div>
      </div>
    </div>
  );
}
