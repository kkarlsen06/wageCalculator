// Security utilities for client-side XSS mitigation
// Provides context-aware escaping and sanitization helpers

export function escapeHTML(input) {
	const str = String(input ?? '');
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function safeUrl(input) {
	try {
		const base = (typeof location !== 'undefined' && location.origin) ? location.origin : 'http://localhost';
		const url = new URL(String(input || ''), base);
		const protocol = url.protocol.toLowerCase();
		if (!['http:', 'https:', 'mailto:'].includes(protocol)) throw new Error('blocked-protocol');
		return url.href;
	} catch (_) {
		return 'about:blank';
	}
}

// Strictly validate CSS color value to prevent CSS injection via inline styles
// Allows: #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla()
// Disallows semicolons and url()/expression() etc.
export function safeCssColor(input, fallback = '#6366f1') {
	const value = String(input || '').trim();
	if (!value) return fallback;
	if (/[;]/.test(value)) return fallback; // forbid property breakouts
	const hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
	const rgb = /^rgba?\(\s*(?:\d{1,3}\s*,){2}\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
	const hsl = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
	if (hex.test(value) || rgb.test(value) || hsl.test(value)) return value;
	return fallback;
}

export function sanitizeHTML(html) {
	try {
		if (typeof DOMPurify !== 'undefined') {
			return DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /^(https?|mailto):/i });
		}
	} catch (_) {}
	// Fallback: escape as plain text if DOMPurify unavailable
	return escapeHTML(html);
}