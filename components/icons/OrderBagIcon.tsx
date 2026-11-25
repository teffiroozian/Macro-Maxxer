import { getOrderCountDigit } from "@/lib/native/navigation";

export default function OrderBagIcon({ count }: { count: number }) {
  const digit = getOrderCountDigit(count);
  return (
    <span className="relative block size-[23px]" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-full">
        <path d="M4.5 7.5h15l-1 13h-13l-1-13Z M9 7.5V6a3 3 0 0 1 6 0v1.5" />
      </svg>
      {digit ? (
        <span key={count} className={`native-order-count absolute inset-x-0 top-[9px] text-center font-heading font-bold leading-none ${count >= 10 ? "text-[8px]" : "text-[9.5px]"}`}>
          {digit}
        </span>
      ) : null}
    </span>
  );
}
