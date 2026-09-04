type Props = { onApply: () => void };

export default function HeroSection({ onApply }: Props) {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden bg-[#0a0c14] px-5 py-16 sm:px-8">
      {/* Two wide glows so the dark panel has depth without a gradient edge you can see */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full bg-[#16796f]/40 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-24 h-[420px] w-[420px] rounded-full bg-[#55B5C1]/20 blur-[130px]"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="mt-5 bg-gradient-to-br from-[#FAF9F6] via-[#FAF9F6] to-[#55B5C1] bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
          Join Vetify as a
          <br className="hidden sm:block" /> Trusted Professional
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#FAF9F6]/65">
          Partner with Vetify to connect with pet owners who need expert guidance, on your schedule
          and on your terms.
        </p>
        <button
          type="button"
          onClick={onApply}
          className="mt-9 inline-flex h-12 items-center justify-center rounded-xl bg-[#55B5C1] px-8 text-sm font-bold text-[#0a0c14] shadow-lg shadow-[#55B5C1]/20 transition-all hover:-translate-y-0.5 hover:bg-[#FAF9F6]"
        >
          Apply to join
        </button>
      </div>
    </section>
  );
}
