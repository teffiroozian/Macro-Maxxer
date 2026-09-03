import type { Metadata } from "next";
import { getRestaurantData } from "@/lib/restaurants";

type RestaurantLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RestaurantLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await getRestaurantData(id);

  if (!restaurant || restaurant.isComingSoon) {
    return {};
  }

  const title = `${restaurant.name} Nutrition & High-Protein Meals`;
  const supportsCustomization = Boolean(
    restaurant.hasBuildYourOwn ||
      restaurant.builderConfig ||
      restaurant.customizationRules,
  );
  const description = supportsCustomization
    ? `Explore ${restaurant.name} nutrition, compare calories and protein, customize meals, and find high-protein options that fit your macros.`
    : `Explore ${restaurant.name} nutrition, compare calories and protein, and find high-protein menu options that fit your macros.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/restaurant/${restaurant.id}`,
    },
  };
}

export default function RestaurantLayout({
  children,
  modal,
}: RestaurantLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
