import Image from "next/image";

export default function NativeRestaurantLogo({ src, size }: { src: string; size: number }) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
      style={{ width: size, height: size }}
    >
      <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
