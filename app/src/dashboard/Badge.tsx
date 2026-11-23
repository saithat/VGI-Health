export function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`dash-badge ${tone}`}>{children}</span>;
}
