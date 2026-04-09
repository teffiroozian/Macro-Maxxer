"use client";

import type { ReactNode } from "react";

export default function ItemModalHero({
  name,
  image,
  children,
}: {
  name: string;
  image?: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-8">
      <h1 className="text-center text-[32px] font-extrabold">{name}</h1>
      {image ? (
        <img
          className="max-h-[300px] w-[300px] rounded-[14px] bg-[#efefef] object-contain shadow-[0_0_5px_rgba(0,0,0,0.25)]"
          src={image}
          alt={name}
        />
      ) : null}
      {children}
    </div>
  );
}
