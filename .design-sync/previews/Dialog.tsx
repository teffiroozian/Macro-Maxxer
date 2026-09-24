import { Dialog, AppButton, SectionEyebrow } from 'macro-maxxer-ui';

export function ConfirmDialog() {
  return (
    <Dialog onClose={() => {}} titleId="dialog-title" descriptionId="dialog-desc">
      <SectionEyebrow as="h2" id="dialog-title">
        Clear cart?
      </SectionEyebrow>
      <p id="dialog-desc" style={{ marginTop: 8, fontSize: 14, color: '#475569' }}>
        This removes every item you've added. You can't undo this.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
        <AppButton variant="ghost">Cancel</AppButton>
        <AppButton variant="primary">Clear cart</AppButton>
      </div>
    </Dialog>
  );
}
