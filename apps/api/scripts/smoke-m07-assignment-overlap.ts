/**
 * Pure overlap tests for M07 Phase 2 (no Jest dependency).
 */
import { rangesOverlap } from '../src/modules/shifts/constants/shift-assignment.constants';

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// Bounded overlap
assert(rangesOverlap(d('2026-01-01'), d('2026-06-01'), d('2026-03-01'), d('2026-09-01')), 'bounded overlap');
// Boundary touch (exclusive end) — NOT overlap
assert(!rangesOverlap(d('2026-01-01'), d('2026-06-01'), d('2026-06-01'), d('2026-12-01')), 'boundary touch');
// Open-ended existing
assert(rangesOverlap(d('2026-01-01'), null, d('2026-03-01'), d('2026-04-01')), 'open existing');
// Open-ended new
assert(rangesOverlap(d('2026-01-01'), d('2026-06-01'), d('2026-05-01'), null), 'open new');
// Disjoint
assert(!rangesOverlap(d('2026-01-01'), d('2026-02-01'), d('2026-03-01'), d('2026-04-01')), 'disjoint');
// Empty range never overlaps
assert(!rangesOverlap(d('2026-01-01'), d('2026-01-01'), d('2026-01-01'), null), 'empty');

console.log(JSON.stringify({ ok: true, suite: 'shift-assignment-overlap' }));
