namespace Ehr.Specs

/-- Rules included in a release.
`core` keeps the hand-written workflows, headline legal rules, hospital policies,
prior auth, base alerts and the listed catalog exceptions needed by tasks.
`full` also includes the regulation catalog and its
value checks, time windows, order expiry and pinned displays. -/
inductive RuleProfile where
  | core
  | full
  deriving DecidableEq, Repr

/-- The release uses core rules; the full catalog is an explicit opt-in. -/
def ruleProfile : RuleProfile := .core

end Ehr.Specs
