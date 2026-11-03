/** Explain replay failures in reviewer terms; keep the checker's exact text one click away. */
export function ReplayError({
  error,
  runId,
}: {
  error: string;
  runId: string;
}) {
  const stale = /Certified build mismatch/.test(error);
  return (
    <div role="alert" className="replay-error">
      {stale ? (
        <>
          <strong>
            This recording can’t be replayed on the current app build.
          </strong>
          <p>
            The app has changed since run {runId} was certified, so replay is
            refused to avoid showing something other than what was checked.{" "}
            {import.meta.env.DEV
              ? "The development server is never certified; replay in the built app (vite preview) after re-binding: "
              : "Re-bind the run against this build: "}
            <code>make rebind RUN={runId}</code>
          </p>
        </>
      ) : (
        <strong>Replay failed to load.</strong>
      )}
      <details>
        <summary>Checker message</summary>
        <p>{error}</p>
      </details>
    </div>
  );
}
