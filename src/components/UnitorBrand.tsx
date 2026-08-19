import Image from "next/image";

type UnitorBrandProps = {
  label: string;
  size?: "small" | "medium" | "large";
};

const logoSizes = {
  small: "h-7 w-7",
  medium: "h-10 w-10",
  large: "h-14 w-14",
};

export function UnitorBrand({
  label,
  size = "medium",
}: UnitorBrandProps) {
  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap">
      <Image
        src="/images/unitor-logo.png"
        alt="Unitor logo"
        width={1024}
        height={1024}
        priority
        className={`${logoSizes[size]} shrink-0 object-contain`}
      />

      <span className="font-bold">
        {label}
      </span>
    </span>
  );
}
