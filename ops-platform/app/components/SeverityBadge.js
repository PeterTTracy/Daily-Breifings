// Severity chip for issues (matches the KPI badge palette, with dark variants).
const SEV = {
  high: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#3a2020] dark:text-[#F0A3A3]',
  medium: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-[#3a2e18] dark:text-[#E5BC7E]',
  low: 'bg-[#F1EFE8] text-[#5F5E5A] dark:bg-[#2a2a26] dark:text-[#B5B5AE]',
};

export default function SeverityBadge({ severity }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium uppercase ${SEV[severity] || SEV.low}`}
    >
      {severity}
    </span>
  );
}
