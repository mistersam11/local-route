type StarsProps = {
  rating: number;
};

export function Stars({ rating }: StarsProps) {
  const full = Math.round(rating / 2);

  return (
    <span aria-label={`${rating} out of 10`} className="text-clay-500">
      {"★".repeat(full)}
      <span className="text-ink/20">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}
