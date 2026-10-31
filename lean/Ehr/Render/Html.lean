import Ehr.Render.Types

/-!
# Page-tree utilities

- `Ro.toHtml` and `Part.toHtmls` turn read-only content and component parts
  into page-tree nodes. `Part.toHtmls` is the only place that writes
  `data-comp-id`, `data-event`, and `disabled` on component nodes.
- `Within x h`: node `x` occurs in tree `h` (the statements of the render
  theorems use it).
- `Html.toPage` is the wire form; `PageNode.toHtmlString` is HTML text for
  previews and tests.
-/

namespace Ehr.Render

/-! ## Attributes -/

/-- A read-only attribute as a page-tree attribute. -/
def RoAttr.toAttr : RoAttr → Attr
  | .title s => .title s
  | .role r => .role r
  | .aria n v => .aria n v
  | .points s => .points s
  | .viewBox s => .viewBox s

/-- A part attribute as a page-tree attribute. -/
def PAttr.toAttr : PAttr → Attr
  | .ro a => a.toAttr
  | .tab n => .tab n
  | .valueKind k => .valueKind k
  | .unit u => .unit u
  | .value v => .value v
  | .type t => .type t
  | .placeholder s => .placeholder s

/-- `[disabled]` when the component is not enabled, else nothing. -/
def disabledUnless (on : Bool) : List Attr :=
  if on then [] else [.disabled]

/-! ## Read-only content -/

mutual
/-- Read-only content as a page tree. -/
def Ro.toHtml : Ro → Html
  | .text s => .text s
  | .el t c a ch => .node t c (a.map RoAttr.toAttr) (Ro.toHtmlList ch)
/-- A list of read-only content as page trees. -/
def Ro.toHtmlList : List Ro → List Html
  | [] => []
  | r :: rs => r.toHtml :: Ro.toHtmlList rs
end

theorem Ro.toHtmlList_eq (rs : List Ro) : Ro.toHtmlList rs = rs.map Ro.toHtml := by
  induction rs with
  | nil => simp [Ro.toHtmlList]
  | cons r rs ih => simp [Ro.toHtmlList, ih]

@[simp] theorem Ro.toHtml_text (s : String) : (Ro.text s).toHtml = .text s := by
  simp [Ro.toHtml]

@[simp] theorem Ro.toHtml_el (t : Tag) (c : List Cls) (a : List RoAttr) (ch : List Ro) :
    (Ro.el t c a ch).toHtml = .node t c (a.map RoAttr.toAttr) (ch.map Ro.toHtml) := by
  simp [Ro.toHtml, Ro.toHtmlList_eq]

/-! ## Component parts -/

mutual
/-- A component part as page-tree nodes, for component `id`. `on`: the view
lists the component as enabled. `kids`: the rendered children. -/
def Part.toHtmls (id : String) (on : Bool) (kids : List Html) : Part → List Html
  | .ro r => [r.toHtml]
  | .el t c a ch => [.node t c (a.map PAttr.toAttr) (Part.listToHtmls id on kids ch)]
  | .box t c a ch =>
    [.node t c (.compId id :: a.map PAttr.toAttr) (Part.listToHtmls id on kids ch)]
  | .act ev t c a ch =>
    [.node t c (.compId id :: .event ev :: (disabledUnless on ++ a.map PAttr.toAttr))
      (Part.listToHtmls id on kids ch)]
  | .kids => kids
/-- A list of parts as page-tree nodes. -/
def Part.listToHtmls (id : String) (on : Bool) (kids : List Html) : List Part → List Html
  | [] => []
  | p :: ps => p.toHtmls id on kids ++ Part.listToHtmls id on kids ps
end

theorem Part.listToHtmls_eq (id : String) (on : Bool) (kids : List Html) (ps : List Part) :
    Part.listToHtmls id on kids ps = ps.flatMap (Part.toHtmls id on kids) := by
  induction ps with
  | nil => simp [Part.listToHtmls]
  | cons p ps ih => simp [Part.listToHtmls, ih]

section
variable (id : String) (on : Bool) (kids : List Html)
@[simp] theorem Part.toHtmls_ro (r : Ro) : (Part.ro r).toHtmls id on kids = [r.toHtml] := by
  simp [Part.toHtmls]
