import { redirect } from "next/navigation";

type RestaurantCartRedirectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RestaurantCartRedirectPage({ params }: RestaurantCartRedirectPageProps) {
  const { id } = await params;

  redirect(`/cart?restaurant=${encodeURIComponent(id)}`);
}
