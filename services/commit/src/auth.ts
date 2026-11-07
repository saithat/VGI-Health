import { Fault, isObj, required, type Actor, type Config } from './types.ts';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Keys/issuer are pinned operator input. Token headers can never select a URL. */
export function authenticator(config: Config) {
  const oidc = config.oidc;
  const keys = oidc ? createRemoteJWKSet(new URL(oidc.jwksUrl ?? `${oidc.issuer}/protocol/openid-connect/certs`),
    { timeoutDuration: 5000, cooldownDuration: 1000, cacheMaxAge: 60_000 }) : undefined;
  return async (authorization?: string): Promise<Actor & { expires?: number; persona?: string; name?: string }> => {
    if (!authorization?.startsWith('Bearer ')) throw new Fault(401, 'unauthorized');
    const token = authorization.slice(7);
    if (!oidc) {
      const hash = createHash('sha256').update(token).digest();
      const actor = config.actors.find(a => a.token && timingSafeEqual(hash, createHash('sha256').update(a.token).digest()));
      if (!actor) throw new Fault(401, 'unauthorized');
      return actor;
    }
    try {
      if (!keys) throw new Error('Missing OIDC keys');
      const { payload } = await jwtVerify(token, required(keys), { issuer: oidc.issuer, audience: oidc.audience,
        algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat'] });
      if (typeof payload.sub !== 'string' || payload.typ !== 'Bearer' || payload.azp !== oidc.clientId) throw new Error('wrong token type/client');
      const provision = config.actors.find(a => a.subject === payload.sub);
      if (!provision) throw new Fault(403, 'actor_not_provisioned');
      const claims = isObj(payload.realm_access) ? payload.realm_access : undefined;
      const clinicalRole = (r: unknown): r is 'rn' | 'physician' | 'np' | 'surgeon' => r === 'rn' || r === 'physician' || r === 'np' || r === 'surgeon';
      const roles = Array.isArray(claims?.roles) ? claims.roles.filter(clinicalRole) : [];
      const bedRoles = Array.isArray(claims?.roles) ? claims.roles.flatMap(r => {
        const map: Record<string, 'chargeNurse' | 'bedManager' | 'admittingClerk'> = {
          'charge-nurse': 'chargeNurse', 'bed-manager': 'bedManager', 'admitting-clerk': 'admittingClerk' };
        return typeof r === 'string' && Object.hasOwn(map, r) ? [map[r]] : [];
      }) : [];
      if (roles.length > 1 || (!roles.length && !bedRoles.length)) throw new Fault(403, 'role_forbidden');
      const claimedUnits = Array.isArray(payload.units) ? payload.units : [];
      const units = Array.isArray(payload.units) ? provision.units?.filter(u => claimedUnits.includes(u)) ?? [] : [];
      // Both Lean identity and role come from the verified claims, not provisioning's UI metadata.
      return { ...provision, user: { id: required(payload.sub), role: roles[0] ?? bedRoles[0] }, adtRoles: bedRoles, units, expires: payload.exp,
        persona: typeof payload.persona === 'string' ? payload.persona : undefined,
        name: typeof payload.name === 'string' ? payload.name : payload.sub };
    } catch (e) { if (e instanceof Fault) throw e; throw new Fault(401, 'invalid_token'); }
  };
}