@[simp] theorem Part.toHtmls_el (t : Tag) (c : List Cls) (a : List PAttr) (ch : List Part) :
    (Part.el t c a ch).toHtmls id on kids =
      [.node t c (a.map PAttr.toAttr) (ch.flatMap (Part.toHtmls id on kids))] := by
  simp [Part.toHtmls, Part.listToHtmls_eq]
@[simp] theorem Part.toHtmls_box (t : Tag) (c : List Cls) (a : List PAttr) (ch : List Part) :
    (Part.box t c a ch).toHtmls id on kids =
      [.node t c (.compId id :: a.map PAttr.toAttr) (ch.flatMap (Part.toHtmls id on kids))] := by
  simp [Part.toHtmls, Part.listToHtmls_eq]
@[simp] theorem Part.toHtmls_act (ev : EventName) (t : Tag) (c : List Cls) (a : List PAttr)
    (ch : List Part) :
    (Part.act ev t c a ch).toHtmls id on kids =
      [.node t c (.compId id :: .event ev :: (disabledUnless on ++ a.map PAttr.toAttr))
        (ch.flatMap (Part.toHtmls id on kids))] := by
  simp [Part.toHtmls, Part.listToHtmls_eq]
@[simp] theorem Part.toHtmls_kids : Part.kids.toHtmls id on kids = kids := by
  simp [Part.toHtmls]
end

/-! ## Occurrence in a tree -/

/-- `Within x h`: the node (or text) `x` occurs in the tree `h` (possibly `h`
itself). -/
inductive Within : Html → Html → Prop
  | here (h : Html) : Within h h
  | child {x c : Html} {t : Tag} {cl : List Cls} {as : List Attr} {cs : List Html} :
      c ∈ cs → Within x c → Within x (.node t cl as cs)

theorem Within.trans {a b c : Html} (h1 : Within a b) (h2 : Within b c) : Within a c := by
  induction h2 with
  | here => exact h1
  | child hm _ ih => exact .child hm ih

/-- A direct child occurs in its parent. -/
theorem Within.of_mem {x : Html} {t : Tag} {cl : List Cls} {as : List Attr} {cs : List Html}
    (h : x ∈ cs) : Within x (.node t cl as cs) :=
  .child h (.here x)

/-- The attributes of a node (none for text). -/
def Html.attrs : Html → List Attr
  | .text _ => []
  | .node _ _ a _ => a

/-- The classes of a node (none for text). -/
def Html.classes : Html → List Cls
  | .text _ => []
  | .node _ c _ _ => c

/-- The CSS class names of a node. -/
def Html.classNames (h : Html) : List String :=
  h.classes.map Cls.name

/-- The node carries `data-comp-id = id`. -/
def Html.HasCompId (id : String) (h : Html) : Prop :=
  Attr.compId id ∈ h.attrs

/-- The node carries some `data-event`. -/
def Html.HasEvent (h : Html) : Prop :=
  ∃ e, Attr.event e ∈ h.attrs

/-- The node carries `data-event = e`. -/
def Html.HasEventOf (e : EventName) (h : Html) : Prop :=
  Attr.event e ∈ h.attrs

/-- The node carries `disabled`. -/
def Html.IsDisabled (h : Html) : Prop :=
  Attr.disabled ∈ h.attrs

/-- The tree contains the text `s` as a text node. -/
def Html.HasText (s : String) (h : Html) : Prop :=
  Within (.text s) h

/-! ## Wire form -/

/-- An attribute as the painter receives it. -/
def Attr.toPage : Attr → PageAttr
  | .compId id => { name := "data-comp-id", value := id }
  | .event e => { name := "data-event", value := e.name }
  | .tab n => { name := "data-tab", value := toString n }
  | .alert a => { name := "data-alert", value := a }
  | .valueKind k => { name := "data-value-kind", value := k.name }
  | .unit u => { name := "data-unit", value := unitName u }
  | .aria n v => { name := n.name, value := v }
  | .disabled => { name := "disabled", value := "disabled" }
  | .value v => { name := "value", value := v }
  | .type t => { name := "type", value := t.name }
  | .placeholder s => { name := "placeholder", value := s }
  | .title s => { name := "title", value := s }
  | .role r => { name := "role", value := r.name }
  | .points s => { name := "points", value := s }
  | .viewBox s => { name := "viewBox", value := s }

