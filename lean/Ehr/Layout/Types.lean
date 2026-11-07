import Lean
import Ehr.Render.Types

/-! Research layout protocol. Units are 1/64 CSS px; no floating point geometry.
Untrusted programs can request arbitrary geometry, colors and overlapping layers.
The independent checker, rather than the constructors, enforces UI rules. -/
namespace Ehr.Layout
open Lean

structure Size where
  w : Nat := 0
  h : Nat := 0
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

structure Point where
  x : Int := 0
  y : Int := 0
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

structure Rect where
  x : Int := 0
  y : Int := 0
  w : Nat := 0
  h : Nat := 0
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

def Rect.right (r : Rect) : Int := r.x + r.w
def Rect.bottom (r : Rect) : Int := r.y + r.h

def Contains (outer inner : Rect) : Prop :=
  outer.x ≤ inner.x ∧ outer.y ≤ inner.y ∧ inner.right ≤ outer.right ∧ inner.bottom ≤ outer.bottom
instance (a b : Rect) : Decidable (Contains a b) := inferInstanceAs (Decidable (_ ∧ _))

def Apart (a b : Rect) : Prop :=
  a.right ≤ b.x ∨ b.right ≤ a.x ∨ a.bottom ≤ b.y ∨ b.bottom ≤ a.y
instance (a b : Rect) : Decidable (Apart a b) := inferInstanceAs (Decidable (_ ∨ _))

structure Constraints where
  min : Size := {}
  max : Size := {}
  deriving Repr, Inhabited

def Constraints.Valid (c : Constraints) := c.min.w ≤ c.max.w ∧ c.min.h ≤ c.max.h

def constrain (c : Constraints) (s : Size) : Size :=
  ⟨max c.min.w (min c.max.w s.w), max c.min.h (min c.max.h s.h)⟩

def Satisfies (s : Size) (c : Constraints) :=
  c.min.w ≤ s.w ∧ s.w ≤ c.max.w ∧ c.min.h ≤ s.h ∧ s.h ≤ c.max.h

theorem constrain_satisfies (c s) (h : c.Valid) : Satisfies (constrain c s) c := by
  rcases c with ⟨⟨a,b⟩,⟨d,e⟩⟩
  rcases s with ⟨w,h'⟩
  simp_all [Constraints.Valid, Satisfies, constrain]
  omega

inductive Sizing | hug | fill | fixed (units : Nat)
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson
inductive Direction | row | column
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson
inductive Align | start | center | «end»
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson
inductive Overflow | wrap | ellipsis | scroll
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

structure TextSlot where
  key : String := ""
  /-- Finite contract for non-safety text only. Safety text is always unbounded. -/
  maxLength : Nat := 0
  maxLines : Nat := 1
  overflow : Overflow := .wrap
  safety : Bool := false
  font : Nat := 0
  fontSize : Nat := 896
  lineHeight : Nat := 1280
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

/-- Opaque arbitrary 8-bit sRGB. Out-of-range channels are rejected. -/
structure Color where
  r : Nat := 0
  g : Nat := 0
  b : Nat := 0
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

/-- Wedges use rational turns, never angles in floating point. Marks are clipped
by their declared box; line/polyline points are local integer coordinates. -/
inductive Mark
  | rect
  | circle
  | wedge (startNum sweepNum denominator : Nat)
  | polyline (points : List Point) (stroke : Nat)
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

inductive Track | fixed (units : Nat) | fr (weight : Nat)
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

structure Style where
  width : Sizing := .fill
  height : Sizing := .hug
  min : Size := {}
  max : Size := ⟨1000000000,1000000000⟩
  gap : Nat := 0
  padding : Nat := 0
  align : Align := .start
  wrap : Bool := false
  columns : Nat := 1
  tracks : List Track := []
  position : Point := {}
  z : Int := 0
  fg : Color := {}
  bg : Color := ⟨255,255,255⟩
  radius : Nat := 0
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

inductive Kind | frame | stack (direction : Direction) | grid | absolute | scroll
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

/-- A source is a tree-path occurrence, not a component ID (IDs are not unique
for text and wrappers). Agent-defined components expand to ordinary nodes. -/
structure Meta where
  id : String := ""
  source : Option (List Nat) := none
  text : Option TextSlot := none
  target : Bool := false
  banner : Bool := false
  interruptive : Bool := false
  commit : Bool := false
  paint : Bool := true
  role : String := ""
  mark : Mark := .rect
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

inductive Node where
  | box (kind : Kind) (style : Style) (info : Meta) (children : List Node)
  deriving Repr, Inhabited

/-- Geometry is a separate pass from binding data. No content enters layout. -/
structure Placed where
  rect : Rect
  style : Style
  info : Meta
  /-- Fixed clip viewport for the nearest scroll container. -/
  clip : Option Rect := none
  scroll : Bool := false
  /-- Innermost first; identities distinguish independent scrolling regions. -/
  clips : List (String × Rect) := []
  parents : List String := []
  deriving Repr, Inhabited, DecidableEq, ToJson, FromJson

structure Tree where
  box : Placed
  children : List Tree := []
  deriving Repr, Inhabited

abbrev Content := List (String × String)

def viewports : List Size := [⟨92160,57600⟩, ⟨81920,51200⟩, ⟨122880,69120⟩]

def viewportRect (v : Size) : Rect := ⟨0,0,v.w,v.h⟩

/-- Familiar token names are conveniences; arbitrary integer values remain legal. -/
def spacing : List (String × Nat) := [("0",0),("1",256),("2",512),("3",768),("4",1024),("6",1536),("8",2048)]
def palette : List (String × Color) :=
  [("slate-900",⟨15,23,42⟩),("slate-100",⟨241,245,249⟩),("blue-700",⟨29,78,216⟩),
   ("red-700",⟨185,28,28⟩),("white",⟨255,255,255⟩)]
def radii : List (String × Nat) :=
  [("rounded-none",0),("rounded",256),("rounded-md",384),("rounded-lg",512),("rounded-full",1000000000)]
def typeScale : List (String × Nat × Nat) :=
  [("text-xs",768,1152),("text-sm",896,1408),("text-base",1024,1536),
   ("text-lg",1152,1792),("text-xl",1280,1920),("text-2xl",1536,2176)]
def fontNames : List (String × Nat) :=
  [("sans-400",0),("sans-600",1),("sans-650",2),("sans-700",3),
   ("sans-750",4),("sans-800",5),("mono-400",6),("symbols-400",7)]
end Ehr.Layout
