| Scenario | canonical/v1/P1 | canonical/v1/P2 | canonical/v1/P3 | canonical/v1/P4 | canonical/v1/P5 | canonical/v2/P1 | canonical/v2/P2 | canonical/v2/P3 | canonical/v2/P4 | canonical/v2/P5 | canonical/v3/P1 | canonical/v3/P2 | canonical/v3/P3 | canonical/v3/P4 | canonical/v3/P5 | run1-P3/P3/v0 | run1-P3/P3/v1 | run1-P3/P3/v2 | run1-P3/P3/v3 | run1-P3/P3/v4 | run1-P3/P3/v5 | run1-P3/P3/v6 | run1-P3/P3/v7 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| refill.denial-via-approval-action | FAIL | — | — | FAIL | — | FAIL | — | — | FAIL | — | FAIL | — | — | FAIL | — | — | — | — | — | — | — | — | — |

— = not applicable (role, workflow, release, or optional feature); exact reasons in JSON.

| Revision | Passed | Failed | Not applicable |
|---|---:|---:|---:|
| canonical/v1/P1 | 0 | 1 | 0 |
| canonical/v1/P2 | 0 | 0 | 1 |
| canonical/v1/P3 | 0 | 0 | 1 |
| canonical/v1/P4 | 0 | 1 | 0 |
| canonical/v1/P5 | 0 | 0 | 1 |
| canonical/v2/P1 | 0 | 1 | 0 |
| canonical/v2/P2 | 0 | 0 | 1 |
| canonical/v2/P3 | 0 | 0 | 1 |
| canonical/v2/P4 | 0 | 1 | 0 |
| canonical/v2/P5 | 0 | 0 | 1 |
| canonical/v3/P1 | 0 | 1 | 0 |
| canonical/v3/P2 | 0 | 0 | 1 |
| canonical/v3/P3 | 0 | 0 | 1 |
| canonical/v3/P4 | 0 | 1 | 0 |
| canonical/v3/P5 | 0 | 0 | 1 |
| run1-P3/P3/v0 | 0 | 0 | 1 |
| run1-P3/P3/v1 | 0 | 0 | 1 |
| run1-P3/P3/v2 | 0 | 0 | 1 |
| run1-P3/P3/v3 | 0 | 0 | 1 |
| run1-P3/P3/v4 | 0 | 0 | 1 |
| run1-P3/P3/v5 | 0 | 0 | 1 |
| run1-P3/P3/v6 | 0 | 0 | 1 |
| run1-P3/P3/v7 | 0 | 0 | 1 |

| Scenario | Revision | Observed outcome |
|---|---|---|
| refill.denial-via-approval-action | canonical/v1/P1 | Deny decision completed through approveRefill with no denial reason |
| refill.denial-via-approval-action | canonical/v1/P4 | Deny decision completed through approveRefill with no denial reason |
| refill.denial-via-approval-action | canonical/v2/P1 | Deny decision completed through approveRefill with no denial reason |
| refill.denial-via-approval-action | canonical/v2/P4 | Deny decision completed through approveRefill with no denial reason |
| refill.denial-via-approval-action | canonical/v3/P1 | Deny decision completed through approveRefill with no denial reason |
| refill.denial-via-approval-action | canonical/v3/P4 | Deny decision completed through approveRefill with no denial reason |
