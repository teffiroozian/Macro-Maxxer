export type ChipotleHomepageRecordRef = {
  id: string;
  // Temporary read fallback while the old Chipotle dataset remains loaded.
  // Generated IDs above are canonical and are the only IDs retained after
  // the final data-source switch.
  legacyRuntimeId?: string;
};

export const CHIPOTLE_HOMEPAGE_EDITORIAL = {
  previewItem: {
    id: "chipotle-meal-6ba21999-f6b8-4a83-803a-bf68ef319c5e",
    legacyRuntimeId: "high-protein-high-fiber-bowl",
  },
  buildItems: [
    {
      item: {
        id: "chipotle-meal-6ba21999-f6b8-4a83-803a-bf68ef319c5e",
        legacyRuntimeId: "high-protein-high-fiber-bowl",
      },
      addOns: [
        { id: "chipotle-cmg-1001", legacyRuntimeId: "guacamole" },
        { id: "chipotle-cmg-1029", legacyRuntimeId: "queso-blanco" },
      ],
    },
    {
      item: {
        id: "chipotle-meal-be88e387-62ed-4271-877c-7216b6485387",
        legacyRuntimeId: "high-protein-low-calorie-bowl",
      },
      addOns: [
        {
          id: "chipotle-protein-chicken",
          legacyRuntimeId: "chicken",
        },
        { id: "chipotle-cmg-5101", legacyRuntimeId: "fajita-veggies" },
      ],
    },
  ],
  reviewItems: [
    {
      item: {
        id: "chipotle-meal-6ba21999-f6b8-4a83-803a-bf68ef319c5e",
        legacyRuntimeId: "high-protein-high-fiber-bowl",
      },
      quantity: 1,
    },
    {
      item: {
        id: "chipotle-cmg-1125",
        legacyRuntimeId: "side-of-chicken-high-protein",
      },
      quantity: 1,
    },
  ],
} as const;
