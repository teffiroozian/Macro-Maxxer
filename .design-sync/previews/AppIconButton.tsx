import { AppIconButton } from 'macro-maxxer-ui';
import { Search, ShoppingCart, X } from 'lucide-react';

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <AppIconButton aria-label="Search" variant="default">
        <Search size={18} />
      </AppIconButton>
      <AppIconButton aria-label="Close" variant="ghost">
        <X size={18} />
      </AppIconButton>
      <AppIconButton aria-label="Cart" variant="nav">
        <ShoppingCart size={18} />
      </AppIconButton>
      <AppIconButton aria-label="Dismiss" variant="muted">
        <X size={18} />
      </AppIconButton>
    </div>
  );
}

export function NavActive() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <AppIconButton aria-label="Menu" variant="nav" active>
        <ShoppingCart size={18} />
      </AppIconButton>
      <AppIconButton aria-label="Menu" variant="nav">
        <ShoppingCart size={18} />
      </AppIconButton>
    </div>
  );
}
