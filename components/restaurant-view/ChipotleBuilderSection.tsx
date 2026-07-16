"use client";

import type { ComponentProps } from "react";
import type { ChipotleKidsMealId } from "@/lib/restaurantBuilders/chipotle";
import MenuSections from "../MenuSections";
import KidsMealSelector from "./KidsMealSelector";

type KidsMealOption = ComponentProps<typeof KidsMealSelector>["options"][number];
type MenuSectionsProps = ComponentProps<typeof MenuSections>;

export default function ChipotleBuilderSection({
    showKidsMealSelector = false,
    selectedKidsMeal,
    onSelectKidsMeal,
    kidsMealOptions,
    menuSectionsProps,
}: {
    showKidsMealSelector?: boolean;
    selectedKidsMeal: ChipotleKidsMealId;
    onSelectKidsMeal: (kidsMeal: ChipotleKidsMealId) => void;
    kidsMealOptions: KidsMealOption[];
    menuSectionsProps: MenuSectionsProps;
}) {
    return (
        <>
            {showKidsMealSelector ? (
                <KidsMealSelector
                    selectedKidsMeal={selectedKidsMeal}
                    onSelectKidsMeal={onSelectKidsMeal}
                    options={kidsMealOptions}
                />
            ) : null}
            <MenuSections {...menuSectionsProps} />
        </>
    );
}
