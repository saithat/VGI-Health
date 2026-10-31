import Ehr.Render.Proofs
namespace Ehr.Render

/-- The exact human-confirm action produced by a pending field. -/
def confirmNode (cx : Ctx) (it : ItemView) : Html :=
  .node .button [.confirm]
    (.compId it.comp.id :: .event .confirm :: disabledUnless (cx.v.enabled.contains it.comp.id))
    [.text "Confirm prefilled value"]

/-- Pending values show their source/date and a confirm action on the same
 component id. The action's disabled state still follows the interpreter. -/
theorem field_pending (cx : Ctx) (it : ItemView) (e : ElementId) (p : String)
    (hp : it.pendingConfirm = true) (hv : it.provenance? = some p) :
    ∃ h ∈ (fieldPart cx it e).toHtmls it.comp.id (cx.v.enabled.contains it.comp.id) [],
      Within (.text (provenanceText cx.disp p)) h ∧ Within (confirmNode cx it) h := by
  unfold fieldPart
  dsimp only
  simp only [Part.toHtmls_el]
  refine ⟨_, List.mem_singleton_self _, ?_, ?_⟩
  · apply Within.trans (b := (txt .provenance (provenanceText cx.disp p)).toHtml)
    · exact .child (List.mem_singleton_self _) (.here _)
    · apply Within.of_mem
      simp [hv, hp, Part.toHtmls, Part.listToHtmls_eq]
  · apply Within.of_mem
    simp [hv, hp, Part.toHtmls, Part.listToHtmls_eq, confirmNode]

/-- T11: a shown pending prefill visibly identifies its source and date and
 provides a confirm button belonging to that field. -/
theorem T11_pending_prefill (cx : Ctx) (it : ItemView) (e : ElementId) (slot : Slot) (pre : Prefill) (p : String)
    (hm : it ∈ cx.v.items) (hs : it.shown = true) (hk : it.comp.kind = .field e slot pre)
    (hp : it.pendingConfirm = true) (hv : it.provenance? = some p) :
    Within (.text (provenanceText cx.disp p)) (page cx) ∧
    ∃ n, Within n (page cx) ∧ n.HasCompId it.comp.id ∧ n.HasEventOf .confirm := by
  obtain ⟨h, hh, hprov, hconfirm⟩ := field_pending cx it e p hp hv
  have hitem : Within h (renderItem cx it) := by
    apply Within.of_mem
    exact List.mem_cons_of_mem _ (by simpa [itemPart, hk] using hh)
  have hpage := (hitem.trans (item_within_page cx it hm hs))
  exact ⟨hprov.trans hpage, confirmNode cx it, hconfirm.trans hpage,
    by simp [confirmNode, Html.HasCompId, Html.attrs],
    by simp [confirmNode, Html.HasEventOf, Html.attrs]⟩

def tinyWeightItem : ItemView :=
  itemView tinyCtx.sp tinyCtx.facts tinyCtx.s (tinyCtx.prog.compsOf tinyCtx.s.screen)
    { id := "weightField", kind := .field "weight" (.fixed 0) (.fromRecord "weightToday"),
      label := "Weight", tag := "weight" }

example : Within (.text (provenanceText tinyCtx.disp "record:weightToday")) (page tinyCtx) ∧
    ∃ n, Within n (page tinyCtx) ∧ n.HasCompId "weightField" ∧ n.HasEventOf .confirm :=
  T11_pending_prefill tinyCtx tinyWeightItem "weight" (.fixed 0) (.fromRecord "weightToday")
    "record:weightToday" (by decide) (by decide) rfl (by decide) (by decide)

#print axioms T11_pending_prefill
end Ehr.Render
