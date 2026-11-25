"""How VGI Health works: a captioned explainer (Manim Community).

Render all scenes and join them:
    python docs/explainer/render.py            # 1080p30 by default
    python docs/explainer/render.py --quality l  # quick 480p preview
"""

import re

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


CAPTION_CHARS = 84
READ_RATE = 15


def caption_chunks(text):
    """Split a line into short caption cards at sentence, then clause, boundaries."""
    parts = re.split(r"(?<=[.?!:;])\s+", text)
    chunks = []
    for part in parts:
        while len(part) > CAPTION_CHARS:
            cut = part.rfind(", ", 0, CAPTION_CHARS)
            cut = cut + 1 if cut > 20 else part.rfind(" ", 0, CAPTION_CHARS)
            chunks.append(part[:cut].strip())
            part = part[cut:].strip()
        chunks.append(part)
    return [c for c in chunks if c]


class Narrated(Scene):
    """A scene whose beats each carry one caption line.

    say() starts a line. hold(w) waits at least w seconds and at least long enough
    to read the line. The caption runs until the next line starts, split into
    short cards by length.
    """

    def construct(self):
        self._line = None
        self.body()
        self._close()

    def _now(self):
        return self.renderer.time

    def _close(self):
        if self._line is None:
            return
        text, start, read_end = self._line
        if self._now() < read_end:
            self.wait(read_end - self._now())
        total = self._now() - start
        chunks = caption_chunks(text)
        weight = sum(len(c) for c in chunks)
        at = start
        for c in chunks:
            d = total * len(c) / weight
            self.add_subcaption(c, duration=d, offset=at - self._now())
            at += d
        self._line = None

    def say(self, text):
        self._close()
        # A line stays up long enough to read (about 15 characters a second).
        self._line = (text, self._now(), self._now() + len(text) / READ_RATE)

    def hold(self, seconds):
        remaining = self._line[2] - self._now() if self._line else 0
        self.wait(max(seconds, remaining))


class S1Problem(Narrated):
    """Everyone gets the same screens; could an AI tailor them safely?"""

    def body(self):
        name = T("VGI Health", 64)
        tag = T("clinical software that can safely change itself", 30, MUTED)
        VGroup(name, tag).arrange(DOWN, buff=0.35)
        self.say('VGI Health is clinical software that can safely change itself.')
        self.play(Write(name), run_time=1.5)
        self.play(FadeIn(tag, shift=UP * 0.2))
        self.hold(3.25)
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
        self.say("Today, a hospital's record system gives every clinician the same screens: the primary care physician, the emergency physician, the inpatient nurse, the pediatric nurse practitioner and the surgeon.")
        self.play(FadeIn(cap), FadeIn(one), LaggedStart(*[FadeIn(p) for p in people], lag_ratio=0.15))
        self.play(LaggedStart(*[Create(l) for l in lines], lag_ratio=0.1))
        self.hold(4.06)

        many = VGroup(*[
            screen_mock(AGENT, w=1.7, h=1.15, rows=rs).move_to(p.get_center() + UP * 2.6)
            for p, rs in zip(people, [[0.9, 0.5], [0.4, 0.8, 0.6], [0.7, 0.7, 0.3, 0.5],
                                      [0.5, 0.9], [0.8, 0.4, 0.6]])
        ])
        cap2 = T("What if an AI reshaped them for each clinician, every night?", 30).to_edge(UP)
        self.say('What if an AI reshaped those screens for each clinician, every night, around how that person actually works?')
        self.play(ReplacementTransform(cap, cap2), FadeOut(lines),
                  *[ReplacementTransform(one.copy(), m) for m in many], FadeOut(one))
        self.hold(4.06)

        risk = T("…without ever being able to make them unsafe?", 34, DANGER).to_edge(DOWN, buff=0.4)
        self.say('The hard part is doing that without ever being able to make the software unsafe.')
        self.play(FadeIn(risk, shift=UP * 0.2))
        self.hold(4.88)
        answer = T("Separate what can change from what must not, and prove the second.", 28, LEAN)
        answer.to_edge(DOWN, buff=0.4)
        self.say('The approach is to separate what may change from what must not, and to prove the part that must not.')
        self.play(ReplacementTransform(risk, answer))
        self.hold(4.88)


