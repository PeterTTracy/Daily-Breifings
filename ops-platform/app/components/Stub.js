// Shared placeholder for Phase 0 route shells.
export default function Stub({ icon, title, subtitle }) {
  return (
    <div className="py-12 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <h1 className="m-0 text-xl font-medium text-heading">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle || 'Coming soon'}</p>
    </div>
  );
}
