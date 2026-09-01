/** The promise the page opens on: checked licences, and an answer either way. */
export default function BookingIntro() {
  return (
    <>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Find a vet, pick a time.</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Vet professionals that are displayed here are Vetify&apos;s verified professionals. They
        have been checked for their licenses and credentials, so you can be confident in the care
        your pet will receive.
      </p>
    </>
  );
}