class S2DayNight(Narrated):
    """Personas work simulated days; the night agent proposes UI changes."""

    def body(self):
        self.say("Each clinician has a loop. By day, a simulated clinician works that day's patients, and every click, keystroke, scroll and mouse movement is recorded. By night, an AI agent proposes changes to the screens, and Lean, a proof checker, checks each proposal.")
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
        self.say('Only an accepted proposal deploys, and the clinician meets it the next day.')
        self.play(FadeIn(deploy))
        self.hold(3.25)

        facts = VGroup(
            T("5 personas · 7 workflows · 1,442 synthetic patients", 24, MUTED),
            T("Every change is measured against the clinician's completed days", 24, MUTED),
        ).arrange(DOWN, buff=0.15).to_edge(DOWN, buff=0.15)
        self.play(FadeOut(head), ring.animate.shift(UP * 0.6), arrows.animate.shift(UP * 0.6),
                  deploy.animate.shift(UP * 0.6))
        self.say('There are five clinicians, seven workflows and fourteen hundred synthetic patients. Every change is measured against all of the days a clinician has already worked.')
        self.play(FadeIn(facts))
        self.hold(6.5)

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
        self.say('What the agent produces is not code. It is a small patch to a description of the screens: here, adding a vital-signs trend panel to the third screen.')
        self.play(FadeIn(note), FadeIn(box, scale=0.95))
        self.hold(6.5)


class S3ProgramsAreData(Narrated):
    """A program is data; its meaning is a fixed transition system."""

    def body(self):
        self.say('That description is data. A screen is built from a fixed list of component kinds: fields, panels, tables, alerts, buttons, groups, tabs, macros and a few more.')
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
        self.hold(4.06)
        no = T("No loops, no variables, no code the agent writes ever runs", 26, INK)
        no.next_to(cap, DOWN, buff=0.25)
        self.say('There are no loops and no variables, and nothing the agent writes is ever run as a program.')
        self.play(FadeIn(no))
        self.hold(4.88)
        self.play(*[FadeOut(m) for m in [chips, cap, no]])

        prog = card("Program\n(screens)", AGENT, w=2.6, h=1.3, size=24)
        spec = card("Hospital spec\n(rules)", SPEC, w=2.6, h=1.3, size=24)
        facts = card("Patient record", EDGE, w=2.6, h=1.3, size=24)
        inputs = VGroup(prog, spec, facts).arrange(DOWN, buff=0.35).to_edge(LEFT, buff=0.8).shift(DOWN * 0.3)
        interp = card("Lean interpreter\nstep", LEAN, w=3.4, h=2.0, size=28).shift(RIGHT * 0.6 + DOWN * 0.3)
        arrows = VGroup(*[Arrow(i.get_right(), interp.get_left(), color=MUTED, buff=0.1) for i in inputs])
        sig = M("step : State → Event → State × (ok | blocked reason | ignored)", 22, LEAN)
        sig.next_to(head, DOWN, buff=0.35)
        self.say("Its meaning comes from one interpreter, written in Lean. It takes the screens, the hospital's rules and the patient's record, and turns each click or keystroke into a new state: accepted, blocked with a reason, or ignored.")
        self.play(FadeIn(inputs), FadeIn(interp), *[GrowArrow(a) for a in arrows], FadeIn(sig))
        self.hold(4.06)

        out1 = T("what is shown,\nwhere, and how\nscreens connect", 22, AGENT)
        out2 = T("what may be signed,\nentered, or\nacknowledged", 22, SPEC)
        outs = VGroup(out1, out2).arrange(DOWN, buff=0.6).to_edge(RIGHT, buff=0.6).shift(DOWN * 0.3)
        a1 = Arrow(prog.get_right() + UP * 0.1, interp.get_left() + UP * 0.6, color=AGENT, buff=0.1)
        self.say('The screens decide what is shown, where it is, and how screens connect.')
        self.play(FadeIn(out1, shift=LEFT * 0.2), Indicate(prog, color=AGENT))
        self.hold(3.25)
        self.say("The hospital's rules decide what may be signed, entered or acknowledged.")
        self.play(FadeIn(out2, shift=LEFT * 0.2), Indicate(spec, color=SPEC))
        self.hold(3.25)
        lock = T("The agent edits only the program. The spec is out of its reach.", 26)
        lock.to_edge(DOWN, buff=0.35)
        self.say('The agent can edit only the screens. The rules are out of its reach.')
        self.play(FadeIn(lock))
        self.hold(6.5)


