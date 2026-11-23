"""How VGI Health works: a ~4.5 minute explainer (Manim Community).

Render all scenes and join them:
    python docs/explainer/render.py            # 1080p30 by default
    python docs/explainer/render.py --quality l  # quick 480p preview
"""

from manim import (
    DOWN, LEFT, RIGHT, UP, UL, UR, ORIGIN,
    Arrow, Circle, Create, CurvedArrow, FadeIn, FadeOut, GrowArrow, Indicate,
    LaggedStart, Line, ReplacementTransform, RoundedRectangle, Scene,
    SurroundingRectangle, Text, Transform, VGroup, Write, config, rate_functions,
    AnimationGroup, Dot, MoveAlongPath, Rectangle,
)

# Palette: one accent per role, readable on the dark background.
BG = "#10151c"
INK = "#e8edf2"
MUTED = "#8b98a8"
AGENT = "#f2a541"  # the night agent (proposes)
LEAN = "#5ec4a1"  # Lean (checks, guarantees)
SPEC = "#6fa8f5"  # the hospital spec (fixed rules)
DANGER = "#ef6f6c"  # refusals, rejections
PANEL = "#1b2430"
EDGE = "#3a4757"

config.background_color = BG
FONT = "Noto Sans"
MONO = "Adwaita Mono"


def T(text, size=30, color=INK, font=FONT, **kw):
    return Text(text, font=font, font_size=size, color=color, **kw)


def M(text, size=24, color=INK):
    """Monospace line; leading spaces become an explicit indent (Pango drops them)."""
    body = text.lstrip(" ")
    line = Text(body.replace(" ", "\u00a0"), font=MONO, font_size=size, color=color)
    indent = len(text) - len(body)
    if indent:
        ch = Text("M", font=MONO, font_size=size).width
        line.shift(RIGHT * ch * indent)
        line = VGroup(Rectangle(width=ch * indent, height=0.01, stroke_width=0).next_to(line, LEFT, buff=0), line)
    return line


def card(label, color=EDGE, w=3.2, h=1.0, size=26, fill=PANEL, text_color=INK):
    box = RoundedRectangle(width=w, height=h, corner_radius=0.15, stroke_color=color,
                           stroke_width=3, fill_color=fill, fill_opacity=1)
    txt = VGroup(*[T(line, size, text_color) for line in label.split("\n")]).arrange(DOWN, buff=0.08)
    if txt.width > w - 0.3:
        txt.scale_to_fit_width(w - 0.3)
    return VGroup(box, txt.move_to(box))


def title(text, sub=None):
    t = T(text, 44).to_edge(UP, buff=0.5)
    if sub:
        s = T(sub, 24, MUTED).next_to(t, DOWN, buff=0.2)
        return VGroup(t, s)
    return VGroup(t)


def screen_mock(color=EDGE, w=2.4, h=1.6, rows=None):
    """A small EHR screen: a banner and a few component bars."""
    frame = RoundedRectangle(width=w, height=h, corner_radius=0.08, stroke_color=color,
                             stroke_width=2.5, fill_color=PANEL, fill_opacity=1)
    banner = Rectangle(width=w - 0.2, height=0.22, stroke_width=0, fill_color=SPEC,
                       fill_opacity=0.85).move_to(frame.get_top() + DOWN * 0.22)
    rows = rows or [0.9, 0.6, 0.75, 0.45]
    bars = VGroup(*[
        Rectangle(width=(w - 0.3) * r, height=0.12, stroke_width=0, fill_color=MUTED,
                  fill_opacity=0.6)
        for r in rows
    ]).arrange(DOWN, buff=0.13, aligned_edge=LEFT)
    bars.next_to(banner, DOWN, buff=0.18).align_to(banner, LEFT).shift(RIGHT * 0.05)
    return VGroup(frame, banner, bars)


