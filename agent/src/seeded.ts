import type { CheckResult, SeededKind } from './schema.js';

export interface SeedState {
  /** Kinds already logged as rejected in this run (by an LLM or a seeded candidate). */
  rejected: Set<SeededKind>;
}

export function rejectionKind(check: CheckResult): SeededKind | null {
  if (check.status !== 'fail') return null;
  const property=check.property, message=check.message??'';
  // Parse exact identifier slots in the native/fake checker format. Unknown
  // formats remain unclassified, so they never suppress a real seed injection.
  if(['ReviewsBeforeCommit','reviewsBeforeCommit'].includes(property??'')) {
    const info=message.split(' is not shown on ')[0];
    if(info==='allergyList')return 'allergyHidden';
  }
  if(['HumanOnlyKept','humanOnlyKept'].includes(property??'')) {
    const element=message.split(' prefills ')[1]?.split(',')[0];
    if(element==='patientIdReentry')return 'idReentryPrefilled';
  }
  if(['UnitsRight','unitsRight','units'].includes(property??'')) {
    const element=message.split(' fills ')[1]?.split(' from record value ')[0];
    if(element==='weightKg'||element==='weight')return 'lbWeightAccepted';
  }
  return null;
}
