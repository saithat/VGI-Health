/-! Hospital policy (not law): owner-selected WCAG 2.2 AA physical bounds.
https://www.w3.org/TR/WCAG22/ . Ratios use tenths to avoid floating-point policy.
These thresholds alone are not a proof of browser conformance. -/
namespace Ehr.Specs.PhysicalBounds

/-- SC 2.5.8. Hospital baseline requires both dimensions; no spacing exception. -/
def targetCssPx : Nat := 24
/-- SC 1.4.3. Hospital baseline applies 4.5:1 also to large/disabled text. -/
def textContrastTenths : Nat := 45
/-- SC 1.4.11. Essential authored control/state/graphical indicators. -/
def nontextContrastTenths : Nat := 30
/-- SC 1.4.4. Text enlargement without loss of content or function. -/
def textResizePercent : Nat := 200
/-- SC 1.4.10. Vertical content reflow, equivalent to 1280px at 400% zoom. -/
def reflowCssPx : Nat := 320
/-- Owner's desktop range plus tablet; intermediate widths are sampled. -/
def viewportWidths : List Nat := [768, 1280, 1440, 1600, 1920]

end Ehr.Specs.PhysicalBounds
