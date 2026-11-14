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
#guard (densityFindings 15 desk (boxes desk (dense 20))).map (·.metric) == ["first-viewport-targets"]
/-- Twenty targets stacked in a 300px scroller: each window shows at most six. -/
private def scrolled : Node := .box .scroll { width := .fixed 19200, height := .fixed 19200 } { id := "list", paint := false }
  [.box (.stack .column) { width := .fill, height := .hug, gap := 1536 } { paint := false } ((List.range 20).map button)]
#guard (densityCounts desk (boxes desk scrolled)).2 == 6
#guard decide (G10 6 desk (boxes desk scrolled))
#guard !decide (G10 5 desk (boxes desk scrolled))
end Ehr.Layout.Tests