/-- The `class` attribute for a class list (none if the list is empty). -/
def classAttr : List Cls → List PageAttr
  | [] => []
  | cs => [{ name := "class", value := " ".intercalate (cs.map Cls.name) }]

mutual
/-- The page tree in wire form. -/
def Html.toPage : Html → PageNode
  | .text s => .text s
  | .node t c a ch => .node t (classAttr c ++ a.map Attr.toPage) (Html.toPageList ch)
/-- A list of page trees in wire form. -/
def Html.toPageList : List Html → List PageNode
  | [] => []
  | h :: hs => h.toPage :: Html.toPageList hs
end

/-- Attribute names the wire form may contain (section 9.1). -/
def attrWhitelist : List String :=
  ["class", "data-comp-id", "data-event", "data-tab", "data-alert", "data-value-kind",
   "data-unit", "disabled", "value", "type", "placeholder", "title", "role", "points",
   "viewBox", "aria-label", "aria-expanded", "aria-selected", "aria-modal", "aria-checked",
   "aria-live", "aria-current", "aria-required", "aria-disabled"]

/-! ## HTML text (previews and tests) -/

/-- Escape text for HTML. -/
def escapeHtml (s : String) : String :=
  s.foldl (fun acc ch =>
    match ch with
    | '&' => acc ++ "&amp;"
    | '<' => acc ++ "&lt;"
    | '>' => acc ++ "&gt;"
    | '"' => acc ++ "&quot;"
    | '\'' => acc ++ "&#39;"
    | c => acc.push c) ""

/-- One attribute as HTML text. -/
def PageAttr.toHtmlString (a : PageAttr) : String :=
  " " ++ a.name ++ "=\"" ++ escapeHtml a.value ++ "\""

mutual
/-- A wire-form tree as HTML text. -/
def PageNode.toHtmlString : PageNode → String
  | .text s => escapeHtml s
  | .node t a ch =>
    let open_ := "<" ++ t.name ++ String.join (a.map PageAttr.toHtmlString) ++ ">"
    if t == .input then open_
    else open_ ++ PageNode.listToHtmlString ch ++ "</" ++ t.name ++ ">"
/-- A list of wire-form trees as HTML text. -/
def PageNode.listToHtmlString : List PageNode → String
  | [] => ""
  | n :: ns => n.toHtmlString ++ PageNode.listToHtmlString ns
end

/-- The page tree as HTML text. -/
def Html.toHtmlString (h : Html) : String :=
  h.toPage.toHtmlString

end Ehr.Render

namespace Ehr.Render

/-- Every class constructor, for tests. -/
def allCls : List Cls := [
  .shell, .banner, .bannerField, .bannerLabel, .badge, .badgeAllergy, .badgeFlag,
  .sidebar, .sidebarSection, .main, .screenTitle, .nav, .navItem, .navActive, .toolbar,
  .«section», .sectionHeader, .sectionCollapsed, .tabs, .tab, .tabActive, .grid, .row,
  .landmark, .field, .fieldLabel, .input, .inputPending, .unit, .provenance, .confirm,
  .humanOnly, .required, .value, .panel, .panelTitle, .table, .tableCompact, .empty,
  .trend, .trendLine, .abnormal, .alertInline, .alertInterruptive, .alertPassive,
  .modalBackdrop, .modal, .modalTitle, .modalBody, .button, .buttonPrimary,
  .buttonSecondary, .blockedReason, .«macro», .hotkey, .search, .compact]

-- Every class name is in the stylesheet list, names are distinct, and only
-- `ehr-tiny` is never written.
#guard allCls.all (fun c => stylesheetClasses.contains c.name)
#guard (allCls.map Cls.name).eraseDups.length == allCls.length
#guard stylesheetClasses.filter (fun n => !(allCls.map Cls.name).contains n) == ["ehr-tiny"]

end Ehr.Render
