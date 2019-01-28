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
    return new Proxy(obj, new Sakota(obj)) as Proxied<T>;
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
  private diff: { $set: any; $unset: any } | null;

  /**
   * Indicates whether the proxy or any of it's children has changes.
   */
  private changed: boolean;

  /**
   * The cached result of getChanges method. Cleared when a change occurs.
   */
  private changes: { [prefix: string]: Partial<Changes> | null };

  /**
   * Initialize!
   */
  private constructor(private target: T, private parent: Sakota<any> | null = null) {
    this.kids = {};
    this.diff = null;
    this.changed = false;
    this.changes = {};
  }

  // Proxy Handler Traps
  // -------------------

  /**
   * Proxy handler trap for the `in` operator.
   */
  public has(obj: any, key: string | number | symbol): any {
    if (this.diff) {
      if (key in this.diff.$unset) {
        return false;
      }
      if (key in this.diff.$set) {
        return true;
      }
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
    if (this.diff) {
      if (key in this.diff.$unset) {
        return undefined;
      }
      if (key in this.diff.$set) {
        return this.diff.$set[key as any];
      }
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
    if (this.diff) {
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
    if (this.diff) {
      if (key in this.diff.$unset) {
        return undefined;
      }
      if (key in this.diff.$set) {
        return { configurable: true, enumerable: true, value: this.diff.$set[key] };
      }
    }
    return Object.getOwnPropertyDescriptor(obj, key);
  }

  /**
   * Proxy handler trap for setting a property.
   */
  public set(_obj: any, key: KeyType, val: any): boolean {
    if (!this.diff) {
      this.diff = { $set: {}, $unset: {} };
    }
    delete this.diff.$unset[key];
    delete this.kids[key];
    this.diff.$set[key] = val;
    this.onChange();
    return true;
  }

  /**
   * Proxy handler trap for the `delete` operator.
   */
  public deleteProperty(obj: any, key: KeyType): boolean {
    if (!(key in obj)) {
      if (!this.diff || !this.diff.$set || !(key in this.diff.$set)) {
        return true;
      }
    }
    if (!this.diff) {
      this.diff = { $set: {}, $unset: {} };
    }
    delete this.diff.$set[key];
    delete this.kids[key];
    this.diff.$unset[key] = true;
    this.onChange();
    return true;
  }

  // Sakota Methods
  // --------------

  /**
   * Returns a boolean indicating whether the proxy has any changes.
   */
  public getTarget(): T {
    return this.target;
  }

  /**
   * Returns a boolean indicating whether the proxy has any changes.
   */
  public hasChanges(pattern?: string | RegExp): boolean {
    if (!this.changed || !pattern) {
      return this.changed;
    }
    const changes = this.getChanges('', pattern);
    return Object.keys(changes).length > 0;
  }

  /**
   * Returns changes recorded by the proxy handler and child handlers.
   */
  public getChanges(prefix: string = '', pattern?: string | RegExp): Partial<Changes> {
    const cached = this.changes[prefix];
    if (cached) {
      return pattern ? this.filterChanges(cached, pattern) : cached;
    }
    const changes = this.buildChanges(prefix) as Changes;
    this.changes[prefix] = changes;
    return pattern ? this.filterChanges(changes, pattern) : changes;
  }

  // Private Methods
  // ---------------

  /**
   * Marks the proxy and all proxies in it's parent chain as changed.
   */
  private onChange(): void {
    this.changed = true;
    this.changes = {};
    if (this.parent) {
      this.parent.onChange();
    }
  }

  /**
   * Creates and returns a proxy for a nested object.
   */
  private getKid<U extends object>(key: KeyType, obj: U): U {
    const cached = this.kids[key];
    if (cached) {
      return cached;
    }
    const agent = new Sakota(obj, this);
    const proxy = (this.kids[key] = new Proxy(obj, agent));
    return proxy;
  }

  /**
   * Builds the changes object using recorded changes.
   */
  private buildChanges(prefix: string): Partial<Changes> {
    const changes: Changes = { $set: {}, $unset: {} };
    if (this.diff) {
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

  /**
   * Filters properties in the changes object by key.
   */
  private filterChanges(changes: Partial<Changes>, pattern: string | RegExp): Partial<Changes> {
    const regexp = (pattern instanceof RegExp) ? pattern : new RegExp(pattern);
    const filtered: Partial<Changes> = {};
    for (const opkey in changes) {
      if (!(changes as any)[opkey]) {
        continue;
      }
      for (const key in (changes as any)[opkey]) {
        regexp.lastIndex = 0;
        if (regexp.test(key)) {
          if (!(filtered as any)[opkey]) {
            (filtered as any)[opkey] = {};
          }
          (filtered as any)[opkey][key] = (changes as any)[opkey][key];
        }
      }
    }
    return filtered;
  }
}
