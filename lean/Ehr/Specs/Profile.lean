namespace Ehr.Specs

/-- Rules included in a release.
`core` keeps the hand-written workflows, headline legal rules, hospital policies,
prior auth and base alerts. `full` also includes the regulation catalog and its
value checks, time windows, order expiry and pinned displays. -/
inductive RuleProfile where
  | core
  | full
  deriving DecidableEq, Repr

/-- Use core while iterating. Set this to `.full` to restore the catalog. -/
def ruleProfile : RuleProfile := .core

end Ehr.Specs
