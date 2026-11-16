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
#guard sourceValue chromeScreen [0] == "Patient: Synthetic  Signed in: Registered nurse"
-- Navigation: a wrapper, a heading per group, and one target per link, all in the side region.
#guard (slotAt [2]).map (fun s => (s.target,s.region)) == some (false,.side)
#guard (slotAt [2,0]).map (fun s => (s.target,s.region)) == some (false,.side)
#guard [[2,0,0],[2,0,1],[2,1,0]].all fun path => (slotAt path).map (fun s => (s.target,s.region)) == some (true,.side)
#guard [[2,0,0],[2,0,1],[2,1,0]].map (sourceValue chromeScreen) == ["Orders","Notes","Search"]
-- Tabs: the wrapper, then one target per label, then the selected body.
#guard (slotAt [3]).map (·.target) == some false
#guard [[3,0],[3,1],[3,2]].all fun path => (slotAt path).map (·.target) == some true
#guard [[3,0],[3,1],[3,2]].map (sourceValue chromeScreen) == ["Vitals","Labs","Notes"]
#guard sourceValue chromeScreen [3] == "Vitals | Labs | Notes (selected 2)"
#guard (sourceValue chromeScreen [3,3]).startsWith "Note:"
-- A section toggle was already its own target occurrence (a child button).
#guard (slotAt [4,0]).map (·.target) == some true
#guard ((screenShape chromeScreen).filter (·.target)).length == 8
#guard ((screenNodes chromeScreen).map Prod.fst).Nodup
end Ehr.Layout.Tests
