import { ImageResponse } from 'next/og';
import { getAllRestaurants, getRestaurantData } from '@/lib/restaurants';
import { loadOgFonts, loadOgImage } from '@/lib/og/assets';
import { fitOgText, ogHeadline, selectOgFeatured } from '@/lib/og/restaurant';
import MenuItemPreview from '@/lib/og/MenuItemPreview';

export const alt = 'Restaurant nutrition and high-protein menu options on Macro Maxxer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';
export const revalidate = 86400;

export default async function RestaurantOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getAllRestaurants().find(restaurant => restaurant.id === id);
  if (!entry || entry.isComingSoon) return new Response('Not found', { status: 404 });
  const restaurant = await getRestaurantData(id);
  if (!restaurant) return new Response('Not found', { status: 404 });
  const featured = selectOgFeatured(restaurant);
  const [fonts, logo, brand, photo] = await Promise.all([
    loadOgFonts(), loadOgImage(restaurant.logo), loadOgImage('/logo.svg'), loadOgImage(featured?.image),
  ]);
  const headline = ogHeadline(restaurant);

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: 64, gap: 64, color: '#000000', fontFamily: 'Outfit', backgroundImage: 'linear-gradient(120deg, #ecfdf5, #d1fae5)' }}>
      <svg width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} viewBox="0 0 1200 630">{Array.from({ length: 55 * 29 }, (_, i) => <circle key={i} cx={(i % 55) * 22 + 1} cy={Math.floor(i / 55) * 22 + 1} r={1} fill="#047857" opacity={0.13} />)}</svg>
      <div style={{ display: 'flex', flexDirection: 'column', width: 612 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
        <div style={{ display: 'flex', flexShrink: 0, width: 52, height: 52, borderRadius: 999, background: 'white', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {logo ? <img src={logo} width={52} height={52} style={{ objectFit: 'contain', borderRadius: 999 }} alt="" /> : <span style={{ fontSize: 24, fontWeight: 700 }}>{restaurant.name.slice(0, 1)}</span>}
        </div>
        <span style={{ fontFamily: 'Unbounded', fontWeight: 700, fontSize: restaurant.name.length > 30 ? 22 : 28, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{fitOgText(restaurant.name, 60)}</span>
        </div>
        <div style={{ display: 'flex', fontFamily: 'Unbounded', fontWeight: 700, fontSize: headline.length > 75 ? 36 : 46, lineHeight: 1.22, letterSpacing: '-1px', overflowWrap: 'anywhere' }}>{headline}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 64 }}>
          {brand && <img src={brand} width={28} height={28} alt="" />}
          <span style={{ fontFamily: 'Unbounded', fontSize: 18, fontWeight: 700, color: '#171717' }}>Macro Maxxer</span>
        </div>
      </div>
      <MenuItemPreview name={featured?.item.name ?? 'Explore the menu'} nutrition={featured?.nutrition ?? {}} photo={photo} brand={brand} />
    </div>, { ...size, fonts },
  );
}
