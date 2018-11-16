/**
 * The key used to get the handler.
 */
const GET_SAKOTA = '__sakota__';

/**
 * A dynamic type which adds the __sakota__ key to the given type.
 */
export type Proxied<T extends object> = T & { [GET_SAKOTA]: Sakota<T> };

/**
 * Changes attempted on the object are stored in a mongo query like format.
 */
export type Changes = {
  $set: { [key: string]: any };
  $unset: { [key: string]: any };
};

/**
 * Types of object keys supported in js.
 */
type KeyType = string | number | symbol;

/**
 * SaKota proxies js objects and records all changes made on an object without
 * modifying the given object. Changes made to the object will be recorded in
 * a format similar to MongoDB udpate queries.
 */
export class Sakota<T extends object> implements ProxyHandler<T> {
  /**
   * Wraps the given object with a Sakota proxy and returns it.
   */
  public static create<T extends object>(obj: T): Proxied<T> {
    return new Proxy(obj, new Sakota()) as Proxied<T>;
  }

  /**
   * A map of proxy handlers created for nested objects. These
   * will be created only when needed.
   *
   * FIXME: the type should be the following but it is not allowed
   *        private kids: { [key: KeyType]: Sakota<any> };
   */
  private kids: any;

  /**
   * An object with changes made on the proxied object.
   */
  private diff: { $set: any; $unset: any };

  /**
   * Initialize!
   */
  private constructor() {
    this.kids = {};
    this.diff = { $set: {}, $unset: {} };
  }

  // Proxy Handler Traps
  // -------------------

  /**
   * Proxy handler trap for the `in` operator.
   */
  public has(obj: any, key: string | number | symbol): any {
    if (key in this.diff.$unset) {
      return false;
    }
    if (key in this.diff.$set) {
      return true;
    }
    return key in obj;
  }

  /**
   * Proxy handler trap for getting a property.
   */
  public get(obj: any, key: KeyType): any {
    if (key === GET_SAKOTA) {
      return this;
    }
    if (key in this.diff.$unset) {
      return undefined;
    }
    if (key in this.diff.$set) {
      return this.diff.$set[key as any];
    }
    const val = obj[key];
    if (!val || typeof val !== 'object') {
      return val;
    }
    return this.getKid(key, val);
  }

  /**
   * Proxy handler trap for `Reflect.ownKeys()`.
   */
  public ownKeys(obj: any): (KeyType)[] {
    const keys = Reflect.ownKeys(obj);
    for (const key in this.diff.$set) {
      if (keys.indexOf(key) === -1) {
        keys.push(key);
      }
    }
    for (const key in this.diff.$unset) {
      const index = keys.indexOf(key);
      if (index !== -1) {
        keys.splice(index, 1);
      }
    }
    return keys;
  }

  /**
   * Proxy handler trap for `Object.getOwnPropertyDescriptor()`
   */
  public getOwnPropertyDescriptor(obj: any, key: KeyType): any {
    if (key === GET_SAKOTA) {
      return { configurable: true, enumerable: false, value: this };
    }
    if (key in this.diff.$unset) {
      return undefined;
    }
    if (key in this.diff.$set) {
      return { configurable: true, enumerable: true, value: this.diff.$set[key] };
    }
    return Object.getOwnPropertyDescriptor(obj, key);
  }

  /**
   * Proxy handler trap for setting a property.
   */
  public set(_obj: any, key: KeyType, val: any): boolean {
    delete this.diff.$unset[key];
    delete this.kids[key];
    this.diff.$set[key] = val;
    return true;
  }

  /**
   * Proxy handler trap for the `delete` operator.
   */
  public deleteProperty(obj: any, key: KeyType): boolean {
    if (!(key in obj)) {
      return true;
    }
    delete this.diff.$set[key];
    delete this.kids[key];
    this.diff.$unset[key] = true;
    return true;
  }

  // Sakota Methods
  // --------------

  /**
   * Returns changes recorded by the proxy handler and child handlers.
   */
  public getChanges(prefix: string = ''): Partial<Changes> {
    const changes: Changes = { $set: {}, $unset: {} };
    for (const key in this.diff.$set) {
      if (typeof key === 'symbol') {
        continue;
      }
      const keyWithPrefix = `${prefix}${key}`;
      changes.$set[keyWithPrefix] = this.diff.$set[key];
    }
    for (const key in this.diff.$unset) {
      if (typeof key === 'symbol') {
        continue;
      }
      const keyWithPrefix = `${prefix}${key}`;
      changes.$unset[keyWithPrefix] = true;
    }
    for (const key in this.kids) {
      if (typeof key === 'symbol') {
        continue;
      }
      const kid: Sakota<any> = this.kids[key][GET_SAKOTA];
      const keyWithPrefix = `${prefix}${key}`;
      const kidChanges: Partial<Changes> = kid.getChanges(`${keyWithPrefix}.`);
      Object.assign(changes.$set, kidChanges.$set);
      Object.assign(changes.$unset, kidChanges.$unset);
    }
    for (const key in changes) {
      if (!Object.keys((changes as any)[key]).length) {
        delete (changes as any)[key];
      }
    }
    return changes;
  }

  // Private Methods
  // ---------------

  /**
   * Creates and returns a proxy for a nested object.
   */
  private getKid<U extends object>(key: KeyType, obj: U): U {
    const cached = this.kids[key];
    if (cached) {
      return cached;
    }
    const agent = new Sakota();
    return (this.kids[key] = new Proxy(obj, agent));
  }
}
