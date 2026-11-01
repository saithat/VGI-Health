import Ehr.Render.Contracts
import Ehr.Examples.Tiny

/-!
# T10: the page agrees with the interpreter

These theorems concern the executable renderer, not a second model. Every
shown item has its labeled wrapper in the page. Every component id in the page
belongs to a shown item, and every component action is disabled exactly when
the view does not enable that id. Classes cannot express tiny text or hiding.
The fixed stylesheet and browser paint/hit-testing are checked offline.
-/
namespace Ehr.Render


theorem safe_text (allowed enabled s) : TreeSafe allowed enabled (.text s) := by
  intro n hn id hi
  cases hn
  simp [Html.HasCompId, Html.attrs] at hi

theorem safe_node (allowed enabled t cl attrs cs)
    (root : ∀ id, Attr.compId id ∈ attrs → allowed id ∧
      ((∃ e, Attr.event e ∈ attrs) → (Attr.disabled ∈ attrs ↔ enabled id = false)))
    (kids : ∀ h ∈ cs, TreeSafe allowed enabled h) :
    TreeSafe allowed enabled (.node t cl attrs cs) := by
  intro n hn id hi
  cases hn with
  | here => exact root id hi
  | child hm hw => exact kids _ hm _ hw id hi

@[simp] theorem roAttr_not_id (a : RoAttr) (id) : a.toAttr ≠ .compId id := by cases a <;> simp [RoAttr.toAttr]
@[simp] theorem partAttr_not_id (a : PAttr) (id) : a.toAttr ≠ .compId id := by
  cases a <;> simp [PAttr.toAttr]
@[simp] theorem partAttr_not_event (a : PAttr) (ev) : a.toAttr ≠ .event ev := by
  cases a <;> simp [PAttr.toAttr]; rename_i a; cases a <;> simp [RoAttr.toAttr]
@[simp] theorem partAttr_not_disabled (a : PAttr) : a.toAttr ≠ .disabled := by
  cases a <;> simp [PAttr.toAttr]; rename_i a; cases a <;> simp [RoAttr.toAttr]

mutual
theorem ro_safe (r : Ro) (allowed enabled) : TreeSafe allowed enabled r.toHtml := by
  cases r with
  | text s => exact safe_text _ _ _
  | el t c a ch =>
    simp only [Ro.toHtml_el]
    apply safe_node
    · intro id hi; simp at hi
    · intro h hm
      obtain ⟨r, hr, rfl⟩ := List.mem_map.mp hm
      exact ro_list_safe ch allowed enabled r hr
termination_by sizeOf r

theorem ro_list_safe (rs : List Ro) (allowed enabled) :
    ∀ r ∈ rs, TreeSafe allowed enabled r.toHtml := by
  cases rs with
  | nil => simp
  | cons r rs =>
    intro x hx
    rcases List.mem_cons.mp hx with he | hx
    · subst x; exact ro_safe r allowed enabled
    · exact ro_list_safe rs allowed enabled x hx
termination_by sizeOf rs
end

mutual
/-- Central id/disabled lemma for every component kind. -/
theorem part_safe (p : Part) (id : String) (on : Bool) (allowed enabled)
    (allow : allowed id) (en : enabled id = on) (kids : List Html)
    (hk : ∀ h ∈ kids, TreeSafe allowed enabled h) :
    ∀ h ∈ p.toHtmls id on kids, TreeSafe allowed enabled h := by
  cases p with
  | ro r => simpa using ro_safe r allowed enabled
  | kids => simpa using hk
  | el t c a ch =>
    simp only [Part.toHtmls_el, List.mem_singleton]
    intro h hh; subst h
    apply safe_node
    · intro i hi; simp at hi
    · exact parts_safe ch id on allowed enabled allow en kids hk
  | box t c a ch =>
    simp only [Part.toHtmls_box, List.mem_singleton]
    intro h hh; subst h
    apply safe_node
    · intro i hi
      have : i = id := by simpa using hi
      subst i
      refine ⟨allow, ?_⟩
      intro he; simp at he
    · exact parts_safe ch id on allowed enabled allow en kids hk
  | act ev t c a ch =>
    simp only [Part.toHtmls_act, List.mem_singleton]
    intro h hh; subst h
    apply safe_node
    · intro i hi
      have : i = id := by cases on <;> simpa [disabledUnless] using hi
      subst i
      refine ⟨allow, ?_⟩
      intro _
      cases on <;> simp [disabledUnless, en]
    · exact parts_safe ch id on allowed enabled allow en kids hk
termination_by sizeOf p

