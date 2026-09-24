import { useState } from 'react';
import { InlineVariantSelect } from 'macro-maxxer-ui';

const options = [
  { id: 'regular', label: 'Regular' },
  { id: 'large', label: 'Large' },
  { id: 'extra-large', label: 'Extra Large' },
];

export function Default() {
  const [selected, setSelected] = useState('regular');
  return (
    <InlineVariantSelect
      options={options}
      selectedOptionId={selected}
      onSelectOption={setSelected}
      ariaLabel="Portion size"
    />
  );
}

export function Disabled() {
  return (
    <InlineVariantSelect
      options={options}
      selectedOptionId="large"
      onSelectOption={() => {}}
      ariaLabel="Portion size"
      disabled
    />
  );
}
