type StarsProps = {
  rating: number;
};

export function Stars({ rating }: StarsProps) {
  const full = Math.round(rating);

  return (
    <span aria-label={`${rating} out of 5`} className="text-clay-500">
      {"★".repeat(full)}
      <span className="text-ink/20">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}
