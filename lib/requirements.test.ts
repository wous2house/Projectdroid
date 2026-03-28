import test from 'node:test';
import assert from 'node:assert';
// @ts-ignore
import { getIndentClass } from './requirements.ts';

test('getIndentClass returns correct classes for level 1 indentation (actually listed as ml-8)', () => {
  const level1 = ['type_werken_bij', 'type_landing', 'type_corporate', 'wp_rocket', 'wp_umbrella', 'wp_wordfence', 'wp_wordfence_premium'];
  for (const req of level1) {
    assert.strictEqual(getIndentClass(req), 'ml-8 md:ml-12', `Failed for ${req}`);
  }
});

test('getIndentClass returns correct classes for level 2 indentation (actually listed as ml-16)', () => {
  const level2 = ['cms_eigen', 'cms_wp'];
  for (const req of level2) {
    assert.strictEqual(getIndentClass(req), 'ml-16 md:ml-24', `Failed for ${req}`);
  }
});

test('getIndentClass returns correct classes for level 3 indentation (actually listed as ml-24)', () => {
  const level3 = ['eigen_recruitee', 'wp_elementor', 'wp_forms', 'wp_acf', 'wp_code', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts'];
  for (const req of level3) {
    assert.strictEqual(getIndentClass(req), 'ml-24 md:ml-32', `Failed for ${req}`);
  }
});

test('getIndentClass returns empty string for unknown keys', () => {
  assert.strictEqual(getIndentClass('unknown'), '');
  assert.strictEqual(getIndentClass(''), '');
  assert.strictEqual(getIndentClass('bouw_website'), '');
});
