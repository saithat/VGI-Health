export class InfrastructureError extends Error {}
export class ScreenInfrastructureError extends InfrastructureError {}

/** Prevent outer retry boundaries from multiplying an exhausted inner budget. */
export class InfrastructureExhaustedError extends InfrastructureError {}
