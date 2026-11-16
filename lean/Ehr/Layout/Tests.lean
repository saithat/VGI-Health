import Ehr.Layout.Examples
namespace Ehr.Layout.Tests
private def label : Node := .box .frame
  { width := .fixed 6400, height := .fixed 1536 }
  { id := "label", text := some { key := "label", maxLength := 8, maxLines := 1 } } []
private def row : Node := .box (.stack .row)
  { width := .fill, height := .hug, gap := 512, padding := 256 } { paint := false } [label,label]
#guard (boxes ⟨20000,10000⟩ row).length == 3
#guard ((boxes ⟨20000,10000⟩ row)[1]!).rect == ⟨256,256,6400,1536⟩
#guard ((boxes ⟨20000,10000⟩ row)[2]!).rect == ⟨7168,256,6400,1536⟩
#guard (constrain ⟨⟨100,200⟩,⟨500,600⟩⟩ ⟨10,1000⟩) == ⟨100,600⟩
#guard advance {} 'W' > advance {} 'i'
#guard advance { font := 1 } 'W' ≥ advance {} 'W'
#guard textLines { maxLines := 2 } 20000 "short" == ["short",""]
#guard textLines { maxLines := 1, overflow := .ellipsis } 1 "long" == ["…"]
#guard (textLines { overflow := .scroll } 1 "abc").length == 3
private def overflow : Node := .box .absolute
  { width := .fill, height := .fill } { paint := false }
  [.box .frame { position := ⟨-640,128⟩, width := .fixed 20000, height := .fixed 400 }
    { id := "deliberate-overflow" } []]
#guard ((boxes ⟨10000,10000⟩ overflow)[1]!).rect.x == -640
#guard ((boxes ⟨10000,10000⟩ overflow)[1]!).rect.w == 10000
#guard contrastPass ⟨0,0,0⟩ ⟨255,255,255⟩ 9
#guard !(contrastPass ⟨240,240,240⟩ ⟨255,255,255⟩ 6)
#guard !(textFits ⟨⟨0,0,6400,1280⟩,{}, { text := some { safety := true, overflow := .ellipsis } },none,false,[],[]⟩
  { safety := true, overflow := .ellipsis } |> decide)
/-! Minimum font size (G4); new specification for owner review. -/
private def fontBox (size : Nat) : Placed :=
  ⟨⟨0,0,6400,1536⟩,{}, { text := some { maxLength := 4, fontSize := size, lineHeight := 1408 } },none,false,[],[]⟩
#guard minFontUnits == 768
#guard decide (textFits (fontBox 768) { maxLength := 4, fontSize := 768, lineHeight := 1408 })
#guard !decide (textFits (fontBox 767) { maxLength := 4, fontSize := 767, lineHeight := 1408 })
#guard !decide (G4 ⟨92160,57600⟩ [fontBox 704])
#guard (findings [] ⟨92160,57600⟩ [fontBox 704]).any fun f => f.rule == "G4" && f.metric == "font-size" && f.deficit == 64
/-! Contrast (G6); new specification for owner review. Grey 119 on white is
4.48:1 and grey 118 is 4.54:1; grey 160 is 2.6:1. -/
private def inkBox (m : Meta) (fg : Color) : Placed := ⟨⟨0,0,6400,3072⟩,{ fg },m,none,false,[],[]⟩
#guard textTwiceRatio == 9 && nonTextTwiceRatio == 6
#guard !decide (G6 [inkBox { text := some { fontSize := 1536, lineHeight := 2304 } } ⟨119,119,119⟩])
#guard !decide (G6 [inkBox { text := some { font := 3, fontSize := 1280, lineHeight := 1920 } } ⟨119,119,119⟩])
#guard decide (G6 [inkBox { text := some { fontSize := 1536, lineHeight := 2304 } } ⟨118,118,118⟩])
#guard !decide (G6 [inkBox { mark := .circle } ⟨160,160,160⟩])
#guard !decide (G6 [inkBox { mark := .polyline [⟨0,0⟩,⟨640,640⟩] 64 } ⟨160,160,160⟩])
#guard decide (G6 [inkBox { mark := .circle } ⟨119,119,119⟩])
#guard decide (G6 [inkBox { mark := .circle, paint := false } ⟨160,160,160⟩])
#guard decide (G6 [inkBox {} ⟨250,250,250⟩])
#guard !decide (G6 [inkBox { target := true } ⟨160,160,160⟩])
#guard (findings [] ⟨92160,57600⟩ [inkBox { id := "mark", mark := .circle } ⟨160,160,160⟩]).any
  fun f => f.rule == "G6" && f.node == "mark" && f.metric == "nontext-contrast-lower-millionths" && !f.warning
