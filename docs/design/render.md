# Lean page rendering

The renderer owns the whole page tree. The browser painter maps tags and
attributes to DOM nodes and turns event metadata into interpreter events.
The wire format is `{text:{s:...}}` or
`{node:{tag,attrs:[{name,value}],children:[...]}}` (Lean's derived JSON).
Classes, tags, attributes and input types are closed enums. There is no
`ehr-tiny`, hidden input, style, hidden, or aria-hidden attribute. A modal is
a div with role=dialog in document flow: native dialog without open is hidden.
Forms are omitted because implicit submission would reload the page.

`parseBundle context bundle` needs an explicit today date for recorded-today
weight and age calculations. It returns facts plus Display. Fixture resources
without resource.id use the complete entry.fullUrl (`urn:uuid:...`) as row id.
Patient identity is the Synthea identifier search token
`https://github.com/synthetichealth/synthea|<value>` when present, otherwise the
normalized source id. This survives Medplum assigning new server ids. Wristband
barcodes must encode that exact patient identity; scan fields emit Value.code
and the interpreter checks equality. The Synthea token can also locate the
Medplum Patient using an identifier search. It is not a REST resource id.

Allergy activity excludes inactive, resolved and entered-in-error records;
missing clinical status counts as active. Display also shows inactive allergies,
clearly labeled, but never those entered in error. Medication display includes
active and on-hold requests. The facts' current medication classes use active
requests only. No row limit is applied to safety panels. Empty allergies say
“No allergy records on file”.

Allergy and medication versions hash the sorted id@meta.versionId keys of all
resources of their type, including inactive resources. Medplum versions are
UUIDs, so summing numeric versions is impossible. FNV-1a is reduced to 52 bits
for exact JavaScript integer transport. Order independence is exact; freedom
from digest collisions is a trusted assumption. A String version is requested
in changes-requests.md for future exactness.

Info IDs: patientBanner, allergyList, currentMeds, vitals, resultTrend/labs,
problemList, immunizations, growthChart, encounters, procedures, doseCheck,
anticoagulants, careGaps, priorAuthStatus. Unknown IDs show the spec label and
an explicit empty notice. Clinical range and care-gap defaults are demo rules.
