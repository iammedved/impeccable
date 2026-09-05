import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('skill reference authoring contracts', () => {
  it('keeps decision origin, command boundaries, and specialist authority explicit', () => {
    const skill = readFileSync(join(ROOT, 'skill/SKILL.src.md'), 'utf-8').replace(/\r\n?/g, '\n');

    assert.match(skill, /“Show options” means present the options and wait for a selection/);
    assert.match(skill, /“Implement the agreed direction” authorizes the ordinary implementation/);
    assert.match(skill, /“Choose yourself within these boundaries” does too/);
    assert.match(skill, /delegated choice, never as user approval/);
    assert.match(skill, /`shape` plans and stops before code, and `audit` reports findings without fixing/);
    assert.match(skill, /parent task’s approved scope, shared budget, and relevant evidence/);
    assert.match(skill, /do not let it broaden authority, redesign an agreed direction, or act as a second controller/);
    assert.match(skill, /The ceiling limits cosmetic polish only: fix a known functional, accessibility, or security defect/);

    const newWork = readFileSync(join(ROOT, 'skill/reference/new-work.md'), 'utf-8').replace(/\r\n?/g, '\n');
    assert.match(newWork, /already agreed direction with no unresolved material decision needs no confirmation round/);
    assert.match(newWork, /direction remains unresolved/);
    assert.match(newWork, /explicitly delegated bounded choice/);
    assert.match(newWork, /retain the three-way visual validation without a second approval point/);
    assert.match(newWork, /a known functional, accessibility, or security defect must be fixed within authorized scope or reported as an unresolved blocker/);

    const visualize = readFileSync(join(ROOT, 'skill/reference/visualize.md'), 'utf-8').replace(/\r\n?/g, '\n');
    assert.match(visualize, /This approval point has no substitute when the direction is unresolved/);
    assert.match(visualize, /An already agreed direction, or a bounded choice the user explicitly delegates, skips only this redundant approval point/);
    assert.match(visualize, /never represent delegation as user approval/);

    for (const agent of [
      'impeccable-asset-producer.md',
      'impeccable-finish-reviewer.md',
      'impeccable-documenter.md',
      'impeccable-manual-edit-applier.md',
    ]) {
      const source = readFileSync(join(ROOT, 'skill/agents', agent), 'utf-8');
      assert.match(source, /parent task's approved scope and shared budget/);
      assert.match(source, /delegated choice[;,] never (?:represent it as|evidence of) user approval/);
    }
  });

  it('keeps reduced-motion guidance on the animation build path', () => {
    const animate = readFileSync(join(ROOT, 'skill/reference/animate.md'), 'utf-8').replace(/\r\n?/g, '\n');
    const accessibility = animate.match(/## Accessibility and control\n([\s\S]*?)\n## Verify/)?.[1] ?? '';
    const verify = animate.match(/## Verify\n([\s\S]*?)(?:\n## |$)/)?.[1] ?? '';

    assert.match(accessibility, /prefers-reduced-motion/);
    assert.match(accessibility, /intentional alternative/);
    assert.match(accessibility, /not disabling all motion/);
    assert.match(verify, /reduced[- ]motion/i);
  });
});
