export class InfrastructureError extends Error {}
export class ScreenInfrastructureError extends InfrastructureError {}

/** Prevent outer retry boundaries from multiplying an exhausted inner budget. */
export class InfrastructureExhaustedError extends InfrastructureError {}

/** This transport already bounded its retries; outer recording/loop retries must stop. */
export class BackendRequestError extends Error {}
