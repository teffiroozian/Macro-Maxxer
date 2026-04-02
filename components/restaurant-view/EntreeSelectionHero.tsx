import Image from "next/image";
import type { BuilderEntreeOption } from "@/types/menu";
import { cardVariants } from "@/lib/cardVariants";

type Props = {
  entreeOptions: Record<string, BuilderEntreeOption>;
  onSelectEntree: (entree: string) => void;
};

export default function EntreeSelectionHero({ entreeOptions, onSelectEntree }: Props) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-12">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Chipotle</p>
      <h2 className="text-center text-5xl font-bold tracking-tight text-slate-900">Choose your entrée</h2>
      <p className="mt-3 text-center text-lg text-slate-600">Start your build by selecting a base.</p>
      <div className="mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-3">
        {Object.entries(entreeOptions).map(([entreeKey, entree]) => (
          <button
            key={entreeKey}
            type="button"
            onClick={() => onSelectEntree(entreeKey)}
            className={`${cardVariants("interactive")} px-6 py-8 text-center text-2xl font-semibold text-slate-900`}
          >
            <Image
              src={entree.imageSrc}
              alt={entree.label}
              width={640}
              height={320}
              className="mb-4 h-32 w-full rounded-xl object-contain"
            />
            {entree.label}
          </button>
        ))}
      </div>
    </section>
  );
}