class S4Gate(Narrated):
    """Lean's checker accepts or rejects with a counterexample."""

    def body(self):
        self.say("Every proposal passes through a gate before any clinician sees it. The gate applies the design rules, checks the layout's geometry, and runs two hundred and two clinical scenarios.")
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
        self.hold(3.25)

        ok_target = RIGHT * 4.6 + UP * 0.9
        bad_target = RIGHT * 4.6 + DOWN * 1.7
        accepted = T("accepted → deploys", 24, LEAN).move_to(ok_target + UP * 1.1)
        self.say('A proposal that passes is accepted and deploys.')
        self.play(prop.animate.move_to(gate.get_center()).scale(0.8), run_time=1.2)
        self.play(prop.animate.move_to(ok_target).scale(1.25), FadeIn(accepted), run_time=1.2)
        self.hold(2.44)

        bad = screen_mock(DANGER, rows=[0.5, 0.9, 0.3]).shift(LEFT * 5 + DOWN * 0.4)
        self.say('A proposal that fails is rejected, and the gate says exactly why.')
        self.play(FadeIn(bad))
        self.play(bad.animate.move_to(gate.get_center()).scale(0.8), run_time=1.2)
        self.play(bad.animate.move_to(bad_target).scale(1.25), run_time=1.2)
        rejected = T("rejected, with a counterexample", 24, DANGER).next_to(bad, DOWN, buff=0.2)
        self.play(FadeIn(rejected))
        self.hold(3.25)

        self.play(*[FadeOut(m) for m in [prop, gate, rules, accepted, bad, rejected]])
        cx_title = T("A counterexample is a replayable trace", 28).next_to(head, DOWN, buff=0.5)
        trace = VGroup(
            M("open chart  → ok", 24, MUTED),
            M("enter dose  → ok", 24, MUTED),
            M("click Sign  → blocked: entry required: indication", 24, DANGER),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).next_to(cx_title, DOWN, buff=0.6)
        self.say('The reason is a counterexample: a short sequence of steps anyone can replay. Open the chart, enter a dose, click Sign, and the order is blocked, because the indication is required.')
        self.play(FadeIn(cx_title))
        for line in trace:
            self.play(FadeIn(line, shift=RIGHT * 0.2), run_time=0.8)
            self.wait(1.3)
        why = VGroup(
            T("The proposal hid the field the rules require,", 26),
            T("so the order could never be signed. Lean found the exact step.", 26),
        ).arrange(DOWN, buff=0.12).to_edge(DOWN, buff=0.6)
        self.say('This proposal hid a field the rules require, so the order could never be signed. Lean found the exact step where it breaks.')
        self.play(FadeIn(why))
        self.hold(4.88)
        loop = T("The agent reads the counterexample and tries again.", 26, AGENT).to_edge(DOWN, buff=0.6)
        self.say('The agent reads the counterexample and tries again, still the same night.')
        self.play(ReplacementTransform(why, loop))
        self.hold(5.69)


class S5Proofs(Narrated):
    """What is proved, and why it carries over to every accepted layout."""

    def body(self):
        self.say('Some guarantees hold for every possible layout, whatever the agent does. Nothing is signed without its required entries, reviews and alert acknowledgments. A macro never acts for a human. The patient banner and interruptive alerts stay on screen.')
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
        self.hold(4.88)
        self.say('Others hold for every layout the gate accepts. Each required workflow can be completed, each refusal names exactly what is missing, and alerts can be raised and handled.')
        self.play(FadeIn(rcol, shift=UP * 0.2))
        self.hold(4.88)

        chain = VGroup(
            card("check p = ok", LEAN, w=3.0, h=0.8, size=24),
            card("scenario holds for p", LEAN, w=3.6, h=0.8, size=24),
        ).arrange(RIGHT, buff=2.4).to_edge(DOWN, buff=1.4)
        imp = Arrow(chain[0].get_right(), chain[1].get_left(), color=LEAN, buff=0.1)
        lbl = T("soundness theorem", 20, MUTED).next_to(imp, DOWN, buff=0.15)
        self.say('The link between the two is a soundness theorem: if the check accepts a layout, the scenario holds for that layout.')
        self.play(FadeIn(chain[0]), GrowArrow(imp), FadeIn(lbl), FadeIn(chain[1]))
        self.hold(3.25)
        stats = T("202 of 202 conformance scenarios covered: 200 by the checker, 2 by the runtime",
                  22, MUTED).to_edge(DOWN, buff=0.6)
        stats2 = T("Lean's kernel checks every proof. No sorry, no new axioms.", 22, MUTED)
        stats2.next_to(stats, DOWN, buff=0.12)
        self.say("All two hundred and two scenarios are covered this way. Lean's kernel checks every proof, with no gaps and no new assumptions.")
        self.play(FadeIn(stats), FadeIn(stats2))
        self.hold(7.31)

        self.play(*[FadeOut(m) for m in [cols, chain, imp, lbl, stats, stats2]])
        native = VGroup(
            card("Lean interpreter", LEAN, w=3.4, h=1.0, size=26),
            VGroup(card("native server", EDGE, w=2.6, h=0.8, size=22),
                   card("browser (WebAssembly)", EDGE, w=3.4, h=0.8, size=22)).arrange(RIGHT, buff=0.6),
        ).arrange(DOWN, buff=1.0)
        arr = VGroup(*[Arrow(native[0].get_bottom(), t.get_top(), color=MUTED, buff=0.1) for t in native[1]])
        cap = T("The proofs are about the same code that runs every click.", 26).to_edge(DOWN, buff=0.8)
        self.say('And the proofs are about the very code that runs every click, on the server and in the browser.')
        self.play(FadeIn(native[0]), *[GrowArrow(a) for a in arr], FadeIn(native[1]))
        self.play(FadeIn(cap))
        self.hold(6.5)


