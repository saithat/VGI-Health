import Ehr.Core.CriticalRuntime

namespace Ehr.Sem.Board
open Ehr

/-- Receiving, documenting or resolving critical results never adds a clinical commit. -/
theorem critical_handle_commits (facts user state event output)
    (h : CriticalRuntime.handle facts user state event = some output) :
    output.1.commits = state.commits := by
  unfold CriticalRuntime.handle at h
  split at h
  · dsimp only [Bind.bind, Option.bind, Pure.pure] at h
    split at h
    · simp at h
    · dsimp only at h
      repeat' split at h
      all_goals cases h; rfl
  · dsimp only [Bind.bind, Option.bind, Pure.pure] at h
    split at h
    · simp at h
    · dsimp only at h
      repeat' split at h
      all_goals cases h; rfl
  · simp_all

#print axioms critical_handle_commits
end Ehr.Sem.Board