private def hugging : Node := .box .frame { width := .hug, height := .hug }
  { id := "hug", paint := false } [label]
#guard ((boxes ⟨20000,10000⟩ hugging).head!).rect.w == 6400
#guard ((boxes ⟨20000,10000⟩ hugging).head!).rect.h == 1536
#guard trackWidths { tracks := [.fixed 4000,.fr 1,.fr 2], gap := 100 } 20000 == [4000,5266,10533]
#guard trackWidths { tracks := [.fixed 2000,.fr 1], gap := 100 } 1000 == [2000,0]

/-! G10 (R5) regressions; new specification for owner review. -/
private def desk : Size := ⟨92160,57600⟩
private def button (i : Nat) : Node := .box .frame
  { width := .fixed 2048, height := .fixed 2048 } { id := s!"b{i}", target := true } []
private def dense (n : Nat) : Node := .box (.stack .row)
  { width := .fill, height := .hug, gap := 512, wrap := true } { paint := false } ((List.range n).map button)
#guard (firstViewportTargets desk (boxes desk (dense 20))).length == 20
#guard !decide (G10 15 desk (boxes desk (dense 20)))
#guard decide (G10 20 desk (boxes desk (dense 20)))
#guard decide (G10 15 desk (boxes desk (dense 15)))
#guard decide (G10 0 ⟨81920,51200⟩ (boxes ⟨81920,51200⟩ (dense 20)))
#guard (densityFindings 15 desk (boxes desk (dense 20))).map (·.metric) == ["first-viewport-targets","fixed-targets"]
/-- Twenty targets stacked in a 300px scroller: each window shows at most six. -/
private def scrolled : Node := .box .scroll { width := .fixed 19200, height := .fixed 19200 } { id := "list", paint := false }
  [.box (.stack .column) { width := .fill, height := .hug, gap := 1536 } { paint := false } ((List.range 20).map button)]
#guard (densityCounts desk (boxes desk scrolled)).2 == 6
#guard decide (G10 6 desk (boxes desk scrolled))
#guard !decide (G10 5 desk (boxes desk scrolled))
/-- The same scroller beside two fixed targets: every window now shows eight. -/
private def fixedBeside (n : Nat) : Node := .box .absolute { width := .fill, height := .fill } { paint := false }
  (scrolled :: (List.range n).map fun i => .box .frame
    { position := ⟨(32000 + i*4096 : Nat),0⟩, width := .fixed 2048, height := .fixed 2048 } { id := s!"f{i}", target := true } [])
#guard (fixedTargets (boxes desk (fixedBeside 2))).length == 2
#guard densityCounts desk (boxes desk (fixedBeside 2)) == (8,8)
#guard decide (G10 8 desk (boxes desk (fixedBeside 2)))
#guard !decide (G10 7 desk (boxes desk (fixedBeside 2)))
#guard (densityFindings 7 desk (boxes desk (fixedBeside 2))).map (fun f => (f.metric,f.actual)) ==
  [("first-viewport-targets",8),("scroll-window-targets",8)]
#guard !decide (G10 1 desk (boxes desk (fixedBeside 2)))
#guard (densityFindings 1 desk (boxes desk (fixedBeside 2))).any (·.metric == "fixed-targets")

/-! Pinned urgent strip (G11); new specification for owner review. -/
private def cardText : TextSlot := { key := "t", safety := true, overflow := .scroll, lineHeight := 1408 }
private def card (id : String) (y : Int) (z : Int) (m : Meta) (clips : List (String × Rect) := []) : Placed :=
  ⟨⟨1024,y,40000,1536⟩,{ fg := ⟨15,23,42⟩, z },{ m with id, text := some cardText },
    clips.head?.map Prod.snd,false,clips,[]⟩
