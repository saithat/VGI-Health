import Ehr.Core.Types

/-!
# Formulary (reference data)

A small formulary used by the alert rules: drug classes, interactions,
high-alert flags, and pediatric weight-based dose ranges (per dose).

**This is reference data for a software demo, not clinical advice.** Values are
simplified and rounded to tenths of mg/kg. Do not use them to treat patients.

Conventions:
- The key is the lowercase generic name (`DrugInfo.name`).
- The first class is the therapeutic class used for duplicate-therapy checks;
  the rest are used for allergy and interaction matching.
- `minMgPerKgTenths`/`maxMgPerKgTenths` are per dose, in tenths of mg/kg.
  `0`/`0` means "no weight-based range" (e.g. dosed in units, or adult-only).
-/

namespace Ehr

/-- The formulary. Reference data only, not clinical advice. -/
def formulary : List DrugInfo := [
  { name := "amoxicillin", rxnorm := ["723"]
    classes := ["penicillin", "betaLactam", "antibiotic"]
    minMgPerKgTenths := 100, maxMgPerKgTenths := 500, highAlert := false
    interactsWith := ["vitaminKAntagonist"] },
  { name := "cefazolin", rxnorm := ["2180"]
    classes := ["cephalosporin", "betaLactam", "antibiotic"]
    minMgPerKgTenths := 200, maxMgPerKgTenths := 500, highAlert := false
    interactsWith := [] },
  { name := "ceftriaxone", rxnorm := ["2193"]
    classes := ["cephalosporin", "betaLactam", "antibiotic"]
    minMgPerKgTenths := 250, maxMgPerKgTenths := 1000, highAlert := false
    interactsWith := ["calciumIv"] },
  { name := "azithromycin", rxnorm := ["18631"]
    classes := ["macrolide", "antibiotic", "qtProlonging"]
    minMgPerKgTenths := 50, maxMgPerKgTenths := 100, highAlert := false
    interactsWith := ["qtProlonging", "vitaminKAntagonist"] },
  { name := "vancomycin", rxnorm := ["11124"]
    classes := ["glycopeptide", "antibiotic"]
    minMgPerKgTenths := 100, maxMgPerKgTenths := 200, highAlert := false
    interactsWith := ["aminoglycoside", "nsaid"] },
  { name := "lisinopril", rxnorm := ["29046"]
    classes := ["aceInhibitor", "antihypertensive"]
    minMgPerKgTenths := 1, maxMgPerKgTenths := 6, highAlert := false
    interactsWith := ["potassiumSparing", "nsaid"] },
  { name := "metformin", rxnorm := ["6809"]
    classes := ["biguanide", "antidiabetic"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := false
    interactsWith := ["iodinatedContrast"] },
  { name := "atorvastatin", rxnorm := ["83367"]
    classes := ["statin", "lipidLowering"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := false
    interactsWith := ["strongCyp3a4Inhibitor"] },
  { name := "warfarin", rxnorm := ["11289"]
    classes := ["anticoagulant", "vitaminKAntagonist"]
    minMgPerKgTenths := 1, maxMgPerKgTenths := 3, highAlert := true
    interactsWith := ["anticoagulant", "nsaid", "antiplatelet", "macrolide"] },
  { name := "apixaban", rxnorm := ["1364430"]
    classes := ["anticoagulant", "factorXaInhibitor"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := true
    interactsWith := ["anticoagulant", "nsaid", "antiplatelet"] },
  { name := "enoxaparin", rxnorm := ["67108"]
    classes := ["anticoagulant", "lowMolecularWeightHeparin"]
    minMgPerKgTenths := 5, maxMgPerKgTenths := 15, highAlert := true
    interactsWith := ["anticoagulant", "nsaid", "antiplatelet"] },
  { name := "heparin", rxnorm := ["5224"]
    classes := ["anticoagulant", "unfractionatedHeparin"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := true
    interactsWith := ["anticoagulant", "nsaid", "antiplatelet"] },
  { name := "insulin glargine", rxnorm := ["274783"]
    classes := ["basalInsulin", "insulin"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := true
    interactsWith := [] },
  { name := "insulin lispro", rxnorm := ["86009"]
    classes := ["bolusInsulin", "insulin"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := true
    interactsWith := [] },
  { name := "morphine", rxnorm := ["7052"]
    classes := ["opioid", "analgesic"]
    minMgPerKgTenths := 1, maxMgPerKgTenths := 2, highAlert := true
    interactsWith := ["opioid", "benzodiazepine", "sedative"] },
  { name := "hydromorphone", rxnorm := ["3423"]
    classes := ["opioid", "analgesic"]
    minMgPerKgTenths := 0, maxMgPerKgTenths := 0, highAlert := true
    interactsWith := ["opioid", "benzodiazepine", "sedative"] },
  { name := "ondansetron", rxnorm := ["26225"]
    classes := ["serotoninAntagonist", "antiemetic", "qtProlonging"]
    minMgPerKgTenths := 1, maxMgPerKgTenths := 2, highAlert := false
    interactsWith := ["qtProlonging"] },
  { name := "acetaminophen", rxnorm := ["161"]
    classes := ["acetaminophen", "analgesic", "antipyretic"]
    minMgPerKgTenths := 100, maxMgPerKgTenths := 150, highAlert := false
    interactsWith := [] },
  { name := "ibuprofen", rxnorm := ["5640"]
    classes := ["nsaid", "analgesic", "antipyretic"]
    minMgPerKgTenths := 50, maxMgPerKgTenths := 100, highAlert := false
    interactsWith := ["anticoagulant", "aceInhibitor", "glycopeptide"] },
  { name := "albuterol", rxnorm := ["435"]
    classes := ["betaAgonist", "bronchodilator"]
    minMgPerKgTenths := 1, maxMgPerKgTenths := 2, highAlert := false
    interactsWith := ["betaBlocker"] }
]

/-- Look up a drug by its formulary name. -/
def lookupDrug (name : String) : Option DrugInfo :=
  formulary.find? (·.name == name)

/-- The classes of a drug (empty for drugs not in the formulary). -/
def drugClasses (name : String) : List String :=
  match lookupDrug name with
  | some d => d.classes
  | none => []

/-- The therapeutic class (first class) of a drug, if known. -/
def primaryClass (name : String) : Option String :=
  (drugClasses name).head?

/-- Is the drug on the high-alert list? Unknown drugs are not. -/
def isHighAlert (name : String) : Bool :=
  match lookupDrug name with
  | some d => d.highAlert
  | none => false

/-- Is the drug in the given class? -/
def inClass (name cls : String) : Bool :=
  (drugClasses name).contains cls

#guard formulary.length == 20
#guard (formulary.map (·.name)).eraseDups.length == formulary.length
#guard inClass "amoxicillin" "penicillin"
#guard isHighAlert "warfarin" && !isHighAlert "acetaminophen"
#guard primaryClass "apixaban" == some "anticoagulant"

end Ehr