class S1Problem(Scene):
    """Everyone gets the same screens; could an AI tailor them safely?"""

    def construct(self):
        name = T("VGI Health", 64)
        tag = T("clinical software that can safely change itself", 30, MUTED)
        VGroup(name, tag).arrange(DOWN, buff=0.35)
        self.play(Write(name), run_time=1.5)
        self.play(FadeIn(tag, shift=UP * 0.2))
        self.wait(3.25)
        self.play(FadeOut(name), FadeOut(tag))

        roles = ["Primary care\nphysician", "ED physician", "Inpatient RN",
                 "Pediatric NP", "General\nsurgeon"]
        people = VGroup(*[
            VGroup(Circle(0.32, color=INK, stroke_width=2.5), T(r, 18, MUTED))
            .arrange(DOWN, buff=0.15)
            for r in roles
        ]).arrange(RIGHT, buff=0.7).shift(DOWN * 1.8)
        one = screen_mock().shift(UP * 1.4)
        lines = VGroup(*[Line(one.get_bottom(), p[0].get_top(), color=EDGE) for p in people])
        cap = T("One EHR. The same screens for every clinician.", 30).to_edge(UP)
        self.play(FadeIn(cap), FadeIn(one), LaggedStart(*[FadeIn(p) for p in people], lag_ratio=0.15))
        self.play(LaggedStart(*[Create(l) for l in lines], lag_ratio=0.1))
        self.wait(4.06)

        many = VGroup(*[
            screen_mock(AGENT, w=1.7, h=1.15, rows=rs).move_to(p.get_center() + UP * 2.6)
            for p, rs in zip(people, [[0.9, 0.5], [0.4, 0.8, 0.6], [0.7, 0.7, 0.3, 0.5],
                                      [0.5, 0.9], [0.8, 0.4, 0.6]])
        ])
        cap2 = T("What if an AI reshaped them for each clinician, every night?", 30).to_edge(UP)
        self.play(ReplacementTransform(cap, cap2), FadeOut(lines),
                  *[ReplacementTransform(one.copy(), m) for m in many], FadeOut(one))
        self.wait(4.06)

        risk = T("…without ever being able to make them unsafe?", 34, DANGER).to_edge(DOWN, buff=0.4)
        self.play(FadeIn(risk, shift=UP * 0.2))
        self.wait(4.88)
        answer = T("Separate what can change from what must not, and prove the second.", 28, LEAN)
        answer.to_edge(DOWN, buff=0.4)
        self.play(ReplacementTransform(risk, answer))
        self.wait(4.88)


class S2DayNight(Scene):
    """Personas work simulated days; the night agent proposes UI changes."""

    def construct(self):
        head = title("A day and a night", "the loop that runs for each clinician")
        self.play(FadeIn(head))

        day = card("Day: simulated clinician\nworks the day's patients", INK, w=4.2, h=1.4, size=24)
        log = card("Recorded: clicks, typing,\nscrolls, mouse travel, time", EDGE, w=4.2, h=1.4, size=24)
        night = card("Night: AI agent proposes\nchanges to the screens", AGENT, w=4.2, h=1.4, size=24)
        check = card("Lean checks\nthe proposal", LEAN, w=4.2, h=1.4, size=24)
        ring = VGroup(day, log, night, check)
        day.move_to(LEFT * 3.2 + UP * 0.6)
        log.move_to(RIGHT * 3.2 + UP * 0.6)
        night.move_to(RIGHT * 3.2 + DOWN * 2.0)
        check.move_to(LEFT * 3.2 + DOWN * 2.0)
        arrows = VGroup(
            Arrow(day.get_right(), log.get_left(), color=MUTED, buff=0.1),
            Arrow(log.get_bottom(), night.get_top(), color=MUTED, buff=0.1),
            Arrow(night.get_left(), check.get_right(), color=MUTED, buff=0.1),
            Arrow(check.get_top(), day.get_bottom(), color=LEAN, buff=0.1),
        )
        for c, a in zip(ring, arrows):
            self.play(FadeIn(c, shift=UP * 0.15), run_time=0.8)
            self.play(GrowArrow(a), run_time=0.6)
            self.wait(1.95)
        deploy = T("deploy if accepted", 20, LEAN).next_to(arrows[3], LEFT, buff=0.15)
        self.play(FadeIn(deploy))
        self.wait(3.25)

        facts = VGroup(
            T("5 personas · 7 workflows · 1,442 synthetic patients", 24, MUTED),
            T("Every change is measured against the clinician's completed days", 24, MUTED),
        ).arrange(DOWN, buff=0.15).to_edge(DOWN, buff=0.15)
        self.play(FadeOut(head), ring.animate.shift(UP * 0.6), arrows.animate.shift(UP * 0.6),
                  deploy.animate.shift(UP * 0.6))
        self.play(FadeIn(facts))
        self.wait(6.5)

        patch = VGroup(
            M('{ "op": "add",', 22, AGENT),
            M('  "path": "/screens/2/components/-",', 22, AGENT),
            M('  "value": { "kind": "panel",', 22, AGENT),
            M('             "info": "vitalsTrend" } }', 22, AGENT),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.08)
        bg = SurroundingRectangle(patch, color=AGENT, fill_color=PANEL, fill_opacity=1, buff=0.25,
                                  corner_radius=0.1)
        box = VGroup(bg, patch).move_to(ORIGIN)
        note = T("The agent's output is a JSON patch to the screen program", 26).next_to(box, UP, buff=0.4)
        self.play(*[FadeOut(m) for m in [ring, arrows, deploy, facts]])
        self.play(FadeIn(note), FadeIn(box, scale=0.95))
        self.wait(6.5)


