interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function StatBox({ label, value, sub, accent }: StatBoxProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <span
        className={`text-base font-semibold tabular-nums ${
          accent ? 'text-accent-gold' : 'text-text-primary'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-text-secondary">{sub}</span>}
    </div>
  );
}
