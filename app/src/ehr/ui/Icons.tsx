/** Original generic line icons; decorative only, always accompanied by text. */
const paths = {
  grid: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18M3 15h18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 4h2" />
    </>
  ),
  document: (
    <>
      <path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8m-8 4h8" />
    </>
  ),
  bed: (
    <>
      <path d="M3 5v16m18-10v10M3 17h18M3 11h18v6M7 8h5v3H7V8Z" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6m-5 0v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10" />
    </>
  ),
  checklist: (
    <>
      <rect x="5" y="4" width="15" height="17" rx="2" />
      <path d="M9 3h6v3H9V3Zm0 9 1 1 2-3m2 2h3m-8 5h2m3 0h3" />
    </>
  ),
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
