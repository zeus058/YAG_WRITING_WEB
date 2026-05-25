type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <span className={`yag-wordmark ${className}`} aria-label="YAG">
      Y<span>A</span>G
    </span>
  );
}