private def stripCard (clips : List (String × Rect) := []) : Placed :=
  card "strip" 8192 40 { source := some [5], urgent := true, target := true } clips
private def modalCard (y : Int) : Placed := card "modal" y 100 { source := some [4], interruptive := true, target := true }
private def ordinaryCard : Placed := card "ordinary" 30000 0 { source := some [3], target := true }
-- Fixed, in the viewport and clear of the modal: pinned.
#guard decide (G11 desk [[5]] [stripCard, modalCard 20000, ordinaryCard])
#guard (urgentFindings desk [[5]] [stripCard, modalCard 20000, ordinaryCard]).isEmpty
-- A modal over the strip, a strip inside a scroller, and a strip below the viewport are refused.
#guard !decide (G11 desk [[5]] [stripCard, modalCard 8192])
#guard (urgentFindings desk [[5]] [stripCard, modalCard 8192]).map (fun f => (f.metric,f.other)) == [("overlap-area","modal")]
#guard !decide (G11 desk [[5]] [stripCard [("list",⟨0,0,92160,20000⟩)]])
#guard (urgentFindings desk [[5]] [stripCard [("list",⟨0,0,92160,20000⟩)]]).map (·.metric) == ["urgent-scrolls"]
#guard !decide (G11 desk [[5]] [card "strip" 57000 40 { source := some [5], urgent := true }])
-- An urgent occurrence painted without the flag is refused; the flag alone is not enough either.
#guard !decide (G11 desk [[5]] [card "strip" 8192 40 { source := some [5] }])
#guard (urgentFindings desk [[5]] [card "strip" 8192 40 { source := some [5] }]).map (·.metric) == ["urgent-not-pinned"]
#guard !decide (G11 desk [] [card "ornament" 8192 40 { urgent := true }, card "cover" 8192 50 {}])
-- Beside a modal the strip target stays active and can dispatch; an ordinary target cannot.
#guard activeTarget [stripCard, modalCard 20000, ordinaryCard] stripCard
#guard !activeTarget [stripCard, modalCard 20000, ordinaryCard] ordinaryCard
#guard stripDispatchable [stripCard, modalCard 20000, ordinaryCard] "strip"
#guard !stripDispatchable [stripCard, modalCard 20000, ordinaryCard] "ordinary"
#guard !dispatchable [stripCard, modalCard 20000, ordinaryCard] "ordinary"
-- Strip targets are fixed targets: they count against G10 with every window.
#guard (fixedTargets [stripCard, modalCard 20000, ordinaryCard]).length == 2
-- Only an urgent occurrence may carry the flag.
#guard decide (SourceLinked [⟨[5],true,.urgent,2⟩] stripCard)
#guard !decide (SourceLinked [⟨[5],true,.body,2⟩] stripCard)
#guard !decide (SourceLinked [] (card "ornament" 8192 40 { urgent := true }))

/-- A screen with two urgent alerts, their acknowledgment and an unrelated modal. -/
private def urgentScreen (alerts : Nat) (modal : Bool) : Ehr.Render.UiScreen :=
  { banner := [("Patient","Synthetic")], nav := [], title := "Orders", side := [],
    workspace := [.field "dose" "Dose" "text" (some "5") none none false false false,
      .button "sign" "Sign" "primary" true none none],
    modal := if modal then some (.section "notice" "Notice" [.button "notice" "Acknowledge" "ack" true none none]) else none,
    urgent? := some ((List.range alerts).map (fun i => .alert s!"urgent:{i}" s!"a{i}" s!"Allergy {i}" "interruptive") ++
      [.button "a0" "Acknowledge" "ack" true none none]) }
private def portAll (screen : Ehr.Render.UiScreen) : Bool := viewports.all fun v =>
  let (n,_,e) := portScreen v screen
  let ps := boxes v n
  checkAll 15 e (urgentPaths (screenShape screen)) v ps && decide (Linked (screenShape screen) ps)