class S3ProgramsAreData(Scene):
    """A program is data; its meaning is a fixed transition system."""

    def construct(self):
        head = title("Screens are data, not code")
        self.play(FadeIn(head))
        kinds = ["field", "panel", "table", "trend", "alert", "banner",
                 "button", "group", "tabs", "macro", "search", "priorAuth"]
        chips = VGroup(*[card(k, AGENT, w=1.9, h=0.6, size=22) for k in kinds])
        chips.arrange_in_grid(rows=3, cols=4, buff=0.25).shift(UP * 0.4)
        cap = T("A closed list of component kinds, arranged on screens", 26, MUTED)
        cap.next_to(chips, DOWN, buff=0.4)
        self.play(LaggedStart(*[FadeIn(c, scale=0.9) for c in chips], lag_ratio=0.06))
        self.play(FadeIn(cap))
        self.wait(4.06)
        no = T("No loops, no variables, no code the agent writes ever runs", 26, INK)
        no.next_to(cap, DOWN, buff=0.25)
        self.play(FadeIn(no))
        self.wait(4.88)
        self.play(*[FadeOut(m) for m in [chips, cap, no]])

        prog = card("Program\n(screens)", AGENT, w=2.6, h=1.3, size=24)
        spec = card("Hospital spec\n(rules)", SPEC, w=2.6, h=1.3, size=24)
        facts = card("Patient record", EDGE, w=2.6, h=1.3, size=24)
        inputs = VGroup(prog, spec, facts).arrange(DOWN, buff=0.35).to_edge(LEFT, buff=0.8).shift(DOWN * 0.3)
        interp = card("Lean interpreter\nstep", LEAN, w=3.4, h=2.0, size=28).shift(RIGHT * 0.6 + DOWN * 0.3)
        arrows = VGroup(*[Arrow(i.get_right(), interp.get_left(), color=MUTED, buff=0.1) for i in inputs])
        sig = M("step : State → Event → State × (ok | blocked reason | ignored)", 22, LEAN)
        sig.next_to(head, DOWN, buff=0.35)
        self.play(FadeIn(inputs), FadeIn(interp), *[GrowArrow(a) for a in arrows], FadeIn(sig))
        self.wait(4.06)

        out1 = T("what is shown,\nwhere, and how\nscreens connect", 22, AGENT)
        out2 = T("what may be signed,\nentered, or\nacknowledged", 22, SPEC)
        outs = VGroup(out1, out2).arrange(DOWN, buff=0.6).to_edge(RIGHT, buff=0.6).shift(DOWN * 0.3)
        a1 = Arrow(prog.get_right() + UP * 0.1, interp.get_left() + UP * 0.6, color=AGENT, buff=0.1)
        self.play(FadeIn(out1, shift=LEFT * 0.2), Indicate(prog, color=AGENT))
        self.wait(3.25)
        self.play(FadeIn(out2, shift=LEFT * 0.2), Indicate(spec, color=SPEC))
        self.wait(3.25)
        lock = T("The agent edits only the program. The spec is out of its reach.", 26)
        lock.to_edge(DOWN, buff=0.35)
        self.play(FadeIn(lock))
        self.wait(6.5)