class S6Review(Narrated):
    """The human role: judge the spec, not the code."""

    def body(self):
        self.say('So who does what? The agent designs the screens. Lean checks the proofs. People review the rules.')
        head = title("Where people come in")
        self.play(FadeIn(head))
        proofs = card("Proofs\nchecked by Lean", LEAN, w=3.2, h=1.4, size=24)
        spec = card("Spec\nreviewed by people", SPEC, w=3.2, h=1.4, size=24)
        screens = card("Screens\ndesigned by the agent", AGENT, w=3.2, h=1.4, size=24)
        row = VGroup(screens, proofs, spec).arrange(RIGHT, buff=0.8).shift(UP * 0.4)
        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.2) for c in row], lag_ratio=0.3))
        self.hold(4.06)
        q = T("A proof only guarantees what its statement says.", 28).next_to(row, DOWN, buff=0.8)
        self.say('That last part matters, because a proof only guarantees what its statement says.')
        self.play(FadeIn(q))
        self.hold(4.06)
        self.play(Indicate(spec, color=SPEC, scale_factor=1.1))
        tab = T("The dashboard's Spec review tab lists every statement awaiting review,",
                24, MUTED).next_to(q, DOWN, buff=0.4)
        tab2 = T("read live from the Lean source.", 24, MUTED).next_to(tab, DOWN, buff=0.1)
        self.say("The dashboard's Spec review tab lists every statement waiting for review, read live from the Lean source.")
        self.play(FadeIn(tab), FadeIn(tab2))
        self.hold(6.5)

        self.play(*[FadeOut(m) for m in [row, q, tab, tab2, head]])
        close = VGroup(
            T("Personalized where it is safe to vary.", 38, AGENT),
            T("Fixed, and proved, where it is not.", 38, LEAN),
        ).arrange(DOWN, buff=0.4)
        self.say('Personalized where it is safe to vary. Fixed, and proved, where it is not.')
        self.play(FadeIn(close[0], shift=UP * 0.2))
        self.hold(1.62)
        self.play(FadeIn(close[1], shift=UP * 0.2))
        self.hold(6.5)
        self.play(FadeOut(close))
        end = T("VGI Health", 48)
        self.say('That is VGI Health.')
        self.play(FadeIn(end))
        self.hold(3.25)


