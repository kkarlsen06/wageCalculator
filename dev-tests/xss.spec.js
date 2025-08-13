import { strict as assert } from 'node:assert';
import { escapeHTML, safeUrl, safeCssColor } from '../kalkulator/js/security.js';

function testEscapeHTML() {
	assert.equal(escapeHTML('<script>'), '&lt;script&gt;');
	assert.equal(escapeHTML('Tom & Jerry'), 'Tom &amp; Jerry');
	assert.equal(escapeHTML('"\''), '&quot;&#39;');
}

function testSafeUrl() {
	assert.equal(safeUrl('https://example.com/x?y=z').startsWith('https://'), true);
	assert.equal(safeUrl('mailto:a@b').startsWith('mailto:'), true);
	assert.equal(safeUrl('javascript:alert(1)'), 'about:blank');
	assert.equal(safeUrl('data:text/html,abc'), 'about:blank');
}

function testSafeCssColor() {
	assert.equal(safeCssColor('#abc'), '#abc');
	assert.equal(safeCssColor('rgba(0,0,0,0.5)'), 'rgba(0,0,0,0.5)');
	assert.equal(safeCssColor('red; background:url(javascript:alert(1))'), '#6366f1');
	assert.equal(safeCssColor('url(javascript:alert(1))'), '#6366f1');
}

try {
	testEscapeHTML();
	testSafeUrl();
	testSafeCssColor();
	console.log('xss.spec.js: OK');
	process.exit(0);
} catch (e) {
	console.error('xss.spec.js: FAIL', e);
	process.exit(1);
}