import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Timeline, lowerBound } from './timeline.ts';
import { boxAt, contentRect } from './geometry.ts';

const items = [
  { id: 'a', start: 1000, end: 3000 },
  { id: 'b', start: 2000, end: 2500 },
  { id: 'c', start: 2500, end: 6000 },
  { id: 'd', start: 8000, end: 9000 },
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

describe('Timeline', () => {
  it('enters and exits items while moving forward', () => {
    const tl = new Timeline(items);
    assert.deepEqual(tl.update(0), { entered: [], exited: [] });
    assert.deepEqual(ids(tl.update(1000).entered), ['a']);
    assert.deepEqual(ids(tl.update(2000).entered), ['b']);
    const d = tl.update(2500);
    assert.deepEqual(ids(d.entered), ['c']);
    assert.deepEqual(ids(d.exited), ['b']);
    assert.deepEqual(ids(tl.activeItems()), ['a', 'c']);
    assert.deepEqual(ids(tl.update(3000).exited), ['a']);
    assert.deepEqual(ids(tl.update(7000).exited), ['c']);
    assert.deepEqual(ids(tl.update(8500).entered), ['d']);
  });

  it('rebuilds correctly on a backwards seek', () => {
    const tl = new Timeline(items);
    tl.update(8500);
    const d = tl.update(2200);
    assert.deepEqual(ids(d.exited), ['d']);
    assert.deepEqual(ids(d.entered), ['a', 'b']);
    assert.deepEqual(ids(tl.activeItems()), ['a', 'b']);
  });

  it('skips items that start and end inside one big jump', () => {
    const tl = new Timeline(items);
    const d = tl.update(7000);
    assert.deepEqual(ids(d.entered), []);
    assert.deepEqual(ids(tl.activeItems()), []);
  });

  it('lists upcoming items within a horizon', () => {
    const tl = new Timeline(items);
    assert.deepEqual(ids(tl.upcoming(0, 2000)), ['a', 'b']);
    assert.deepEqual(ids(tl.upcoming(2500, 10000)), ['d']);
  });

  it('lowerBound finds the first index >= value', () => {
    const arr = [1, 3, 3, 7];
    assert.equal(lowerBound(arr, 3, (x) => x), 1);
    assert.equal(lowerBound(arr, 4, (x) => x), 3);
    assert.equal(lowerBound(arr, 8, (x) => x), 4);
  });
});

describe('geometry', () => {
  it('letterboxes a 16:9 video in a square stage', () => {
    const r = contentRect(1000, 1000, 16, 9);
    assert.equal(r.width, 1000);
    assert.equal(Math.round(r.height), 563);
    assert.equal(Math.round(r.top), 219);
  });

  it('pillarboxes a 16:9 video in an ultrawide stage', () => {
    const r = contentRect(2000, 500, 16, 9);
    assert.equal(r.height, 500);
    assert.equal(Math.round(r.width), 889);
    assert.equal(Math.round(r.left), 556);
  });

  it('interpolates keyframes linearly', () => {
    const base = { x: 0, y: 0, w: 1, h: 1 };
    const kf = [
      { t: 0, box: { x: 0, y: 0, w: 1, h: 1 } },
      { t: 1000, box: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } },
    ];
    const b = boxAt(base, kf, 500);
    assert.equal(b.x, 0.25);
    assert.equal(b.w, 0.75);
    assert.equal(boxAt(base, kf, 5000).x, 0.5);
    assert.equal(boxAt(base, kf, -5).x, 0);
  });
});
