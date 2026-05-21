import { Star } from "lucide-react";

type StarsProps = {
  rating: number;
};

export function Stars({ rating }: StarsProps) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span
      aria-label={`${rating.toFixed(1)} out of 5`}
      className="inline-flex items-center gap-0.5 text-clay-500"
    >
      {Array.from({ length: 5 }, (_item, index) => (
        <Star
          aria-hidden
          className={index < full ? "fill-current" : "text-ink/20"}
          key={index}
          size={15}
          strokeWidth={2.4}
        />
      ))}
    </span>
  );
}
