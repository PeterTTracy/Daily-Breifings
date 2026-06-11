// Period-over-period trend indicator.
const MAP = {
  up: { ch: '↑', cls: 'text-[#1D9E75]' },
  down: { ch: '↓', cls: 'text-[#E24B4A]' },
  flat: { ch: '→', cls: 'text-muted' },
};

export default function TrendArrow({ trend = 'flat', className = '' }) {
  const t = MAP[trend] || MAP.flat;
  return (
    <span aria-label={`trend ${trend}`} className={`font-semibold leading-none ${t.cls} ${className}`}>
      {t.ch}
    </span>
  );
}
