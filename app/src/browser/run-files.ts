/** Content digests share day directories with clinician results. */
export function isDayResultFile(file: string): boolean {
  return /^(?:days|baselines|no-agent\/days)\/day-\d+\/[\w-]+\.json$/.test(file)
    && !file.endsWith('/digest.json');
}
