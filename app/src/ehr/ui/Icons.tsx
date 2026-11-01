/** Original generic line icons; decorative only, always accompanied by text. */
const paths = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5m0 3v1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  barcode: <path d="M3 5v14M6 5v14M10 5v14M12 5v14M16 5v14M18 5v14M21 5v14" />,
  pill: (
    <>
      <path d="m5 19 14-14M4.5 12.5l8-8a5 5 0 0 1 7 7l-8 8a5 5 0 0 1-7-7Z" />
    </>
  ),
  trend: <path d="M3 3v18h18M6 15l5-5 4 3 5-7" />,
  message: <path d="M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
};
export function ClinicalIcon({
  name,
  size = 16,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="clinical-icon"
    >
      {paths[name]}
    </svg>
  );
}
