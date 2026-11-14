export interface Cost { clicks:number; scrolls:number; klmDeciSec:number; popups:number }
export interface ReportingTask extends Cost { task:string; completed:boolean }
export interface ReportingDay { day:number; persona:string; tasks:ReportingTask[]; floor:ReportingTask[] }
export interface DayPair { before:ReportingDay; after:ReportingDay }
export interface BenefitComparison {
  before:Cost; after:Cost; floor:Cost|null; saving:Cost;
  completion:{before:{tasks:number;completed:number};after:{tasks:number;completed:number}};
  paired:number; floorTasks:number;
  failures:{side:'before'|'after';day:number;task:string}[];
  missingBefore:{day:number;task:string}[]; missingAfter:{day:number;task:string}[];
  savedPct:{actions:number|null;klmDeciSec:number|null}; alertSharePct:number|null;
  effortVsFloor:{before:number|null;after:number|null}; gapCapturedPct:{actions:number|null;klmDeciSec:number|null};
}
export const costKeys: readonly (keyof Cost)[];
export function zeroCost():Cost;
export function addCost(a:Cost,b:Cost):Cost;
export function actions(m:Pick<Cost,'clicks'|'scrolls'>):number;
export function compareDays(pairs:readonly DayPair[]):BenefitComparison;