theorem parts_safe (ps : List Part) (id : String) (on : Bool) (allowed enabled)
    (allow : allowed id) (en : enabled id = on) (kids : List Html)
    (hk : ∀ h ∈ kids, TreeSafe allowed enabled h) :
    ∀ h ∈ ps.flatMap (Part.toHtmls id on kids), TreeSafe allowed enabled h := by
  cases ps with
  | nil => simp
  | cons p ps =>
    intro h hh
    rcases List.mem_append.mp hh with hh | hh
    · exact part_safe p id on allowed enabled allow en kids hk h hh
    · exact parts_safe ps id on allowed enabled allow en kids hk h hh
termination_by sizeOf ps
end

/-- The main content is a direct child of the page's grid. -/
theorem item_within_page (cx : Ctx) (it : ItemView) (hm : it ∈ cx.v.items) (hs : it.shown = true) :
    Within (renderItem cx it) (page cx) := by
  apply Within.trans (b := mainContent cx)
  · apply Within.of_mem
    exact List.mem_cons_of_mem _ (List.mem_map.mpr ⟨it, List.mem_filter.mpr ⟨hm, hs⟩, rfl⟩)
  · apply Within.trans (b := gridContent cx)
    · exact Within.of_mem (by simp)
    · exact Within.of_mem (by simp)

/-- T10(a): every shown component has its id and literal label in the page. -/
theorem T10_shown (cx : Ctx) (it : ItemView) (hm : it ∈ cx.v.items) (hs : it.shown = true) :
    ∃ n, Within n (page cx) ∧ n.HasCompId it.comp.id ∧ n.HasText it.comp.label := by
  refine ⟨renderItem cx it, item_within_page cx it hm hs, ?_, ?_⟩
  · simp [renderItem, Html.HasCompId, Html.attrs]
  · exact Within.child (c := .node .div [.fieldLabel] [] [.text it.comp.label])
      (by simp) (Within.of_mem (by simp))

/-- T10(c): no typed page node can carry the tiny class. -/
theorem T10_no_tiny (h : Html) : "ehr-tiny" ∉ h.classNames := by
  simp only [Html.classNames, List.mem_map, not_exists, not_and]
  intro c _
  cases c <;> decide


theorem renderItem_safe (cx : Ctx) (it : ItemView) (hm : it ∈ cx.v.items) (hs : it.shown = true) :
    TreeSafe (Shown cx) (cx.v.enabled.contains ·) (renderItem cx it) := by
  apply safe_node
  · intro id hi
    have he : id = it.comp.id := by simpa using hi
    subst id
    exact ⟨⟨it, hm, hs, rfl⟩, by simp⟩
  · intro h hh
    rcases List.mem_cons.mp hh with he | hh
    · subst h
      apply safe_node
      · simp
      · intro x hx
        have : x = .text it.comp.label := by simpa using hx
        subst x
        exact safe_text _ _ _
    · exact part_safe (itemPart cx it) it.comp.id (cx.v.enabled.contains it.comp.id)
        (Shown cx) (cx.v.enabled.contains ·) ⟨it, hm, hs, rfl⟩ rfl [] (by simp) h hh

theorem popup_safe (cx : Ctx) (allowed enabled) : ∀ h ∈ popup cx, TreeSafe allowed enabled h := by
  unfold popup
  split
  · simp
  · rename_i pair he
    rcases pair with ⟨a, key⟩
    intro h hh
    have : h = _ := List.mem_singleton.mp hh
    subst h
    apply safe_node
    · simp
    · intro h hh
      have : h = _ := List.mem_singleton.mp hh
      subst h
      apply safe_node
      · simp
      · intro h hh
        simp only [List.mem_cons, List.not_mem_nil, or_false] at hh
        rcases hh with rfl | rfl | rfl
        all_goals
          apply safe_node
          · simp
          · intro x hx
            have : x = _ := List.mem_singleton.mp hx
            subst x
            exact safe_text _ _ _

/-- T10(b,e): every emitted id belongs to a shown item; component events are
 disabled iff the interpreter does not enable that id. -/
theorem T10_page_safe (cx : Ctx) : TreeSafe (Shown cx) (cx.v.enabled.contains ·) (page cx) := by
  apply safe_node
  · simp
  · intro h hh
    simp only [List.mem_append, List.mem_map, List.mem_singleton] at hh
    rcases hh with (⟨r, _, rfl⟩ | hp) | rfl
    · exact ro_safe _ _ _
    · exact popup_safe cx _ _ _ hp
    · apply safe_node
      · simp
      · intro h hh
        rcases List.mem_cons.mp hh with rfl | hh
        · exact ro_safe _ _ _
        · have : h = mainContent cx := by simpa using hh
          subst h
          apply safe_node
          · simp
          · intro h hh
            rcases List.mem_cons.mp hh with rfl | hh
            · apply safe_node
              · simp
              · intro x hx
                have : x = .text cx.v.title := by simpa using hx
                subst x
                exact safe_text _ _ _
            · obtain ⟨it, hi, rfl⟩ := List.mem_map.mp hh
              obtain ⟨hm, hs⟩ := List.mem_filter.mp hi
              exact renderItem_safe cx it hm hs

