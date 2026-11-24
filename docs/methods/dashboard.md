# Dashboard views

[Overview](../../README.md) · [Recording data](run-data.md)

The dashboard reviews saved recordings. Its shell handles URL parameters, run
selection and refresh, lazy evidence loading, tabs and the header. Views retain
the same markup, classes, links, query parameters, replay keys and interactions.

| Module in `app/src/dashboard/` | Responsibility |
|---|---|
| `Dashboard.tsx` | Shell, routing, run/detail loading and selected view (480 lines). |
| `Releases.tsx` | Release grid, migration details and kept-customization formatting. |
| `BreakPanel.tsx` | Recorded rejected proposals and the optional local attempt form. |
| `VersionList.tsx` | Version history, measured effects and quiet-night grouping. |
| `Certificate.tsx` | Certificate details and uncertified status. |
| `DecisionDrawers.tsx` | Decision record drawer, before/after modal and counterexample replay. |
| `formatting.ts` | Recorded event labels and predicted-savings formatting. |
| `rejections.ts` | Shared rejected-proposal extraction and selection types. |
| `Badge.tsx` | Shared status badge markup. |

**Spec review** reads flagged Lean declarations on each request and defaults to
**Trusted base, review**. The other filters show **Proven lemma, no review
needed** and **Unverified code**; no headline theorem covers the latter code or
types. Inline flags inherit their enclosing declaration’s classification,
including private definitions and anonymous instances. Source markers stay in
place. See [trusted-base generation](spec-review.md) for roots and freshness.
