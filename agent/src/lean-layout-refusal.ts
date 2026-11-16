import type { ScreenCheckResult } from "../../app/src/dashboard/agent-evidence.js";
export class LeanLayoutRefusal extends Error {
  constructor(readonly result: ScreenCheckResult) {
    super(result.message);
  }
}