class S4Gate(Scene):
    """Lean's checker accepts or rejects with a counterexample."""

    def construct(self):
        head = title("The gate", "every proposal is checked before anyone sees it")
        self.play(FadeIn(head))
        prop = screen_mock(AGENT).shift(LEFT * 5 + DOWN * 0.4)
        gate = card("check", LEAN, w=2.4, h=3.4, size=34).shift(DOWN * 0.4)
        rules = VGroup(
            T("design rules R1–R7", 20, MUTED),
            T("layout geometry", 20, MUTED),
            T("review receipts", 20, MUTED),
            T("202 conformance scenarios", 20, MUTED),
        ).arrange(DOWN, buff=0.12, aligned_edge=LEFT).next_to(gate, DOWN, buff=0.25)
        self.play(FadeIn(prop), FadeIn(gate), FadeIn(rules))
        self.wait(3.25)

        ok_target = RIGHT * 4.6 + UP * 0.9
        bad_target = RIGHT * 4.6 + DOWN * 1.7
        accepted = T("accepted → deploys", 24, LEAN).move_to(ok_target + UP * 1.1)
        self.play(prop.animate.move_to(gate.get_center()).scale(0.8), run_time=1.2)
        self.play(prop.animate.move_to(ok_target).scale(1.25), FadeIn(accepted), run_time=1.2)
        self.wait(2.44)

        bad = screen_mock(DANGER, rows=[0.5, 0.9, 0.3]).shift(LEFT * 5 + DOWN * 0.4)
        self.play(FadeIn(bad))
        self.play(bad.animate.move_to(gate.get_center()).scale(0.8), run_time=1.2)
        self.play(bad.animate.move_to(bad_target).scale(1.25), run_time=1.2)
        rejected = T("rejected, with a counterexample", 24, DANGER).next_to(bad, DOWN, buff=0.2)
        self.play(FadeIn(rejected))
        self.wait(3.25)

        self.play(*[FadeOut(m) for m in [prop, gate, rules, accepted, bad, rejected]])
        cx_title = T("A counterexample is a replayable trace", 28).next_to(head, DOWN, buff=0.5)
        trace = VGroup(
            M("open chart  → ok", 24, MUTED),
            M("enter dose  → ok", 24, MUTED),
            M("click Sign  → blocked: entry required: indication", 24, DANGER),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).next_to(cx_title, DOWN, buff=0.6)
        self.play(FadeIn(cx_title))
        for line in trace:
            self.play(FadeIn(line, shift=RIGHT * 0.2), run_time=0.8)
            self.wait(1.3)
        why = VGroup(
            T("The proposal hid the field the rules require,", 26),
            T("so the order could never be signed. Lean found the exact step.", 26),
        ).arrange(DOWN, buff=0.12).to_edge(DOWN, buff=0.6)
        self.play(FadeIn(why))
        self.wait(4.88)
        loop = T("The agent reads the counterexample and tries again.", 26, AGENT).to_edge(DOWN, buff=0.6)
        self.play(ReplacementTransform(why, loop))
        self.wait(5.69)


