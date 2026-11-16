/** A small LRU for reusable evidence, never a recording's history. */
export class BoundedMap<K,V> extends Map<K,V> {
  constructor(readonly capacity:number) {
    super();
    if(!Number.isSafeInteger(capacity)||capacity<1)throw Error('Invalid cache capacity');
  }
  override get(key:K):V|undefined {
    const value=super.get(key);
    if(value!==undefined){super.delete(key);super.set(key,value);}
    return value;
  }
  override set(key:K,value:V):this {
    super.delete(key);super.set(key,value);
    while(this.size>this.capacity){
      const first=this.keys().next();
      if(!first.done)super.delete(first.value);
    }
    return this;
  }
}
