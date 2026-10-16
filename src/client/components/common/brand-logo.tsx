export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/vetify_logo.jpg"
      alt=""
      aria-hidden="true"
      width={36}
      height={36}
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
