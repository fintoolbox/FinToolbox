// components/AdSlot.js
import Image from "next/image";

export default function AdSlot({ label = "Advertisement", variant = "skyscraper" }) {
  // Reserve space for the image
  const sizeClass =
    variant === "skyscraper" ? "w-[160px] h-[600px]" :
    variant === "rectangle"  ? "w-[300px] h-[250px]" :
                               "w-[300px] h-[250px]";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border bg-white shadow-sm",
        "flex items-center justify-center",
        sizeClass,
      ].join(" ")}
      aria-label={label}
      role="complementary"
    >
      {/* Reference the image by public path */}
      <Image
        src="/images/ad-banner.jpg"
        alt={label}
        fill
        unoptimized   // <— tells Next not to run it through the optimizer
        className="object-cover"
        priority
      />

      {/* Accessible label only */}
      <span className="sr-only">{label} ({variant})</span>
    </div>
  );
}


