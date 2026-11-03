# Rendering proof obligations

## Density: complete program-to-screen invariance

`lean/Ehr/Render/DensityProofs.lean` proves that replacing normal/compact sizes
throughout a program preserves the interpreter view's complete ordered shown-ID
list, including parent traversal, tabs, receipts and alert firing. Tiny sizes are
retained. It also proves that changing the density side table of any `UiScreen`
preserves `Ehr.Sem.meaning` definitionally, and characterizes exact side-table
membership.

Still open: for arbitrary `p`, density assignments `f` and `g`, common spec,
facts, display, user and state, prove equality of the workspace, side, nav,
banner and modal of `renderUi sp (programWithDensity f p) ...` and
`renderUi sp (programWithDensity g p) ...`, hence equality of `meaning`.
The shown-ID theorem alone does not establish this stronger statement.

What blocks it: lifting size erasure through the full `Ctx`/`ScreenView`
(state-dependent enabled/blocked guards), `uiNest` fold, row/presentation
wrappers, generated review supplements, footer placement and dated-source
indexing needs additional congruence lemmas. No existing size-erasure relation
covers these functions. Exact native fixture and native/WASM differential tests
check complete screen equality after removing only the `compact` key; they are
regressions, not a replacement for the universal theorem. No specification or
existing theorem was changed to obtain the partial proof.