class S3bOneNight(Narrated):
    """What a single accepted change looks like for one clinician."""

    def body(self):
        self.say("Here is what one accepted change might look like, for a pediatric nurse practitioner's visit screen. The growth chart moves onto the visit screen, the vaccine fields are grouped where they are entered, and a rarely used panel starts collapsed.")
        head = title("One night's change", "an illustrative example: a pediatric NP's visit screen")
        self.play(FadeIn(head))
        before = screen_mock(EDGE, w=4.2, h=3.0, rows=[0.9, 0.5, 0.7, 0.6, 0.8, 0.4])
        after = screen_mock(AGENT, w=4.2, h=3.0, rows=[0.9, 0.9, 0.5, 0.7])
        pair = VGroup(before, after).arrange(RIGHT, buff=2.2).shift(DOWN * 0.3)
        lb = T("before", 24, MUTED).next_to(before, UP, buff=0.2)
        la = T("after", 24, AGENT).next_to(after, UP, buff=0.2)
        arr = Arrow(before.get_right(), after.get_left(), color=AGENT, buff=0.2)
        self.play(FadeIn(before), FadeIn(lb))
        self.hold(1.95)
        self.play(GrowArrow(arr), FadeIn(after), FadeIn(la))
        self.hold(1.95)
        changes = VGroup(
            T("growth chart moved onto the visit screen", 22, INK),
            T("vaccine fields grouped where they are entered", 22, INK),
            T("a rarely used panel collapsed by default", 22, INK),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.12).next_to(pair, DOWN, buff=0.5)
        for c in changes:
            self.play(FadeIn(c, shift=RIGHT * 0.2), run_time=0.7)
            self.wait(1.56)
        self.hold(1.95)
        same = T("Same orders, same required entries, same alerts. Only the path to them changed.",
                 24, LEAN).to_edge(DOWN, buff=0.35)
        self.say('The orders, required entries and alerts are all the same. Only the path to them changed.')
        self.play(FadeOut(changes), FadeIn(same))
        self.hold(6.5)


class S4bInsideOneClick(Narrated):
    """The commit guard that runs on every Sign click, whatever the layout."""

    def body(self):
        self.say('Now look inside a single click on Sign. The interpreter checks that the role may sign, that the values are valid, that every required entry is present and confirmed, that required reviews were shown, and that every interruptive alert was acknowledged. Only then is the commit recorded.')
        head = title("Inside one click", "what the interpreter checks when a clinician clicks Sign")
        self.play(FadeIn(head))
        checks = ["role may perform this commit", "values valid (dose units match the drug)",
                  "every required entry present and confirmed", "required reviews shown or receipted",
                  "every firing interruptive alert acknowledged"]
        rows = VGroup(*[card(c, EDGE, w=7.4, h=0.62, size=22) for c in checks]).arrange(DOWN, buff=0.18)
        rows.shift(LEFT * 1.6 + DOWN * 0.4)
        self.play(LaggedStart(*[FadeIn(r, shift=UP * 0.1) for r in rows], lag_ratio=0.12))
        self.hold(1.95)
        result = card("commit recorded", LEAN, w=3.2, h=0.9, size=24).next_to(rows, RIGHT, buff=0.8)
        for r in rows:
            tick = T("✓", 30, LEAN).next_to(r, LEFT, buff=0.2)
            self.play(r[0].animate.set_stroke(LEAN), FadeIn(tick), run_time=0.6)
            self.wait(0.65)
        self.play(FadeIn(result, scale=0.9))
        self.hold(3.9)

        self.play(*[FadeOut(m) for m in self.mobjects if m is not head])
        mac_h = T("Macros can click and type, but act as a separate actor", 26).next_to(head, DOWN, buff=0.6)
        trace = VGroup(
            M("macro: enter dose        → ok, recorded unconfirmed", 22, MUTED),
            M("macro: enter pain score  → blocked: human only", 22, DANGER),
            M("human: confirm dose      → ok", 22, LEAN),
            M("human: enter pain score  → ok", 22, LEAN),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).next_to(mac_h, DOWN, buff=0.6)
        self.say('Macros can click and type, but they act as a separate actor. A value a macro enters is recorded unconfirmed, and fields reserved for a human are blocked until the clinician enters them.')
        self.play(FadeIn(mac_h))
        for line in trace:
            self.play(FadeIn(line, shift=RIGHT * 0.2), run_time=0.8)
            self.wait(1.56)
        note = VGroup(
            T("These checks live in the interpreter, not in the screens.", 26),
            T("No layout can remove them: the theorems quantify over every program.", 26, LEAN),
        ).arrange(DOWN, buff=0.15).to_edge(DOWN, buff=0.5)
        self.say('These checks live in the interpreter, not in the screens. No layout can remove them, because the theorems cover every possible program.')
        self.play(FadeIn(note))
        self.hold(6.5)


SCENES = ["S1Problem", "S2DayNight", "S3ProgramsAreData", "S3bOneNight", "S4Gate", "S4bInsideOneClick",
          "S5Proofs", "S6Review"]
