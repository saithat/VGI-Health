/** Local structural FHIR R4 subset used by imports and read projections.
 * These wire types do not validate FHIR conformance or clinical rules.
 * Unconsumed imported fields remain intact in the stored JSON. */
export interface CodeableConcept {
  id?: string;
  extension?: Extension[];
  coding?: Coding[];
  text?: string;
}
export interface Quantity {
  id?: string;
  extension?: Extension[];
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}
export interface Reference<T extends Resource = Resource> {
  id?: string;
  extension?: Extension[];
  reference?: string;
  type?: ResourceType;
  identifier?: Identifier;
  display?: string;
  resource?: T;
}
export interface BundleEntry<T extends Resource = Resource> {
  id?: string;
  extension?: Extension[];
  fullUrl?: string;
  resource?: T;
  search?: BundleEntrySearch;
  request?: BundleEntryRequest;
  response?: BundleEntryResponse;
}
export interface Timing {
  id?: string;
  extension?: Extension[];
  event?: string[];
  repeat?: TimingRepeat;
  code?: CodeableConcept;
}
export interface Patient {
  readonly resourceType: "Patient";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  active?: boolean;
  name?: HumanName[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  address?: Address[];
  photo?: Attachment[];
  communication?: PatientCommunication[];
  generalPractitioner?: Reference[];
}
export interface Encounter {
  readonly resourceType: "Encounter";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status:
    | "planned"
    | "arrived"
    | "triaged"
    | "in-progress"
    | "onleave"
    | "finished"
    | "cancelled"
    | "entered-in-error"
    | "unknown";
  class: Coding;
  type?: CodeableConcept[];
  serviceType?: CodeableConcept;
  priority?: CodeableConcept;
  subject?: Reference;
  basedOn?: Reference[];
  participant?: EncounterParticipant[];
  period?: Period;
  length?: Duration;
  reasonCode?: CodeableConcept[];
  diagnosis?: EncounterDiagnosis[];
  hospitalization?: EncounterHospitalization;
  location?: EncounterLocation[];
  serviceProvider?: Reference;
  partOf?: Reference;
}
export interface Location {
  readonly resourceType: "Location";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status?: "active" | "suspended" | "inactive";
  operationalStatus?: Coding;
  name?: string;
  description?: string;
  mode?: "instance" | "kind";
  type?: CodeableConcept[];
  address?: Address;
  physicalType?: CodeableConcept;
  position?: LocationPosition;
  partOf?: Reference;
}
export interface Practitioner {
  readonly resourceType: "Practitioner";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  active?: boolean;
  name?: HumanName[];
  address?: Address[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  photo?: Attachment[];
  qualification?: PractitionerQualification[];
  communication?: CodeableConcept[];
}
export interface MedicationRequest {
  readonly resourceType: "MedicationRequest";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status:
    | "active"
    | "on-hold"
    | "cancelled"
    | "completed"
    | "entered-in-error"
    | "stopped"
    | "draft"
    | "unknown";
  statusReason?: CodeableConcept;
  intent:
    | "proposal"
    | "plan"
    | "order"
    | "original-order"
    | "reflex-order"
    | "filler-order"
    | "instance-order"
    | "option";
  category?: CodeableConcept[];
  priority?: "routine" | "urgent" | "asap" | "stat";
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject: Reference;
  encounter?: Reference;
  authoredOn?: string;
  requester?: Reference;
  performer?: Reference;
  performerType?: CodeableConcept;
  recorder?: Reference;
  reasonCode?: CodeableConcept[];
  basedOn?: Reference[];
  note?: Annotation[];
  dosageInstruction?: Dosage[];
  dispenseRequest?: MedicationRequestDispenseRequest;
  substitution?: MedicationRequestSubstitution;
  priorPrescription?: Reference;
}
export interface MedicationAdministration {
  readonly resourceType: "MedicationAdministration";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  partOf?: Reference[];
  status:
    | "in-progress"
    | "not-done"
    | "on-hold"
    | "completed"
    | "entered-in-error"
    | "stopped"
    | "unknown";
  statusReason?: CodeableConcept[];
  category?: CodeableConcept;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject: Reference;
  context?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  performer?: MedicationAdministrationPerformer[];
  reasonCode?: CodeableConcept[];
  request?: Reference;
  note?: Annotation[];
  dosage?: MedicationAdministrationDosage;
}
export interface MedicationStatement {
  readonly resourceType: "MedicationStatement";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    | "active"
    | "completed"
    | "entered-in-error"
    | "intended"
    | "stopped"
    | "on-hold"
    | "unknown"
    | "not-taken";
  statusReason?: CodeableConcept[];
  category?: CodeableConcept;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject: Reference;
  context?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  reasonCode?: CodeableConcept[];
  note?: Annotation[];
  dosage?: Dosage[];
}
export interface MedicationDispense {
  readonly resourceType: "MedicationDispense";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  partOf?: Reference[];
  status:
    | "preparation"
    | "in-progress"
    | "cancelled"
    | "on-hold"
    | "completed"
    | "entered-in-error"
    | "stopped"
    | "declined"
    | "unknown";
  category?: CodeableConcept;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject?: Reference;
  context?: Reference;
  performer?: MedicationDispensePerformer[];
  location?: Reference;
  type?: CodeableConcept;
  quantity?: Quantity;
  note?: Annotation[];
  dosageInstruction?: Dosage[];
  substitution?: MedicationDispenseSubstitution;
}
export interface AllergyIntolerance {
  readonly resourceType: "AllergyIntolerance";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  clinicalStatus?: CodeableConcept;
  type?: "allergy" | "intolerance";
  category?: ("food" | "medication" | "environment" | "biologic")[];
  criticality?: "low" | "high" | "unable-to-assess";
  code?: CodeableConcept;
  patient: Reference;
  encounter?: Reference;
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: Reference;
  note?: Annotation[];
  reaction?: AllergyIntoleranceReaction[];
}
export interface Observation {
  readonly resourceType: "Observation";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    | "registered"
    | "preliminary"
    | "final"
    | "amended"
    | "corrected"
    | "cancelled"
    | "entered-in-error"
    | "unknown";
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  focus?: Reference[];
  encounter?: Reference;
  effectiveDateTime?: string;
  issued?: string;
  effectivePeriod?: Period;
  performer?: Reference[];
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  interpretation?: CodeableConcept[];
  note?: Annotation[];
  method?: CodeableConcept;
  referenceRange?: ObservationReferenceRange[];
  component?: ObservationComponent[];
}
export interface Condition {
  readonly resourceType: "Condition";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  clinicalStatus?: CodeableConcept;
  category?: CodeableConcept[];
  severity?: CodeableConcept;
  code?: CodeableConcept;
  subject: Reference;
  encounter?: Reference;
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: Reference;
  evidence?: ConditionEvidence[];
  note?: Annotation[];
}
export interface Immunization {
  readonly resourceType: "Immunization";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status: "completed" | "entered-in-error" | "not-done";
  statusReason?: CodeableConcept;
  vaccineCode: CodeableConcept;
  patient: Reference;
  encounter?: Reference;
  occurrenceDateTime?: string;
  recorded?: string;
  primarySource?: boolean;
  location?: Reference;
  manufacturer?: Reference;
  lotNumber?: string;
  site?: CodeableConcept;
  route?: CodeableConcept;
  doseQuantity?: Quantity;
  performer?: ImmunizationPerformer[];
  note?: Annotation[];
  reasonCode?: CodeableConcept[];
  education?: ImmunizationEducation[];
  reaction?: ImmunizationReaction[];
}
export interface Appointment {
  readonly resourceType: "Appointment";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status:
    | "proposed"
    | "pending"
    | "booked"
    | "arrived"
    | "fulfilled"
    | "cancelled"
    | "noshow"
    | "entered-in-error"
    | "checked-in"
    | "waitlist";
  serviceType?: CodeableConcept[];
  reasonCode?: CodeableConcept[];
  priority?: number;
  description?: string;
  start?: string;
  end?: string;
  slot?: Reference[];
  patientInstruction?: string;
  basedOn?: Reference[];
  participant: AppointmentParticipant[];
}
export interface ServiceRequest {
  readonly resourceType: "ServiceRequest";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  status:
    | "draft"
    | "active"
    | "on-hold"
    | "revoked"
    | "completed"
    | "entered-in-error"
    | "unknown";
  intent:
    | "proposal"
    | "plan"
    | "directive"
    | "order"
    | "original-order"
    | "reflex-order"
    | "filler-order"
    | "instance-order"
    | "option";
  category?: CodeableConcept[];
  priority?: "routine" | "urgent" | "asap" | "stat";
  code?: CodeableConcept;
  subject: Reference;
  encounter?: Reference;
  occurrenceDateTime?: string;
  occurrencePeriod?: Period;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: CodeableConcept;
  authoredOn?: string;
  requester?: Reference;
  performerType?: CodeableConcept;
  performer?: Reference[];
  reasonCode?: CodeableConcept[];
  note?: Annotation[];
  patientInstruction?: string;
}
export interface Coverage {
  readonly resourceType: "Coverage";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status: "active" | "cancelled" | "draft" | "entered-in-error";
  type?: CodeableConcept;
  period?: Period;
  payor: Reference[];
  class?: CoverageClass[];
  order?: number;
}
export interface Task {
  readonly resourceType: "Task";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    | "draft"
    | "requested"
    | "received"
    | "accepted"
    | "rejected"
    | "ready"
    | "cancelled"
    | "in-progress"
    | "on-hold"
    | "failed"
    | "completed"
    | "entered-in-error";
  statusReason?: CodeableConcept;
  businessStatus?: CodeableConcept;
  intent:
    | "unknown"
    | "proposal"
    | "plan"
    | "order"
    | "original-order"
    | "reflex-order"
    | "filler-order"
    | "instance-order"
    | "option";
  priority?: "routine" | "urgent" | "asap" | "stat";
  code?: CodeableConcept;
  description?: string;
  focus?: Reference;
  for?: Reference;
  encounter?: Reference;
  executionPeriod?: Period;
  authoredOn?: string;
  requester?: Reference;
  performerType?: CodeableConcept[];
  owner?: Reference;
  location?: Reference;
  reasonCode?: CodeableConcept;
  note?: Annotation[];
  input?: TaskInput[];
  output?: TaskOutput[];
}
export interface Communication {
  readonly resourceType: "Communication";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    | "preparation"
    | "in-progress"
    | "not-done"
    | "on-hold"
    | "stopped"
    | "completed"
    | "entered-in-error"
    | "unknown";
  statusReason?: CodeableConcept;
  category?: CodeableConcept[];
  priority?: "routine" | "urgent" | "asap" | "stat";
  subject?: Reference;
  encounter?: Reference;
  sent?: string;
  recipient?: Reference[];
  sender?: Reference;
  reasonCode?: CodeableConcept[];
  payload?: CommunicationPayload[];
  note?: Annotation[];
}
export interface Consent {
  readonly resourceType: "Consent";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status:
    | "draft"
    | "proposed"
    | "active"
    | "rejected"
    | "inactive"
    | "entered-in-error";
  scope: CodeableConcept;
  category: CodeableConcept[];
  patient?: Reference;
  dateTime?: string;
  performer?: Reference[];
  sourceAttachment?: Attachment;
  policy?: ConsentPolicy[];
  policyRule?: CodeableConcept;
  verification?: ConsentVerification[];
  provision?: ConsentProvision;
}
export interface ChargeItem {
  readonly resourceType: "ChargeItem";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status:
    | "planned"
    | "billable"
    | "not-billable"
    | "aborted"
    | "billed"
    | "entered-in-error"
    | "unknown";
  partOf?: Reference[];
  code: CodeableConcept;
  subject: Reference;
  context?: Reference;
  occurrenceDateTime?: string;
  occurrencePeriod?: Period;
  performer?: ChargeItemPerformer[];
  quantity?: Quantity;
  enterer?: Reference;
  reason?: CodeableConcept[];
  service?: Reference[];
  note?: Annotation[];
}
export interface DocumentReference {
  readonly resourceType: "DocumentReference";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status: "current" | "superseded" | "entered-in-error";
  docStatus?: "preliminary" | "final" | "amended" | "entered-in-error";
  type?: CodeableConcept;
  category?: CodeableConcept[];
  subject?: Reference;
  date?: string;
  author?: Reference[];
  authenticator?: Reference;
  description?: string;
  content: DocumentReferenceContent[];
  context?: DocumentReferenceContext;
}
export interface Procedure {
  readonly resourceType: "Procedure";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    | "preparation"
    | "in-progress"
    | "not-done"
    | "on-hold"
    | "stopped"
    | "completed"
    | "entered-in-error"
    | "unknown";
  statusReason?: CodeableConcept;
  category?: CodeableConcept;
  code?: CodeableConcept;
  subject: Reference;
  encounter?: Reference;
  performedDateTime?: string;
  performedPeriod?: Period;
  recorder?: Reference;
  performer?: ProcedurePerformer[];
  location?: Reference;
  reasonCode?: CodeableConcept[];
  outcome?: CodeableConcept;
  note?: Annotation[];
}
export interface DiagnosticReport {
  readonly resourceType: "DiagnosticReport";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  status:
    | "registered"
    | "partial"
    | "preliminary"
    | "final"
    | "amended"
    | "corrected"
    | "appended"
    | "cancelled"
    | "entered-in-error"
    | "unknown";
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  performer?: Reference[];
  result?: Reference[];
}
export interface List {
  readonly resourceType: "List";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status: "current" | "retired" | "entered-in-error";
  mode: "working" | "snapshot" | "changes";
  title?: string;
  code?: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  date?: string;
  source?: Reference;
  note?: Annotation[];
  entry?: ListEntry[];
}
export interface Organization {
  readonly resourceType: "Organization";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  active?: boolean;
  type?: CodeableConcept[];
  name?: string;
  address?: Address[];
  partOf?: Reference;
}
export interface PractitionerRole {
  readonly resourceType: "PractitionerRole";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  active?: boolean;
  period?: Period;
  practitioner?: Reference;
  code?: CodeableConcept[];
  location?: Reference[];
}
export interface FamilyMemberHistory {
  readonly resourceType: "FamilyMemberHistory";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  status: "partial" | "completed" | "entered-in-error" | "health-unknown";
  patient: Reference;
  date?: string;
  name?: string;
  sex?: CodeableConcept;
  reasonCode?: CodeableConcept[];
  note?: Annotation[];
  condition?: FamilyMemberHistoryCondition[];
}
export interface ImmunizationRecommendation {
  readonly resourceType: "ImmunizationRecommendation";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  patient: Reference;
  date: string;
}
export interface QuestionnaireResponse {
  readonly resourceType: "QuestionnaireResponse";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier;
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    "in-progress" | "completed" | "amended" | "entered-in-error" | "stopped";
  subject?: Reference;
  encounter?: Reference;
  author?: Reference;
  source?: Reference;
}
export interface CarePlan {
  readonly resourceType: "CarePlan";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier[];
  basedOn?: Reference[];
  partOf?: Reference[];
  status:
    | "draft"
    | "active"
    | "on-hold"
    | "revoked"
    | "completed"
    | "entered-in-error"
    | "unknown";
  intent: "proposal" | "plan" | "order" | "option";
  category?: CodeableConcept[];
  title?: string;
  description?: string;
  subject: Reference;
  encounter?: Reference;
  period?: Period;
  author?: Reference;
  activity?: CarePlanActivity[];
  note?: Annotation[];
}
export interface Provenance {
  readonly resourceType: "Provenance";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  target: Reference[];
  recorded: string;
  policy?: string[];
  location?: Reference;
  reason?: CodeableConcept[];
  activity?: CodeableConcept;
  agent: ProvenanceAgent[];
}
export interface Composition {
  readonly resourceType: "Composition";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  identifier?: Identifier;
  status: "preliminary" | "final" | "amended" | "entered-in-error";
  type: CodeableConcept;
  category?: CodeableConcept[];
  subject?: Reference;
  encounter?: Reference;
  date: string;
  author: Reference[];
  title: string;
  event?: CompositionEvent[];
  section?: CompositionSection[];
}
export interface Bundle<T extends Resource = Resource> {
  readonly resourceType: "Bundle";
  id?: string;
  meta?: Meta;
  language?: string;
  identifier?: Identifier;
  type:
    | "document"
    | "message"
    | "transaction"
    | "transaction-response"
    | "batch"
    | "batch-response"
    | "history"
    | "searchset"
    | "collection";
  timestamp?: string;
  total?: number;
  entry?: BundleEntry<T>[];
}
export interface Extension {
  id?: string;
  extension?: Extension[];
  url: string;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  valueQuantity?: Quantity;
  valueReference?: Reference;
}
export interface Coding {
  id?: string;
  extension?: Extension[];
  system?: string;
  version?: string;
  code?: string;
  display?: string;
}
export interface Identifier {
  id?: string;
  extension?: Extension[];
  use?: "usual" | "official" | "temp" | "secondary" | "old";
  type?: CodeableConcept;
  system?: string;
  value?: string;
  period?: Period;
}
export interface BundleEntrySearch {
  id?: string;
  extension?: Extension[];
  mode?: "match" | "include" | "outcome";
}
export interface BundleEntryRequest {
  id?: string;
  extension?: Extension[];
  method: "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  ifMatch?: string;
}
export interface BundleEntryResponse {
  id?: string;
  extension?: Extension[];
  status: string;
  location?: string;
  etag?: string;
  outcome?: OperationOutcome;
}
export interface TimingRepeat {
  id?: string;
  extension?: Extension[];
  boundsPeriod?: Period;
  count?: number;
  duration?: number;
  frequency?: number;
  period?: number;
  periodUnit?: "s" | "min" | "h" | "d" | "wk" | "mo" | "a";
  dayOfWeek?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
  timeOfDay?: string[];
  when?: (
    | "MORN"
    | "MORN.early"
    | "MORN.late"
    | "NOON"
    | "AFT"
    | "AFT.early"
    | "AFT.late"
    | "EVE"
    | "EVE.early"
    | "EVE.late"
    | "NIGHT"
    | "PHS"
    | "HS"
    | "WAKE"
    | "C"
    | "CM"
    | "CD"
    | "CV"
    | "AC"
    | "ACM"
    | "ACD"
    | "ACV"
    | "PC"
    | "PCM"
    | "PCD"
    | "PCV"
  )[];
}
export interface Meta {
  id?: string;
  extension?: Extension[];
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  tag?: Coding[];
  author?: Reference;
}
export interface Narrative {
  id?: string;
  extension?: Extension[];
  status: "generated" | "extensions" | "additional" | "empty";
}
export interface HumanName {
  id?: string;
  extension?: Extension[];
  use?:
    "usual" | "official" | "temp" | "nickname" | "anonymous" | "old" | "maiden";
  text?: string;
  family?: string;
  given?: string[];
  period?: Period;
}
export interface Address {
  id?: string;
  extension?: Extension[];
  use?: "home" | "work" | "temp" | "old" | "billing";
  type?: "postal" | "physical" | "both";
  text?: string;
  state?: string;
  period?: Period;
}
export interface Attachment {
  id?: string;
  extension?: Extension[];
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}
export interface PatientCommunication {
  id?: string;
  extension?: Extension[];
  language: CodeableConcept;
  preferred?: boolean;
}
export interface EncounterParticipant {
  id?: string;
  extension?: Extension[];
  type?: CodeableConcept[];
  period?: Period;
  individual?: Reference;
}
export interface Period {
  id?: string;
  extension?: Extension[];
  start?: string;
  end?: string;
}
export interface Duration {
  id?: string;
  extension?: Extension[];
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}
export interface EncounterDiagnosis {
  id?: string;
  extension?: Extension[];
  condition: Reference;
  use?: CodeableConcept;
}
export interface EncounterHospitalization {
  id?: string;
  extension?: Extension[];
  origin?: Reference;
  admitSource?: CodeableConcept;
  dischargeDisposition?: CodeableConcept;
}
export interface EncounterLocation {
  id?: string;
  extension?: Extension[];
  location: Reference;
  status?: "planned" | "active" | "reserved" | "completed";
  physicalType?: CodeableConcept;
  period?: Period;
}
export interface LocationPosition {
  id?: string;
  extension?: Extension[];
}
export interface PractitionerQualification {
  id?: string;
  extension?: Extension[];
  identifier?: Identifier[];
  code: CodeableConcept;
  period?: Period;
}
export interface Annotation {
  id?: string;
  extension?: Extension[];
  time?: string;
  text: string;
}
export interface Dosage {
  id?: string;
  extension?: Extension[];
  text?: string;
  patientInstruction?: string;
  timing?: Timing;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: CodeableConcept;
  site?: CodeableConcept;
  route?: CodeableConcept;
  method?: CodeableConcept;
  doseAndRate?: DosageDoseAndRate[];
}
export interface MedicationRequestDispenseRequest {
  id?: string;
  extension?: Extension[];
  numberOfRepeatsAllowed?: number;
  quantity?: Quantity;
  expectedSupplyDuration?: Duration;
  performer?: Reference;
}
export interface MedicationRequestSubstitution {
  id?: string;
  extension?: Extension[];
  allowedBoolean?: boolean;
  reason?: CodeableConcept;
}
export interface MedicationAdministrationPerformer {
  id?: string;
  extension?: Extension[];
  function?: CodeableConcept;
  actor: Reference;
}
export interface MedicationAdministrationDosage {
  id?: string;
  extension?: Extension[];
  text?: string;
  site?: CodeableConcept;
  route?: CodeableConcept;
  method?: CodeableConcept;
  dose?: Quantity;
}
export interface MedicationDispensePerformer {
  id?: string;
  extension?: Extension[];
  function?: CodeableConcept;
  actor: Reference;
}
export interface MedicationDispenseSubstitution {
  id?: string;
  extension?: Extension[];
  type?: CodeableConcept;
  reason?: CodeableConcept[];
}
export interface Range {
  id?: string;
  extension?: Extension[];
  low?: Quantity;
  high?: Quantity;
}
export interface AllergyIntoleranceReaction {
  id?: string;
  extension?: Extension[];
  manifestation: CodeableConcept[];
  description?: string;
  severity?: "mild" | "moderate" | "severe";
  note?: Annotation[];
}
export interface ObservationReferenceRange {
  id?: string;
  extension?: Extension[];
  low?: Quantity;
  high?: Quantity;
  type?: CodeableConcept;
  age?: Range;
  text?: string;
}
export interface ObservationComponent {
  id?: string;
  extension?: Extension[];
  code: CodeableConcept;
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  interpretation?: CodeableConcept[];
  referenceRange?: ObservationReferenceRange[];
}
export interface ConditionEvidence {
  id?: string;
  extension?: Extension[];
  code?: CodeableConcept[];
  detail?: Reference[];
}
export interface ImmunizationPerformer {
  id?: string;
  extension?: Extension[];
  function?: CodeableConcept;
  actor: Reference;
}
export interface ImmunizationEducation {
  id?: string;
  extension?: Extension[];
  documentType?: string;
  reference?: string;
  publicationDate?: string;
  presentationDate?: string;
}
export interface ImmunizationReaction {
  id?: string;
  extension?: Extension[];
  date?: string;
  detail?: Reference;
}
export interface AppointmentParticipant {
  id?: string;
  extension?: Extension[];
  type?: CodeableConcept[];
  actor?: Reference;
  required?: "required" | "optional" | "information-only";
  status: "accepted" | "declined" | "tentative" | "needs-action";
  period?: Period;
}
export interface CoverageClass {
  id?: string;
  extension?: Extension[];
  type: CodeableConcept;
  value: string;
  name?: string;
}
export interface TaskInput {
  id?: string;
  extension?: Extension[];
  type: CodeableConcept;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  valueQuantity?: Quantity;
  valueReference?: Reference;
}
export interface TaskOutput {
  id?: string;
  extension?: Extension[];
  type: CodeableConcept;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  valueQuantity?: Quantity;
  valueReference?: Reference;
}
export interface CommunicationPayload {
  id?: string;
  extension?: Extension[];
  contentString?: string;
}
export interface ConsentPolicy {
  id?: string;
  extension?: Extension[];
}
export interface ConsentVerification {
  id?: string;
  extension?: Extension[];
  verified: boolean;
  verifiedWith?: Reference;
  verificationDate?: string;
}
export interface ConsentProvision {
  id?: string;
  extension?: Extension[];
  type?: "deny" | "permit";
  period?: Period;
  actor?: ConsentProvisionActor[];
  action?: CodeableConcept[];
  class?: Coding[];
  code?: CodeableConcept[];
  data?: ConsentProvisionData[];
  provision?: ConsentProvision[];
}
export interface ChargeItemPerformer {
  id?: string;
  extension?: Extension[];
  function?: CodeableConcept;
  actor: Reference;
}
export interface DocumentReferenceContent {
  id?: string;
  extension?: Extension[];
  attachment: Attachment;
  format?: Coding;
}
export interface DocumentReferenceContext {
  id?: string;
  extension?: Extension[];
  encounter?: Reference[];
  event?: CodeableConcept[];
  period?: Period;
}
export interface ProcedurePerformer {
  id?: string;
  extension?: Extension[];
  function?: CodeableConcept;
  actor: Reference;
}
export interface ListEntry {
  id?: string;
  extension?: Extension[];
  flag?: CodeableConcept;
  date?: string;
}
export interface FamilyMemberHistoryCondition {
  id?: string;
  extension?: Extension[];
  code: CodeableConcept;
  outcome?: CodeableConcept;
  note?: Annotation[];
}
export interface CarePlanActivity {
  id?: string;
  extension?: Extension[];
  reference?: Reference;
  detail?: CarePlanActivityDetail;
}
export interface ProvenanceAgent {
  id?: string;
  extension?: Extension[];
  type?: CodeableConcept;
  role?: CodeableConcept[];
  who: Reference;
}
export interface CompositionEvent {
  id?: string;
  extension?: Extension[];
  code?: CodeableConcept[];
  period?: Period;
  detail?: Reference[];
}
export interface CompositionSection {
  id?: string;
  extension?: Extension[];
  title?: string;
  code?: CodeableConcept;
  author?: Reference[];
  focus?: Reference;
  text?: Narrative;
  mode?: "working" | "snapshot" | "changes";
  entry?: Reference[];
  section?: CompositionSection[];
}
export interface OperationOutcome {
  readonly resourceType: "OperationOutcome";
  id?: string;
  meta?: Meta;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
}
export interface DosageDoseAndRate {
  id?: string;
  extension?: Extension[];
  type?: CodeableConcept;
  doseQuantity?: Quantity;
}
export interface ConsentProvisionActor {
  id?: string;
  extension?: Extension[];
  role: CodeableConcept;
  reference: Reference;
}
export interface ConsentProvisionData {
  id?: string;
  extension?: Extension[];
  reference: Reference;
}
export interface CarePlanActivityDetail {
  id?: string;
  extension?: Extension[];
  kind?:
    | "Appointment"
    | "CommunicationRequest"
    | "DeviceRequest"
    | "MedicationRequest"
    | "NutritionOrder"
    | "Task"
    | "ServiceRequest"
    | "VisionPrescription";
  code?: CodeableConcept;
  reasonCode?: CodeableConcept[];
  status:
    | "not-started"
    | "scheduled"
    | "in-progress"
    | "on-hold"
    | "completed"
    | "cancelled"
    | "stopped"
    | "unknown"
    | "entered-in-error";
  statusReason?: CodeableConcept;
  location?: Reference;
  performer?: Reference[];
  quantity?: Quantity;
  description?: string;
}
export type Resource =
  | Patient
  | Encounter
  | Location
  | Practitioner
  | MedicationRequest
  | MedicationAdministration
  | MedicationStatement
  | MedicationDispense
  | AllergyIntolerance
  | Observation
  | Condition
  | Immunization
  | Appointment
  | ServiceRequest
  | Coverage
  | Task
  | Communication
  | Consent
  | ChargeItem
  | DocumentReference
  | Procedure
  | DiagnosticReport
  | List
  | Organization
  | PractitionerRole
  | FamilyMemberHistory
  | ImmunizationRecommendation
  | QuestionnaireResponse
  | CarePlan
  | Provenance
  | Composition
  | Bundle;
export type ResourceType = Resource["resourceType"];
