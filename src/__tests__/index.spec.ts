import { Sakota } from '../';

describe('Sakota', () => {
  describe('without changes', () => {
    it('should not change any existing values', () => {
      const object = {
        a: undefined,
        b: null,
        c: true,
        d: false,
        e: 12345,
        f: 'abcd',
        g: { a: 1, b: { c: 2 } },
        h: [1, 2, 3, 4],
      };
      const target = Sakota.create(object);
      expect(target).toEqual({
        a: undefined,
        b: null,
        c: true,
        d: false,
        e: 12345,
        f: 'abcd',
        g: { a: 1, b: { c: 2 } },
        h: [1, 2, 3, 4],
      });
    });
  });

  describe('set a new property', () => {
    describe('set a value on level 0', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        target.i = 'new-property';
      });

      it('should reflect the change', () => {
        expect('i' in target).toBe(true);
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
          i: 'new-property',
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $set: { i: 'new-property' },
        });
      });
    });

    describe('set a value on level 1', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        target.g.i = 'new-property';
      });

      it('should reflect the change', () => {
        expect('i' in target.g).toBe(true);
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 }, i: 'new-property' },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $set: { 'g.i': 'new-property' },
        });
      });
    });

    describe('set a value on level 2', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        target.g.b.i = 'new-property';
      });

      it('should reflect the change', () => {
        expect('i' in target.g.b).toBe(true);
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2, i: 'new-property' } },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $set: { 'g.b.i': 'new-property' },
        });
      });
    });
  });

  describe('change a property', () => {
    describe('set a value on level 0', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        target.e = 67890;
      });

      it('should reflect the change', () => {
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 67890,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $set: { e: 67890 },
        });
      });
    });

    describe('set a value on level 1', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        target.g.a = 67890;
      });

      it('should reflect the change', () => {
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 67890, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $set: { 'g.a': 67890 },
        });
      });
    });

    describe('set a value on level 2', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        target.g.b.c = 67890;
      });

      it('should reflect the change', () => {
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 67890 } },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $set: { 'g.b.c': 67890 },
        });
      });
    });
  });

  describe('delete a property', () => {
    describe('delete a value on level 0', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        delete target.e;
      });

      it('should reflect the change', () => {
        expect('e' in target).toBe(false);
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $unset: { e: true },
        });
      });
    });

    describe('delete a value on level 1', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        delete target.g.a;
      });

      it('should reflect the change', () => {
        expect('g.a' in target).toBe(false);
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $unset: { 'g.a': true },
        });
      });
    });

    describe('delete a value on level 2', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        delete target.g.b.c;
      });

      it('should reflect the change', () => {
        expect('g.b.c' in target).toBe(false);
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: {} },
          h: [1, 2, 3, 4],
        });
      });

      it('should record the change', () => {
        expect(Sakota.changes(target)).toEqual({
          $unset: { 'g.b.c': true },
        });
      });
    });

    describe('delete an unknown property', () => {
      let target: any;

      beforeEach(() => {
        target = Sakota.create({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
        delete target.x;
      });

      it('should not change the object', () => {
        expect(target).toEqual({
          a: undefined,
          b: null,
          c: true,
          d: false,
          e: 12345,
          f: 'abcd',
          g: { a: 1, b: { c: 2 } },
          h: [1, 2, 3, 4],
        });
      });

      it('should not record the change', () => {
        expect(Sakota.changes(target)).toEqual({});
      });
    });
  });
});