/-- Every event node bearing a component id is disabled precisely when that
 id is absent from the enabled list (including while a modal is open). -/
theorem T10_disabled (cx : Ctx) (n : Html) (hn : Within n (page cx)) (id : String)
    (hi : n.HasCompId id) (he : n.HasEvent) :
    n.IsDisabled ↔ id ∉ cx.v.enabled := by
  simpa using (T10_page_safe cx n hn id hi).2 he

/-- Every component id in the output comes from a shown item. -/
theorem T10_only_shown (cx : Ctx) (n : Html) (hn : Within n (page cx)) (id : String)
    (hi : n.HasCompId id) : Shown cx id := (T10_page_safe cx n hn id hi).1

/-- An info item includes the full, untruncated infoContent tree. -/
theorem item_info_content (cx : Ctx) (it : ItemView) (i : InfoId)
    (hi : showsInfo i it.comp.kind = true) :
    Within (infoContent cx i).toHtml (renderItem cx it) := by
  have panel (j : InfoId) (h : itemPart cx it = panelPart cx j) :
      Within (infoContent cx j).toHtml (renderItem cx it) := by
    apply Within.child (c := .node .div [.panel] []
      [(txt .panelTitle (infoLabel cx j)).toHtml,
       (txt .badge (if hasValidReceipt cx.sp cx.facts cx.s j then "Reviewed · valid receipt" else "Review required")).toHtml,
       (infoContent cx j).toHtml])
    · simp [h, panelPart]
    · exact Within.of_mem (by simp)
  cases hk : it.comp.kind <;> simp [showsInfo, hk, bannerInfo] at hi
  case banner =>
    subst i
    exact Within.of_mem (by simp [itemPart, hk])
  all_goals
    subst i
    apply panel
    simp [itemPart, hk]

/-- T10(d): every info that the commit guard counts as shown has its entire
 content inside a component with that id, in the actual output page. -/
theorem T10_info (cx : Ctx) (i : InfoId)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s i = true) :
    ∃ it ∈ cx.v.items, it.shown = true ∧
      Within (renderItem cx it) (page cx) ∧ (renderItem cx it).HasCompId it.comp.id ∧
      Within (infoContent cx i).toHtml (renderItem cx it) := by
  obtain ⟨c, hc, hinfo⟩ := List.any_eq_true.mp hi
  simp only [Bool.and_eq_true] at hinfo
  let it := itemView cx.sp cx.facts cx.s (cx.prog.compsOf cx.s.screen) c
  have hm : it ∈ cx.v.items := by
    rw [Ctx.v_exact]
    exact List.mem_map.mpr ⟨c, hc, rfl⟩
  have hs : it.shown = true := by
    dsimp [it, itemView]
    unfold compShown
    rw [hinfo.2]
    cases hk : c.kind <;> simp_all [showsInfo]
  refine ⟨it, hm, hs, item_within_page cx it hm hs, ?_, item_info_content cx it i hinfo.1⟩
  simp [renderItem, Html.HasCompId, Html.attrs]

/-- Concrete nonvacuous instance on Tiny's initial rooming screen. -/
def tinyCtx : Ctx :=
  { sp := Examples.Tiny.spec, prog := Examples.Tiny.program, facts := Examples.Tiny.facts,
    disp := Display.empty, user := Examples.Tiny.user,
    s := init Examples.Tiny.spec Examples.Tiny.program Examples.Tiny.facts Examples.Tiny.user }

example : ∃ n, Within n (page tinyCtx) ∧ n.HasCompId "weightField" ∧ n.HasText "Weight" := by
  exact T10_shown tinyCtx
    (itemView tinyCtx.sp tinyCtx.facts tinyCtx.s (tinyCtx.prog.compsOf tinyCtx.s.screen)
      { id := "weightField", kind := .field "weight" (.fixed 0) (.fromRecord "weightToday"), label := "Weight", tag := "weight" })
    (by decide) (by decide)

example : TreeSafe (Shown tinyCtx) (tinyCtx.v.enabled.contains ·) (page tinyCtx) := T10_page_safe tinyCtx
example : "ehr-tiny" ∉ (page tinyCtx).classNames := T10_no_tiny _

#print axioms T10_shown
#print axioms T10_no_tiny
#print axioms T10_page_safe
#print axioms T10_disabled
#print axioms T10_only_shown
#print axioms T10_info
end Ehr.Render
