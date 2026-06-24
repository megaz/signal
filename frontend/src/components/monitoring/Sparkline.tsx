export function Sparkline({
  values,
  width = 120,
  height = 32,
  color = "#000",
  strokeWidth = 2,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (!values || values.length < 2) {
    return <svg width={width} height={height} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pad = strokeWidth;
  const usable = height - pad * 2;
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(pad + usable - ((v - min) / span) * usable).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
