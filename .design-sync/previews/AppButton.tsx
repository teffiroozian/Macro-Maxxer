import { AppButton } from 'macro-maxxer-ui';

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <AppButton variant="primary">Add to order</AppButton>
      <AppButton variant="secondary">Edit meal</AppButton>
      <AppButton variant="ghost">Cancel</AppButton>
      <AppButton variant="pill">View details</AppButton>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <AppButton variant="primary" size="sm">Small</AppButton>
      <AppButton variant="primary" size="md">Medium</AppButton>
      <AppButton variant="primary" size="lg">Large</AppButton>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <AppButton variant="primary" disabled>Add to order</AppButton>
      <AppButton variant="secondary" disabled>Edit meal</AppButton>
    </div>
  );
}
