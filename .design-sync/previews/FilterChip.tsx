import { FilterChip } from 'macro-maxxer-ui';

export function States() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <FilterChip active>High protein</FilterChip>
      <FilterChip>Low carb</FilterChip>
      <FilterChip>Under 500 cal</FilterChip>
      <FilterChip disabled>Unavailable</FilterChip>
    </div>
  );
}
