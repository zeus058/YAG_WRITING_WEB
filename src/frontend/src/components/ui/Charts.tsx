export function LineChart() {
  return (
    <div className="chart">
      <div className="chart-line">
        <svg viewBox="0 0 640 220" preserveAspectRatio="none">
          <polyline points="0,180 80,150 160,162 240,100 320,120 400,72 480,88 560,42 640,58" fill="none" stroke="#C81C30" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="0,198 80,178 160,180 240,150 320,156 400,126 480,132 560,102 640,114" fill="none" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export function BarChart() {
  const colors = ["#C81C30", "#41503D", "#3B82F6"];

  return (
    <div className="bar-chart">
      {[46, 72, 58, 86, 64, 94, 78, 88].map((height, index) => (
        <div key={`${height}-${index}`} className="bar" style={{ height: `${height}%`, background: colors[index % colors.length] }} />
      ))}
    </div>
  );
}
