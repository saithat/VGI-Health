import type { EhrClient } from './ehr.js';
import type { ScreenChecker } from './screencheck.js';
import { InfrastructureError } from './errors.js';
import { retryInfrastructure } from './infrastructure.js';
export function retryEhr(inner:EhrClient):EhrClient {
 return {
  mode:inner.mode,binary:inner.binary,
  check:i=>retryInfrastructure('ehr:check',()=>inner.check(i),true),
  simulate:i=>retryInfrastructure('ehr:simulate',()=>inner.simulate(i),true),
  minClicks:i=>retryInfrastructure('ehr:min-clicks',()=>inner.minClicks(i),true),
  deploy:i=>retryInfrastructure('ehr:deploy',()=>inner.deploy(i),true),
  renderScreens:i=>retryInfrastructure('ehr:render-screens',()=>inner.renderScreens(i),true),
  runBatch:i=>retryInfrastructure('ehr:run-batch',()=>inner.runBatch(i),true),
  specExport:i=>retryInfrastructure('ehr:spec-export',()=>inner.specExport(i),true),
 };
}
export function retryScreens(inner:ScreenChecker):ScreenChecker {
 const geometry=inner.geometry;
 return {mode:inner.mode,...(geometry?{geometry:async i=>retryInfrastructure('screen:geometry',()=>geometry(i),true)}:{}),
  check:i=>retryInfrastructure('screen:check',async()=>{
   const result=await inner.check(i);
   if(result.status==='error')throw new InfrastructureError(result.message);
   return result;
  },true)};
}
