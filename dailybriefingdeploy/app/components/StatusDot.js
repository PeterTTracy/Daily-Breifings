// R/Y/G status light. Status colors are universal across light/dark themes.
const COLOR = {
  green: 'bg-[#1D9E75]',
  yellow: 'bg-[#E0A100]',
  red: 'bg-[#E24B4A]',
  gray: 'bg-[#b9b7af] dark:bg-[#3a3f47]',
};

const SIZE = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
};

export default function StatusDot({ color = 'gray', size = 'md', title }) {
  return (
    <span
      title={title}
      className={`inline-block shrink-0 rounded-full ${SIZE[size] || SIZE.md} ${COLOR[color] || COLOR.gray}`}
    />
  );
}
