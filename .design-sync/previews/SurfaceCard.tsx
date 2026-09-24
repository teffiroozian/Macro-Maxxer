import { SurfaceCard, SectionEyebrow, AppButton } from 'macro-maxxer-ui';

export function Default() {
  return (
    <SurfaceCard style={{ maxWidth: 320 }}>
      <SectionEyebrow>Chipotle</SectionEyebrow>
      <p style={{ marginTop: 6, fontSize: 15, fontWeight: 600 }}>Chicken Bowl</p>
      <p style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>540 cal · 38g protein</p>
      <div style={{ marginTop: 14 }}>
        <AppButton size="sm">Add to order</AppButton>
      </div>
    </SurfaceCard>
  );
}

export function Elevated() {
  return (
    <SurfaceCard padding="comfortable" radius="large" shadow="md" style={{ maxWidth: 320 }}>
      <p style={{ fontSize: 15, fontWeight: 600 }}>Elevated surface</p>
      <p style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>Comfortable padding, large radius, elev-2 shadow.</p>
    </SurfaceCard>
  );
}
