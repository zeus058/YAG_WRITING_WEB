type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
};

export function MetricCard({ label, value, change }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {change ? <div className="metric-change">{change}</div> : null}
    </div>
  );
}
