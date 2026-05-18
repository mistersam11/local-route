import clsx from "clsx";

type AvatarProps = {
  src: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg"
};

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const initials = name
    .split(/\s|-/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      <img
        alt=""
        className={clsx("rounded-full object-cover ring-2 ring-white", sizeClass[size])}
        src={src}
      />
    );
  }

  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-water-700 font-bold text-white ring-2 ring-white",
        sizeClass[size]
      )}
    >
      {initials || "DG"}
    </span>
  );
}
