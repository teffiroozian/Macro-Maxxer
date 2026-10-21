"use client";
import Image from "next/image";
import type { CartItem } from "@/types/cart";
import NativeCartItemCard from "./NativeCartItemCard";

export default function NativeCartRestaurantGroup({ name, logo, items, openId, onOpenChange, loadingEditItemId, onEdit, onUpdateQuantity }: {
  name: string; logo?: string; items: CartItem[]; openId: string | null; onOpenChange: (id: string | null) => void;
  loadingEditItemId: string | null; onEdit: (item: CartItem) => void; onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  return (
    <section className="mt-[34px]">
      <div className="mx-5 mb-3 flex items-center gap-2">
        <span className="relative size-[22px] shrink-0 overflow-hidden rounded-full bg-slate-50 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
          {logo ? <Image src={logo} alt="" fill sizes="22px" className="object-cover" /> : null}
        </span>
        <h2 className="text-base font-bold text-slate-900">{name}</h2>
      </div>
      <ul className="flex flex-col px-[18px]">
        {items.map((item) => (
          <NativeCartItemCard
            key={item.id} cartItem={item} open={openId === item.id}
            onOpenChange={(next) => onOpenChange(next ? item.id : null)}
            isEditLoading={loadingEditItemId === item.id}
            onEdit={() => onEdit(item)}
            onDelete={() => onUpdateQuantity(item.id, 0)}
            onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)}
            onDecrement={() => onUpdateQuantity(item.id, item.quantity - 1)}
          />
        ))}
      </ul>
    </section>
  );
}
