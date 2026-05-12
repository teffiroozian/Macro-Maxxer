import type { CoreMacros } from "@/types/menu";

export type AddonRef = string;

export type CommonChange = {
  id: string;
  label: string;
  delta: CoreMacros;
  appliesTo?: {
    categories?: string[];
  };
};
