import DialogShell, { DIALOG_PRIMARY, DIALOG_SECONDARY } from './dialog-shell';

type Props = {
  open: boolean;
  name: string;
  home: string;
  clinic: string;
  onBack: () => void;
  onContinue: () => void;
};

// One line of the summary. An address that was never pinned is left out by the caller
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4">
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-[#16796f]">{label}</dt>
      <dd className="mt-1 text-sm text-[#0a0c14]">{value}</dd>
    </div>
  );
}

export default function ConfirmInquiryDialog(props: Props) {
  const { open, name, home, clinic, onBack, onContinue } = props;

  return (
    <DialogShell
      open={open}
      eyebrow="Last check"
      title="Is all of this true?"
      lead="Send this only if every box is true. A reviewer checks the licence against the PRC register, and the application after it checks your photographs against your face."
      onCancel={onBack}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onBack} className={DIALOG_SECONDARY}>
            Go back
          </button>
          <button type="button" onClick={onContinue} className={DIALOG_PRIMARY}>
            Continue
          </button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto px-6 sm:px-8">
        <dl className="divide-y divide-[#0a0c14]/10">
          <Row label="Name" value={name} />
          {home && <Row label="Home address" value={home} />}
          {clinic && <Row label="Clinic address" value={clinic} />}
        </dl>
        <p className="border-t border-[#0a0c14]/10 py-5 text-sm leading-6 text-slate-600">
          Once you are verified, this name and the addresses you pinned are what the map shows,
          which is how a client finds you. Changing either afterwards means writing to
          support.vetify@gmail.com, so read them once more before you continue.
        </p>
      </div>
    </DialogShell>
  );
}
