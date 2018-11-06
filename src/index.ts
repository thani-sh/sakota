/**
 * A symbol for getting the recorded change.
 */
const GET_SAKOTA = Symbol();

/**
 * Changes are stored and
 */
export type Changes = {
  $set: { [key: string]: any };
  $unset: { [key: string]: any };
};

export class Sakota<T extends object> implements ProxyHandler<T> {
  /**
   * Returns a proxy which wraps the given object.
   */
  public static create<T extends object>(obj: T): T {
    return new Proxy(obj, new Sakota());
  }

  /**
   * Returns all changes recorded by the proxy.
   */
  public static changes<T extends object>(obj: T): Partial<Changes> {
    const sakota: Sakota<T> = (obj as any)[GET_SAKOTA];
    return sakota.getChanges();
  }

  private diff: { $set: any; $unset: any };
  private kids: any;

  private constructor() {
    this.kids = {};
    this.diff = { $set: {}, $unset: {} };
  }

  /**
   * Returns whether the requested property exists.
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
   * Returns the proxied value for requested property.
   */
  public get(obj: any, key: string | number | symbol): any {
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
   * Returns an array of object's own property names.
   */
  public ownKeys(obj: any): (string | number | symbol)[] {
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
   * Returns whether the requested property exists.
   */
  public getOwnPropertyDescriptor(obj: any, key: string | number | symbol): any {
    if (key in this.diff.$unset) {
      return undefined;
    }
    if (key in this.diff.$set) {
      return { configurable: true, enumerable: true, value: this.diff.$set[key] };
    }
    return Object.getOwnPropertyDescriptor(obj, key);
  }

  /**
   * Marks a property as changed on the proxy.
   */
  public set(_obj: any, key: string | number | symbol, val: any): boolean {
    delete this.diff.$unset[key];
    delete this.kids[key];
    this.diff.$set[key] = val;
    return true;
  }

  /**
   * Marks a property as deleted on the proxy.
   */
  public deleteProperty(obj: any, key: string | number | symbol): boolean {
    if (!(key in obj)) {
      return true;
    }
    delete this.diff.$set[key];
    delete this.kids[key];
    this.diff.$unset[key] = true;
    return true;
  }

  /**
   * Returns all changes recorded by the proxy.
   */
  private getChanges(prefix: string = ''): Partial<Changes> {
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

  /**
   * Creates and returns a proxy for a nested object.
   */
  private getKid<U extends object>(key: string | number | symbol, obj: U): U {
    const cached = this.kids[key];
    if (cached) {
      return cached;
    }
    const agent = new Sakota();
    return (this.kids[key] = new Proxy(obj, agent));
  }
}
