import Image from "next/image";

export default function HomeHeader() {
  return (
    <header className="flex items-center gap-2.5">
      <Image src="/logo.svg" alt="" width={36} height={36} priority className="rounded-[9px]" />
      <h1 className="font-heading text-base font-bold tracking-[-0.015em]">Macro Maxxer</h1>
    </header>
  );
}
