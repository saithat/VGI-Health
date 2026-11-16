import Ehr.Layout.Window

/-! Executable regressions for bounded lists (`Ehr.Layout.Window`). The
theorems cover every list; these pin concrete windows, parts and texts. -/
namespace Ehr.Layout.WindowTests
open Ehr.Render Ehr.Layout.Window

private def record (i : Nat) : List (String × String) :=
  [("Test", "Test " ++ toString i), ("Value", toString i), ("Flag", if i == 3 || i == 31 then "H" else "")]

private def rows : List (List (String × String)) := (List.range 47).map record

private def listScreen (pages : Option (List (String × Nat))) : UiScreen :=
  { banner := [], nav := [], title := "Results", side := [], modal := none, pages? := pages,
    workspace := [.info "results" "Results" "resultDetail" "table" rows] }

private def windowsOf' (s : UiScreen) : List UiWindow := (windowScreen {} s).windows?.getD []

#guard windowsOf' (listScreen none) ==
  [{ comp := "results", page := 0, pages := 3, size := 20, total := 47, flagged := 2, flaggedElsewhere := 1,
     nextFlagged? := some 1 }]
-- A page past the last shows the last page.
#guard (windowsOf' (listScreen (some [("results", 9)]))).map (·.page) == [2]
-- The page asked for shows its records, in order.
#guard (match (windowScreen {} (listScreen (some [("results", 1)]))).workspace with
  | [.info _ _ _ _ shown] => shown == (rows.drop 20).take 20
  | _ => false)
-- Page sizes are kept within the bounds; a list of at most one page is not paged.
#guard (windowsOf' (listScreen none) |>.map (·.size)) == [20]
#guard (windowScreen { size := 1 } (listScreen none)).windows?.map (·.map (·.size)) == some [5]
#guard (windowScreen { size := 500 } (listScreen none)).windows? == none
#guard (windowScreen { enabled := false } (listScreen none)).windows? == none
-- A list named by a row action, or shown twice, is not paged.
private def withRowAction : UiScreen :=
  { listScreen none with
      workspace := (listScreen none).workspace ++ [.rowAction "results" 2 [.button "open" "Open" "nav" true none none]] }
private def shownTwice : UiScreen :=
  { listScreen none with workspace := (listScreen none).workspace ++ (listScreen none).workspace }
#guard (windowScreen {} withRowAction).windows? == none
#guard (windowScreen {} shownTwice).windows? == none
-- The window's parts: position, flagged count, then the four targets.
private def pageTwo : UiWindow :=
  { comp := "results", page := 1, pages := 3, size := 20, total := 47, flagged := 2, flaggedElsewhere := 1,
    nextFlagged? := some 0 }
#guard (pagerParts pageTwo).map (fun p => (p.role, p.text, p.col, p.enabled)) ==
  [(.position, "Records 21–40 of 47", some 1, true), (.flagged, "1 flagged record on another page", none, true),
   (.pager, "Previous page", some 0, true), (.pager, "Next page", some 2, true), (.pager, "Page 2 of 3", some 1, true),
   (.pager, "Next flagged", some 0, true)]
#guard flaggedText 0 == "No flagged records on other pages"
#guard flaggedText 3 == "3 flagged records on other pages"
-- The simulated clinician reads the same paging decision.
#guard pagingOf {} (listScreen (some [("results", 1)])) "results" == some (20, 1)
#guard pagingOf {} (listScreen none) "other" == none
end Ehr.Layout.WindowTests
