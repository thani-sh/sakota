import { Sakota } from '../';

/**
 * Function returns an array of different types of values.
 */
export const values = () => [
  undefined,
  null,
  false,
  true,
  100,
  'asd',
  {},
  [],
  { a: 'b' },
  { a: 'b', c: { d: 'e' } },
  () => null,
  class {},
];

/**
 * Proxies the object to throw when attempted to modify.
 */
export function freeze<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get: (o, p: keyof T): any => {
      const val = o[p];
      if (val && typeof val === 'object') {
        return freeze(val as any);
      }
      return val;
    },
    set: () => fail() as any,
  });
}

/**
 * The main unit test block
 */
describe('Sakota', () => {
  [
    // setting a new value with an empty target
    // ----------------------------------------
    ...values().map(val => () => ({
      target: {},
      action: (obj: any) => {
        obj.x = val;
      },
      result: { x: val },
      change: {
        $set: { x: val },
      },
    })),

    // setting a new value when the target is not empty
    // ------------------------------------------------
    ...values().map(val => () => ({
      target: { a: 1, b: 2 },
      action: (obj: any) => {
        obj.x = val;
      },
      result: { a: 1, b: 2, x: val },
      change: {
        $set: { x: val },
      },
    })),

    // modifying an existing value
    // ---------------------------
    ...values().map(val => () => ({
      target: { a: 1, b: 2 },
      action: (obj: any) => {
        obj.a = val;
      },
      result: { a: val, b: 2 },
      change: {
        $set: { a: val },
      },
    })),

    // deleting an existing property
    // -----------------------------
    ...values().map(val => () => ({
      target: { a: 1, b: val },
      action: (obj: any) => {
        delete obj.b;
      },
      result: { a: 1 },
      change: {
        $unset: { b: true },
      },
    })),

    // deleting a missing property
    // ---------------------------
    () => ({
      target: { a: 1 },
      action: (obj: any) => {
        delete obj.x;
      },
      result: { a: 1 },
      change: {},
    }),

    // setting a new value in a nested object
    // --------------------------------------
    ...values().map(val => () => ({
      target: { a: { b: 1 }, c: { d: { e: 2 } } },
      action: (obj: any) => {
        obj.a.x = val;
        obj.c.d.y = val;
      },
      result: { a: { b: 1, x: val }, c: { d: { e: 2, y: val } } },
      change: {
        $set: { 'a.x': val, 'c.d.y': val },
      },
    })),

    // modifying an existing value in a nested object
    // ----------------------------------------------
    ...values().map(val => () => ({
      target: { a: { b: 1 }, c: { d: { e: 2 } } },
      action: (obj: any) => {
        obj.a.b = val;
        obj.c.d.e = val;
      },
      result: { a: { b: val }, c: { d: { e: val } } },
      change: {
        $set: { 'a.b': val, 'c.d.e': val },
      },
    })),

    // deleting an existing value in a nested object
    // ---------------------------------------------
    ...values().map(val => () => ({
      target: { a: { b: val }, c: { d: { e: val } } },
      action: (obj: any) => {
        delete obj.a.b;
        delete obj.c.d.e;
      },
      result: { a: {}, c: { d: {} } },
      change: {
        $unset: { 'a.b': true, 'c.d.e': true },
      },
    })),

    // deleting a missing property in a nested object
    // ----------------------------------------------
    () => ({
      target: { a: { b: 1 }, c: { d: { e: 2 } } },
      action: (obj: any) => {
        delete obj.a.x;
        delete obj.c.d.y;
      },
      result: { a: { b: 1 }, c: { d: { e: 2 } } },
      change: {},
    }),
  ].forEach(f => {
    let c: any;

    beforeEach(() => {
      c = f();
    });

    it('should apply the change on the proxy', () => {
      const proxy = Sakota.create(c.target);
      c.action(proxy);
      expect(proxy).toEqual(c.result as any);
    });

    it('should record all applied changes', () => {
      const proxy = Sakota.create(c.target);
      c.action(proxy);
      expect(proxy.__sakota__.getChanges()).toEqual(c.change);
    });

    it('should not modify the proxy target', () => {
      const proxy = Sakota.create(freeze(c.target));
      c.action(proxy);
    });
  });
});