-- The family reference layout pins the strip above the review scroller and the modal layer.
#guard (urgentPaths (screenShape (urgentScreen 2 true))).length == 3
#guard portAll (urgentScreen 2 false)
#guard portAll (urgentScreen 2 true)
#guard portAll (urgentScreen 0 true)
#guard ((boxes desk (portScreen desk (urgentScreen 2 true)).1).filter (·.info.urgent)).all
  fun p => p.clips.isEmpty && p.rect.y ≥ 11264 && p.rect.bottom ≤ 11264 + 3*2048

/-! Navigation links, tabs and the signed-in clinician in the semantic
inventory; new specification for owner review. -/
private def chromeScreen : Ehr.Render.UiScreen :=
  { banner := [("Patient","Synthetic")], viewer? := some "Registered nurse", title := "Visit",
    nav := [("Chart",[("goOrders","Orders"),("goNotes","Notes")]),("Tools",[("goSearch","Search")])],
    workspace := [.tabs "panel" ["Vitals","Labs","Notes"] 1 [.field "note" "Note" "text" none none none false false false],
      .section "group" "Group" [.button "group" "Collapse section" "toggle" true none none]],
    side := [], modal := none }
private def slotAt (path : List Nat) : Option SlotShape := (screenShape chromeScreen).find? (·.path == path)
-- The banner text carries the signed-in clinician.
#guard sourceValue chromeScreen [0] == "Synthetic  Signed in: Registered nurse"
-- Navigation: a wrapper, a heading per group, and one target per link, all in the side region.
#guard (slotAt [2]).map (fun s => (s.target,s.region)) == some (false,.side)
#guard (slotAt [2,0]).map (fun s => (s.target,s.region)) == some (false,.side)
#guard [[2,0,0],[2,0,1],[2,1,0]].all fun path => (slotAt path).map (fun s => (s.target,s.region)) == some (true,.side)
#guard [[2,0,0],[2,0,1],[2,1,0]].map (sourceValue chromeScreen) == ["Orders","Notes","Search"]
-- Tabs: the wrapper, then one target per label, then the selected body.
#guard (slotAt [3]).map (·.target) == some false
#guard [[3,0],[3,1],[3,2]].all fun path => (slotAt path).map (·.target) == some true
#guard [[3,0],[3,1],[3,2]].map (sourceValue chromeScreen) == ["Vitals","Labs","Notes"]
-- The tabs wrapper prints nothing; the selected tab is a flag on its part.
#guard sourceValue chromeScreen [3] == ""
#guard [[3,0],[3,1],[3,2]].map (fun path => (sourcePart chromeScreen path).map (·.selected)) ==
  [some false,some true,some false]
-- The body follows the tab targets: the field's label, then its control.
#guard sourceValue chromeScreen [3,3] == "Note"
#guard (sourcePart chromeScreen [3,3,0]).map (fun p => (p.role,p.target,p.kind)) == some (.control,true,"textarea")
-- A section toggle was already its own target occurrence (a child button).
#guard (slotAt [4,0]).map (·.target) == some true
#guard ((screenShape chromeScreen).filter (·.target)).length == 8
#guard ((screenNodes chromeScreen).map Prod.fst).Nodup
/-! Display parts per node kind; new specification for owner review. Each
guard lists the occurrences of one node: path, role and displayed text. -/
section Parts
open Ehr.Render
private def cx : DisplayCx :=
  { fieldChoices := [("route",{ options := [("PO","By mouth"),("IV","Intravenous")], showCode := true, allowOther := false })]
    entryHints := [("weight","Enter the weight in kg.")]
    fieldSources := [("dose","Source: Chart record")]
    confirms := ["dose"] }
private def view (node : UiNode) : List (List Nat × PartRole × String) :=
  (semanticNodes cx node).map fun (path,part) => (path,part.role,part.text)
private def part (node : UiNode) (path : List Nat) : Option Part := (semanticNodes cx node).lookup path
-- A field: its label, then the control (the target), unit, required marker, hint, source, confirmation, human entry.
private def weight : UiNode := .field "weight" "Weight" "qty" (some "70.5") (some "kg") (some "record:weightToday") true true true
#guard view weight == [([],.label,"Weight"),([0],.control,"70.5"),([1],.unit,"kg"),([2],.required,"Required"),
  ([3],.hint,"Enter the weight in kg."),([4],.source,"From chart"),([5],.pending,"Confirm"),([6],.human,"Human entry")]