class S5Proofs(Scene):
    """What is proved, and why it carries over to every accepted layout."""

    def construct(self):
        head = title("What is proved")
        self.play(FadeIn(head))
        left_h = T("For every possible layout", 28, LEAN)
        left = VGroup(
            T("• nothing is signed without its required", 22),
            T("   entries, reviews and alert acknowledgments", 22),
            T("• a macro never acts for a human", 22),
            T("• the patient banner and interruptive", 22),
            T("   alerts stay on screen", 22),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        right_h = T("For every accepted layout", 28, LEAN)
        right = VGroup(
            T("• each required workflow can be completed", 22),
            T("• each refusal names exactly what is missing", 22),
            T("• alerts can be raised and handled", 22),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        lcol = VGroup(left_h, left).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        rcol = VGroup(right_h, right).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        cols = VGroup(lcol, rcol).arrange(RIGHT, buff=0.9, aligned_edge=UP)
        cols.scale_to_fit_width(min(cols.width, 12.4)).move_to(UP * 0.6)
        self.play(FadeIn(lcol, shift=UP * 0.2))
        self.wait(4.88)
        self.play(FadeIn(rcol, shift=UP * 0.2))
        self.wait(4.88)

        chain = VGroup(
            card("check p = ok", LEAN, w=3.0, h=0.8, size=24),
            card("scenario holds for p", LEAN, w=3.6, h=0.8, size=24),
        ).arrange(RIGHT, buff=2.4).to_edge(DOWN, buff=1.4)
        imp = Arrow(chain[0].get_right(), chain[1].get_left(), color=LEAN, buff=0.1)
        lbl = T("soundness theorem", 20, MUTED).next_to(imp, DOWN, buff=0.15)
        self.play(FadeIn(chain[0]), GrowArrow(imp), FadeIn(lbl), FadeIn(chain[1]))
        self.wait(3.25)
        stats = T("202 of 202 conformance scenarios covered: 200 by the checker, 2 by the runtime",
                  22, MUTED).to_edge(DOWN, buff=0.6)
        stats2 = T("Lean's kernel checks every proof. No sorry, no new axioms.", 22, MUTED)
        stats2.next_to(stats, DOWN, buff=0.12)
        self.play(FadeIn(stats), FadeIn(stats2))
        self.wait(7.31)

        self.play(*[FadeOut(m) for m in [cols, chain, imp, lbl, stats, stats2]])
        native = VGroup(
            card("Lean interpreter", LEAN, w=3.4, h=1.0, size=26),
            VGroup(card("native server", EDGE, w=2.6, h=0.8, size=22),
                   card("browser (WebAssembly)", EDGE, w=3.4, h=0.8, size=22)).arrange(RIGHT, buff=0.6),
        ).arrange(DOWN, buff=1.0)
        arr = VGroup(*[Arrow(native[0].get_bottom(), t.get_top(), color=MUTED, buff=0.1) for t in native[1]])
        cap = T("The proofs are about the same code that runs every click.", 26).to_edge(DOWN, buff=0.8)
        self.play(FadeIn(native[0]), *[GrowArrow(a) for a in arr], FadeIn(native[1]))
        self.play(FadeIn(cap))
        self.wait(6.5)


class S6Review(Scene):
    """The human role: judge the spec, not the code."""

    def construct(self):
        head = title("Where people come in")
        self.play(FadeIn(head))
        proofs = card("Proofs\nchecked by Lean", LEAN, w=3.2, h=1.4, size=24)
        spec = card("Spec\nreviewed by people", SPEC, w=3.2, h=1.4, size=24)
        screens = card("Screens\ndesigned by the agent", AGENT, w=3.2, h=1.4, size=24)
        row = VGroup(screens, proofs, spec).arrange(RIGHT, buff=0.8).shift(UP * 0.4)
        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.2) for c in row], lag_ratio=0.3))
        self.wait(4.06)
        q = T("A proof only guarantees what its statement says.", 28).next_to(row, DOWN, buff=0.8)
        self.play(FadeIn(q))
        self.wait(4.06)
        self.play(Indicate(spec, color=SPEC, scale_factor=1.1))
        tab = T("The dashboard's Spec review tab lists every statement awaiting review,",
                24, MUTED).next_to(q, DOWN, buff=0.4)
        tab2 = T("read live from the Lean source.", 24, MUTED).next_to(tab, DOWN, buff=0.1)
        self.play(FadeIn(tab), FadeIn(tab2))
        self.wait(6.5)

        self.play(*[FadeOut(m) for m in [row, q, tab, tab2, head]])
        close = VGroup(
            T("Personalized where it is safe to vary.", 38, AGENT),
            T("Fixed, and proved, where it is not.", 38, LEAN),
        ).arrange(DOWN, buff=0.4)
        self.play(FadeIn(close[0], shift=UP * 0.2))
        self.wait(1.62)
        self.play(FadeIn(close[1], shift=UP * 0.2))
        self.wait(6.5)
        self.play(FadeOut(close))
        end = T("VGI Health", 48)
        self.play(FadeIn(end))
        self.wait(3.25)


