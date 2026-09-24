import { CornerLabelBadge } from 'macro-maxxer-ui';

export function Tones() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <CornerLabelBadge tone="accent">New</CornerLabelBadge>
      <CornerLabelBadge tone="violet">Limited</CornerLabelBadge>
    </div>
  );
}