#guard (part weight [4]).map (·.raw) == some "record:weightToday"
#guard ((semanticNodes cx weight).filter (·.2.target)).map Prod.fst == [[0],[5]]
#guard (part weight [0]).map (fun p => (p.kind,p.comp,p.entry,p.unit,p.raw)) == some ("number","weight","qty","kg","70.5")
-- A confirmation with an explicit button elsewhere is text; the source caption comes from the screen.
#guard view (.field "dose" "Dose" "qty" (some "5.0") (some "mg") (some "macro") true false false) ==
  [([],.label,"Dose"),([0],.control,"5.0"),([1],.unit,"mg"),([2],.source,"Source: Chart record"),([3],.pending,"Confirmation pending")]
#guard (part (.field "dose" "Dose" "qty" (some "5.0") (some "mg") (some "macro") true false false) [3]).map (·.target) == some false
-- A coded value shows its option's label; the code is its own part when codes are shown; options are popup data.
private def route : UiNode := .field "route" "Route" "code" (some "PO") none none false false false
#guard view route == [([],.label,"Route"),([0],.control,"By mouth"),([1],.code,"PO")]
#guard (part route [0]).map (fun p => (p.kind,p.raw,p.options,p.placeholder)) ==
  some ("select","PO",[("PO","By mouth"),("IV","Intravenous")],"Select route")
-- A value set prints nothing; its options reach the field inside.
#guard view (.valueSet [⟨"1","Emergent"⟩,⟨"2","Urgent"⟩] false [.field "esi" "ESI" "code" (some "2") none none false false false]) ==
  [([],.wrapper,""),([0],.label,"ESI"),([0,0],.control,"Urgent")]
-- A recorded code outside the listed options stays visible and selectable.
#guard (part (.field "pain" "Pain" "code:0|1|2" (some "7") none none false false false) [0]).map (fun p => (p.text,p.options)) ==
  some ("7",[("0","0"),("1","1"),("2","2"),("7","7")])
#guard (part (.field "ok" "Consent" "flag" (some "true") none none false false false) [0]).map (fun p => (p.text,p.kind,p.selected)) ==
  some ("Yes","checkbox",true)
-- A button: its label, why it is blocked, its hotkey. A blocked button always states a reason.
#guard view (.button "sign" "Sign" "primary" false (some "Allergies not reviewed") (some "Ctrl+S")) ==
  [([],.button,"Sign"),([0],.reason,"Allergies not reviewed"),([1],.hotkey,"Ctrl+S")]
#guard view (.button "sign" "Sign" "primary" false none none) == [([],.button,"Sign"),([0],.reason,"Unavailable")]
#guard view (.button "sign" "Sign" "primary" true none none) == [([],.button,"Sign")]
#guard (part (.button "sign" "Sign" "primary" false none none) []).map (fun p => (p.target,p.commit,p.enabled,p.kind)) ==
  some (true,true,false,"primary")
-- An alert: its label; the severity is kind and tone, not text.
#guard view (.alert "a" "allergy" "Penicillin allergy" "interruptive") == [([],.alert,"Penicillin allergy")]
#guard (part (.alert "a" "allergy" "Penicillin allergy" "interruptive") []).map (fun p => (p.kind,p.tone)) ==
  some ("interruptive","red")
#guard view (.section "g" "Vitals" [.text "x"]) == [([],.heading,"Vitals"),([0],.text,"x")]
-- Tabs: an empty wrapper, one target per tab with the selected one flagged, then the body.
#guard view (.tabs "t" ["A","B"] 1 [.text "body"]) == [([],.wrapper,""),([0],.tab,"A"),([1],.tab,"B"),([2],.text,"body")]
#guard [[0],[1]].map (fun path => (part (.tabs "t" ["A","B"] 1 []) path).map (fun p => (p.selected,p.target,p.col))) ==
  [some (false,true,some 0),some (true,true,some 1)]
-- A stepper: one numbered part per step, the current one flagged.
#guard view (.stepper [("s1","Triage"),("s2","Orders")] 1) == [([],.wrapper,""),([0],.step,"1. Triage"),([1],.step,"2. Orders")]
#guard [[0],[1]].map (fun path => (part (.stepper [("s1","Triage"),("s2","Orders")] 1) path).map (·.selected)) ==
  [some false,some true]