class S3bOneNight(Scene):
    """What a single accepted change looks like for one clinician."""

    def construct(self):
        head = title("One night's change", "an illustrative example: a pediatric NP's visit screen")
        self.play(FadeIn(head))
        before = screen_mock(EDGE, w=4.2, h=3.0, rows=[0.9, 0.5, 0.7, 0.6, 0.8, 0.4])
        after = screen_mock(AGENT, w=4.2, h=3.0, rows=[0.9, 0.9, 0.5, 0.7])
        pair = VGroup(before, after).arrange(RIGHT, buff=2.2).shift(DOWN * 0.3)
        lb = T("before", 24, MUTED).next_to(before, UP, buff=0.2)
        la = T("after", 24, AGENT).next_to(after, UP, buff=0.2)
        arr = Arrow(before.get_right(), after.get_left(), color=AGENT, buff=0.2)
        self.play(FadeIn(before), FadeIn(lb))
        self.wait(1.95)
        self.play(GrowArrow(arr), FadeIn(after), FadeIn(la))
        self.wait(1.95)
        changes = VGroup(
            T("growth chart moved onto the visit screen", 22, INK),
            T("vaccine fields grouped where they are entered", 22, INK),
            T("a rarely used panel collapsed by default", 22, INK),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.12).next_to(pair, DOWN, buff=0.5)
        for c in changes:
            self.play(FadeIn(c, shift=RIGHT * 0.2), run_time=0.7)
            self.wait(1.56)
        self.wait(1.95)
        same = T("Same orders, same required entries, same alerts. Only the path to them changed.",
                 24, LEAN).to_edge(DOWN, buff=0.35)
        self.play(FadeOut(changes), FadeIn(same))
        self.wait(6.5)


class S4bInsideOneClick(Scene):
    """The commit guard that runs on every Sign click, whatever the layout."""

    def construct(self):
        head = title("Inside one click", "what the interpreter checks when a clinician clicks Sign")
        self.play(FadeIn(head))
        checks = ["role may perform this commit", "values valid (dose units match the drug)",
                  "every required entry present and confirmed", "required reviews shown or receipted",
                  "every firing interruptive alert acknowledged"]
        rows = VGroup(*[card(c, EDGE, w=7.4, h=0.62, size=22) for c in checks]).arrange(DOWN, buff=0.18)
        rows.shift(LEFT * 1.6 + DOWN * 0.4)
        self.play(LaggedStart(*[FadeIn(r, shift=UP * 0.1) for r in rows], lag_ratio=0.12))
        self.wait(1.95)
        result = card("commit recorded", LEAN, w=3.2, h=0.9, size=24).next_to(rows, RIGHT, buff=0.8)
        for r in rows:
            tick = T("✓", 30, LEAN).next_to(r, LEFT, buff=0.2)
            self.play(r[0].animate.set_stroke(LEAN), FadeIn(tick), run_time=0.6)
            self.wait(0.65)
        self.play(FadeIn(result, scale=0.9))
        self.wait(3.9)

        self.play(*[FadeOut(m) for m in self.mobjects if m is not head])
        mac_h = T("Macros can click and type, but act as a separate actor", 26).next_to(head, DOWN, buff=0.6)
        trace = VGroup(
            M("macro: enter dose        → ok, recorded unconfirmed", 22, MUTED),
            M("macro: enter pain score  → blocked: human only", 22, DANGER),
            M("human: confirm dose      → ok", 22, LEAN),
            M("human: enter pain score  → ok", 22, LEAN),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).next_to(mac_h, DOWN, buff=0.6)
        self.play(FadeIn(mac_h))
        for line in trace:
            self.play(FadeIn(line, shift=RIGHT * 0.2), run_time=0.8)
            self.wait(1.56)
        note = VGroup(
            T("These checks live in the interpreter, not in the screens.", 26),
            T("No layout can remove them: the theorems quantify over every program.", 26, LEAN),
        ).arrange(DOWN, buff=0.15).to_edge(DOWN, buff=0.5)
        self.play(FadeIn(note))
        self.wait(6.5)


SCENES = ["S1Problem", "S2DayNight", "S3ProgramsAreData", "S3bOneNight", "S4Gate", "S4bInsideOneClick",
          "S5Proofs", "S6Review"]
