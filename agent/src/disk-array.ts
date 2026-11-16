import { BoundedMap } from './bounded-map.js';

/** An ordinary read-only array interface over durable records. Array methods
 * and iteration keep their ordering, but only two decoded records stay warm. */
export function diskArray<K,T>(keys:readonly K[],load:(key:K)=>T):readonly T[]{
  const cache=new BoundedMap<number,T>(2),array:T[]=[];
  keys.forEach((key,index)=>Object.defineProperty(array,index,{
    enumerable:true,
    get(){
      const hit=cache.get(index);
      if(hit!==undefined)return hit;
      const value=load(key);cache.set(index,value);return value;
    },
  }));
  return Object.freeze(array);
}
