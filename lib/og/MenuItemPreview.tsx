/* eslint-disable @next/next/no-img-element -- Satori requires native images, not next/image. */
import { LOGO_BACKGROUND } from '@/lib/logoPresentation';
import { macroColorTokens } from '@/components/nutrition/macroColorTokens';
import { macroDisplayConfig, macroOrder, formatMacroDisplayNumber, formatProteinScoreDisplay } from '@/components/nutrition/macroDisplay';
import { tierStyles } from '@/components/menu-item-card/ProteinScorePill';
import { getProteinScoreTier } from '@/lib/nutrition';
import { fitOgText, ogProteinScore } from './restaurant';

// Resolve the product's literal Tailwind color tokens for Satori, which cannot
// load the application's CSS. No separate OG macro/score palette.
function tokenColor(token: string) {
  return token.match(/\[(#[\da-fA-F]+)\]/)?.[1] ??
    ({ 'text-slate-900': '#0f172a', 'text-white': '#ffffff' }[token] ?? '#111318');
}

/** Static, stacked version of MenuItemCardHeader + MenuItemMacroSummary.
 * Mirrors SurfaceCard large radius, p-5, gray image surface, and MacroStat card.
 * Interactive title scrolling, variant controls and cart actions are omitted.
 */
export default function MenuItemPreview({ name, nutrition, photo, brand }: {
  name: string; nutrition: Record<string, number>; photo?: string; brand?: string;
}) {
  const score = ogProteinScore(nutrition);
  const tier = score === undefined ? undefined : tierStyles[getProteinScoreTier(score)];
  const title = fitOgText(name, 66);
  return <div style={{ display: 'flex', flexDirection: 'column', width: 396, padding: 20, borderRadius: 24, border: '1px solid #0000001a', background: 'white', boxShadow: '0 2px 10px #0f172a0f' }}>
    <div style={{ display: 'flex', height: 190, borderRadius: 16, border: '1px solid #0000000f', background: '#efefef', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {photo ? <img src={photo} width={354} height={190} style={{ objectFit: 'contain', padding: 12 }} alt="" /> : brand ? <img src={brand} width={48} height={48} style={{ backgroundColor: LOGO_BACKGROUND }} alt="" /> : null}
    </div>
    <div style={{ display: 'flex', marginTop: 16, minHeight: 60, fontFamily: 'Unbounded', fontSize: title.length > 42 ? 20 : 24, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.6px', color: '#171717', overflowWrap: 'anywhere' }}>{title}</div>
    {tier && score !== undefined ? <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 12, marginBottom: 8, borderRadius: 999, padding: '4px 10px 4px 4px', background: tokenColor(tier.chip), fontSize: 12 }}>
      <div style={{ display: 'flex', width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: tokenColor(tier.iconWrap) }}><svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={tokenColor(tier.icon)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46L12.06 9.2A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.57A1 1 0 0 0 11 14z" /></svg></div>
      <span style={{ fontWeight: 700, color: tokenColor(tier.value) }}>{formatProteinScoreDisplay(score)}g protein</span><span style={{ color: tokenColor(tier.supporting) }}>/ 100 cal</span>
    </div> : null}
    <div style={{ display: 'flex', gap: 24, borderTop: '1px solid #0000000f', paddingTop: 12, marginTop: tier ? 0 : 12 }}>
      {macroOrder.map(key => <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: 22, fontWeight: 700, color: tokenColor(macroColorTokens[key].valueClassName) }}>{Number.isFinite(nutrition[key]) ? `${formatMacroDisplayNumber(nutrition[key])}${macroDisplayConfig[key].unit ?? ''}` : '—'}</span><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#64748b' }}>{macroDisplayConfig[key].label.toUpperCase()}</span></div>)}
    </div>
  </div>;
}
