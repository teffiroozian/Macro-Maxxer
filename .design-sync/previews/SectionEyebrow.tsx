import { SectionEyebrow } from 'macro-maxxer-ui';

export function Default() {
  return <SectionEyebrow>Featured restaurants</SectionEyebrow>;
}

export function AsHeading() {
  return (
    <SectionEyebrow as="h2" style={{ fontSize: 16 }}>
      Popular near you
    </SectionEyebrow>
  );
}
