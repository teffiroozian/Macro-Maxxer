import { translateChipotleExtraction } from "./adapters/chipotle";
import { translateModExtraction } from "./adapters/mod-pizza";
import type { AdapterOutput } from "./contracts";
import type { ExtractionDisposition, ExtractionInput } from "./extraction-input";

type ExtractionAdapter = {
  adapterId: string;
  translate: (input: ExtractionInput, dispositions: ExtractionDisposition) => AdapterOutput | Promise<AdapterOutput>;
};

export const EXTRACTION_ADAPTERS: ReadonlyMap<string, ExtractionAdapter> = new Map<string, ExtractionAdapter>([
  ["mod", { adapterId: "mod-pizza", translate: translateModExtraction }],
  ["chipotle", { adapterId: "chipotle", translate: translateChipotleExtraction }],
]);