-- A uniform table: the caption, the column captions once, then one cell per record cell with row and column.
private def meds : UiNode := .info "meds" "Medications" "currentMeds" "table"
  [[("Medication","Aspirin"),("Status","active")],[("Medication","Lisinopril"),("Status","on hold")]]
#guard (semanticNodes cx meds).map (fun (path,p) => (path,p.role,p.text,p.row,p.col)) ==
  [([],.heading,"Medications",none,none),([0],.cellLabel,"Medication",some 0,some 0),([1],.cellLabel,"Status",some 0,some 1),
   ([2],.cellValue,"Aspirin",some 0,some 0),([3],.status,"Active",some 0,some 1),
   ([4],.cellValue,"Lisinopril",some 1,some 0),([5],.status,"on hold",some 1,some 1)]
#guard (part meds [5]).map (·.tone) == some "yellow" && (part meds [3]).map (·.raw) == some "active"
-- A single record: every value after its own caption. A result flag is a badge.
#guard view (.info "" "Dose check" "doseCheck" "summary" [[("Weight (kg)","70.5"),("Flag","H")]]) ==
  [([],.heading,"Dose Check"),([0],.cellLabel,"Weight (kg)"),([1],.cellValue,"70.5"),([2],.cellLabel,"Flag"),([3],.badge,"H")]
-- An empty table says so; a status line has only its caption.
#guard view (.info "" "Allergies" "allergyList" "list" []) == [([],.heading,"Allergies"),([0],.empty,"Allergies not on file")]
#guard view (.info "" "Review recorded" "reviewReceiptStatus" "status" []) == [([],.heading,"Review Recorded")]
-- Displayed wording is decided in Lean; the recorded datum stays in `raw`.
private def formatted : UiNode := .info "meds" "Current medications (LOINC)" "currentMeds" "list"
  [[("Medication","lisinopril 10 MG Oral Tablet"),("Instructions","1, 2x per 1 d"),("Authored","2026-11-02T06:00:18-08:00"),
    ("Entered response","Not entered")]]
#guard view formatted == [([],.heading,"Current Medications"),
  ([0],.cellLabel,"Medication"),([1],.cellValue,"lisinopril 10 mg oral tablet"),
  ([2],.cellLabel,"Instructions"),([3],.cellValue,"1 BID"),
  ([4],.cellLabel,"Authored"),([5],.cellValue,"11/02/2026 0600"),
  ([6],.cellLabel,"Response"),([7],.cellValue,"Not entered")]
#guard [[1],[3],[5],[6]].map (fun path => (part formatted path).map (·.raw)) ==
  [some "lisinopril 10 MG Oral Tablet",some "1, 2x per 1 d",some "2026-11-02T06:00:18-08:00",some "Entered response"]
#guard view (.field "dx" "Visit Diagnosis (ICD-10-CM)" "text" (some "I10") (some "mgPerKg") none false false false) ==
  [([],.label,"Visit diagnosis"),([0],.control,"I10"),([1],.unit,"mg/kg")]
#guard view (.button "t" "Template: Brief op note (human entry)" "macro" true none none) == [([],.button,"Brief op note")]
-- An epoch-minute instant is written in UTC and says so: Lean has no display time zone.
#guard view (.info "" "Late entry" "entryTimes" "status" [[("Entry","Weight"),("Observed","29385581")]]) ==
  [([],.heading,"Late Entry"),([0],.cellLabel,"Entry"),([1],.cellValue,"Weight"),
   ([2],.cellLabel,"Observed"),([3],.cellValue,"2025-11-14 15:41 UTC")]
#guard (part (.field "t" "Time taken" "observation-time" (some "29385581") none none false false false) [0]).map
  (fun p => (p.text,p.raw,p.kind)) == some ("2025-11-14 15:41 UTC","29385581","datetime")
-- The banner is one part; its fields are runs: name, identity, badges, details, clinician.
private def bannerSample : Part := bannerPart
  [("Patient","Ada Synthetic"),("Language","English"),("DOB","Jan 5, 1970"),("Allergies","Penicillin"),("MRN","123")]
  (some "Dr. Lee · Physician")
