import { useState } from 'react';
import { SegmentedControl } from 'macro-maxxer-ui';
import { Truck, Store } from 'lucide-react';

const orderTypeOptions = [
  { id: 'pickup', label: 'Pickup', icon: Store },
  { id: 'delivery', label: 'Delivery', icon: Truck },
];

export function Default() {
  const [value, setValue] = useState('pickup');
  return (
    <SegmentedControl
      options={orderTypeOptions}
      value={value}
      onChange={setValue}
      ariaLabel="Order type"
    />
  );
}

export function Comfortable() {
  const [value, setValue] = useState('delivery');
  return (
    <SegmentedControl
      options={orderTypeOptions}
      value={value}
      onChange={setValue}
      ariaLabel="Order type"
      size="comfortable"
    />
  );
}
