import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { ItemImagePresentation } from "@/types/menu";

export const usableImage = (src?: string) => (src && src !== "none" ? src : undefined);

// A #f1f5f9 well that keeps its size when the image is missing.
export default function NativeImageWell({ src, presentation, className }: { src?: string; presentation?: ItemImagePresentation; className: string }) {
  return (
    <RestaurantItemImage
      src={usableImage(src)}
      alt=""
      imagePresentation={presentation}
      fallbackClassName="object-contain"
      containerClassName={`overflow-hidden bg-[#f1f5f9] ${className}`}
    />
  );
}
