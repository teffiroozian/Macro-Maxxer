import { MacroBadge } from 'macro-maxxer-ui';

export function Macros() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <MacroBadge macroKey="calories" value={540} />
      <MacroBadge macroKey="protein" value={38} />
      <MacroBadge macroKey="carbs" value={52} />
      <MacroBadge macroKey="totalFat" value={19} />
    </div>
  );
}
