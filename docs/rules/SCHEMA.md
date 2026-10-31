# Rules catalog format

Each research lane writes `docs/rules/<area>.json`: a JSON array of rule objects. One object is one atomic requirement; split itemized lists into one rule per item.

```json
{
  "id": "cms-482.51-b6-findings",          // <area>-<citation-slug>-<item>, unique
  "title": "Operative report records findings",
  "citation": "42 CFR §482.51(b)(6)",
  "url": "https://www.ecfr.gov/current/title-42/section-482.51",
  "quote": "≤ 25 words, verbatim from the source",
  "type": "federal-regulation | federal-statute | ca-statute | ca-regulation | accreditation | guidance",
  "binding": true,                          // true only for law/regulation; false for accreditation/guidance
  "jurisdiction": "US | CA",
  "appliesTo": "hospital | prescriber | nurse | ehr-vendor | payer",
  "workflows": ["W6"],                      // W1 adult visit, W2 results in-basket, W3 ED, W4 inpatient MAR,
                                            // W5 pediatric visit, W6 surgical day, W7 refill requests
  "personas": ["P5"],                       // P1 PCP, P2 ED physician, P3 inpatient RN, P4 pediatric NP, P5 surgeon
  "commit": "signOpNote",                   // spec v1 commit it gates (see lean/Ehr/Specs/V1.lean), or null
  "encoding": "entry | review | humanOnly | alert | design | not-encodable",
  "proposedRule": "Plain words: signing the op note requires 'findings' to be entered by the surgeon.",
  "specMapping": { "element": "opFindings", "info": null, "when": "always", "prefill": "never", "friction": "compliance", "tier": null, "windowMin": null },
  "existingInSpec": false,                  // true if spec v1 already has it (name the element/info in specMapping)
  "needsCoreFeature": null,                 // e.g. "time window relative to procedure start" if the spec language can't express it
  "confidence": "high | medium | low",
  "verified": true,                         // false = UNVERIFIED (say why in notes)
  "notes": ""
}
```

Rules:
- Only real, public sources. Quote them verbatim. Never invent a citation. Mark anything you couldn't open as `"verified": false`.
- `binding` is honest: Joint Commission, ISMP, CDC, and SAFER are `false`.
- Prefer rules that touch W1–W7. Put others in with `"encoding": "not-encodable"` only if they're clearly EHR-relevant.