#guard bannerSample.text ==
  "Ada Synthetic  DOB: Jan 5, 1970  MRN: 123  Allergies: Penicillin  Language: English  Signed in: Dr. Lee · Physician"
#guard (bannerSample.runs.filter (·.role != .separator)).map (·.role) == [.name,.identity,.identity,.badge,.detail,.clinician]
#guard runsText bannerSample.runs == bannerSample.text
#guard runCells { safety := true, overflow := .scroll, maxLines := 2, lineHeight := 1408 } [⟨.name,"Ada"⟩,⟨.separator,"  "⟩,⟨.detail,"a\nb🧬"⟩] == [3,2,12]
-- Lists a node carries: reference curves, dated sources, board demands, pane alerts. No JSON is printed.
#guard view (.chartReferences [⟨"Weight","kg","50","WHO","girls 0-24 mo",[(0,335),(10,447)]⟩] []) ==
  [([],.wrapper,""),([0],.item,"Weight (kg) · percentile 50 · WHO · girls 0-24 mo · 0.0 mo: 3.35; 1.0 mo: 4.47")]
#guard view (.datedTimeline "Timeline" [⟨⟨"Observation/1","effectiveDateTime","2026-11-15T10:00:00Z"⟩,1794736800,0⟩]
    [⟨"Observation/2","issued","2026-11-15"⟩] []) ==
  [([],.heading,"Timeline"),([0],.item,"2026-11-15 10:00:00 UTC · Observation/1 · effectiveDateTime · 2026-11-15T10:00:00Z"),
   ([1],.item,"Time or offset unavailable · Observation/2 · issued · 2026-11-15")]
#guard view (.board [⟨"p1",[("Patient","Ada"),("MRN","123")],"sepsis","Sepsis alert","interruptive"⟩] []) ==
  [([],.wrapper,""),([0],.alert,"Ada · MRN 123 · Sepsis alert")]
#guard (semanticNodes cx (.rowAction "meds" 1 [.button "stop" "Stop" "secondary" true none none])).map
  (fun (path,p) => (path,p.role,p.row,p.comp)) == [([],.wrapper,some 1,"meds"),([0],.button,none,"stop")]
#guard view (.patientPane "p1" [("Patient","Ada"),("MRN","123")]
    { sourceLabels := [], fieldSources := [], entryHints := [], fieldChoices := [], urgent? := some [.alert "u" "a1" "Sepsis" "interruptive"] }
    [.text "pane"] [.text "modal"]) ==
  [([],.heading,"Ada  MRN: 123"),([0],.alert,"Sepsis"),([1],.text,"pane"),([2],.text,"modal")]
-- The screen inventory: banner, title, navigation with the active link flagged, then the workspace.
private def partsScreen : UiScreen :=
  { banner := [("Patient","Ada")], viewer? := some "Physician", title := "Orders", side := [], modal := none,
    nav := [("Chart",[("goOrders","Orders"),("goNotes","Notes")])], activeNav? := some "goOrders",
    entryHints? := some [("weight","Enter the weight in kg.")],
    workspace := [weight, .button "weight" "Confirm prefilled value" "confirm" true none none] }
#guard (screenNodes partsScreen).map (fun (path,p) => (path,p.role)) ==
  [([0],.banner),([1],.title),([2],.heading),([2,0],.heading),([2,0,0],.button),([2,0,1],.button),
   ([3],.label),([3,0],.control),([3,1],.unit),([3,2],.required),([3,3],.hint),([3,4],.source),([3,5],.pending),([3,6],.human),
   ([4],.button)]
#guard [[2,0,0],[2,0,1]].map (fun path => (sourcePart partsScreen path).map (·.selected)) == [some true,some false]
-- With an explicit confirmation button on the screen the field's own confirmation part is not a target.
#guard (sourcePart partsScreen [3,5]).map (fun p => (p.target,p.text)) == some (false,"Confirmation pending")
#guard ((screenShape partsScreen).filter (·.target)).map (·.path) == [[2,0,0],[2,0,1],[3,0],[4]]
end Parts
end Ehr.Layout.Tests
