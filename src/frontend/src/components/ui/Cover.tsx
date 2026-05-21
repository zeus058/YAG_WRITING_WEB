type CoverProps = {
  index: number;
  small?: boolean;
};

export function Cover({ index, small = false }: CoverProps) {
  const palettes = [
    ["#41503D", "#C81C30", "#FFECCE"],
    ["#2E3829", "#3B82F6", "#FEBDB2"],
    ["#41503D", "#F59E0B", "#FAFAF8"],
    ["#243020", "#22C55E", "#FFECCE"],
  ];
  const [bg, accent, light] = palettes[index % palettes.length];

  return (
    <div className={small ? "cover-art small" : "cover-art"}>
      <svg viewBox="0 0 160 220" role="img" aria-label="Ảnh bìa truyện minh họa">
        <rect width="160" height="220" fill={bg} />
        <circle cx="126" cy="36" r="42" fill={accent} opacity=".82" />
        <path d="M0 154 C38 128 72 172 112 136 C132 118 146 114 160 120 V220 H0Z" fill={light} opacity=".88" />
        <path d="M32 48h68M32 68h44M32 176h92" stroke={light} strokeWidth="8" strokeLinecap="round" />
        <rect x="24" y="24" width="112" height="172" rx="8" fill="none" stroke={light} strokeOpacity=".34" strokeWidth="2" />
      </svg>
    </div>
  );
}
