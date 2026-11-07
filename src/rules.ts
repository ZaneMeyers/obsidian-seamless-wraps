/**
 * A rule removes the space Reading view puts between two hard-wrapped lines.
 * `before` is tested against the end of the first line and `after` against
 * the start of the next one. An empty pattern matches anything, but a rule
 * needs at least one non-empty pattern.
 */
export interface Rule {
	before: string;
	after: string;
	enabled: boolean;
}

export interface CompiledRule {
	before: RegExp | null;
	after: RegExp | null;
}

/**
 * `---` and `...` are included so the defaults work whether or not another
 * plugin (such as Replace on Render) turns them into — and … first.
 */
export const DEFAULT_RULES: Rule[] = [
	{ before: '—|---', after: '', enabled: true },
	{ before: '…|\\.\\.\\.', after: '', enabled: true },
];

/** Returns an error message, or null if the pattern compiles. */
export function validatePattern(pattern: string): string | null {
	try {
		new RegExp(pattern, 'u');
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	}
}

/** Compiles enabled rules, skipping empty or invalid ones. */
export function compileRules(rules: Rule[]): CompiledRule[] {
	const compiled: CompiledRule[] = [];
	for (const rule of rules) {
		if (!rule.enabled || (rule.before === '' && rule.after === '')) continue;
		if (validatePattern(rule.before) || validatePattern(rule.after)) continue;
		compiled.push({
			before: rule.before === '' ? null : new RegExp(`(?:${rule.before})$`, 'u'),
			after: rule.after === '' ? null : new RegExp(`^(?:${rule.after})`, 'u'),
		});
	}
	return compiled;
}

/** True if some rule says the break between these two lines should get no space. */
export function shouldJoin(lineBefore: string, lineAfter: string, rules: CompiledRule[]): boolean {
	return rules.some(
		(r) => (!r.before || r.before.test(lineBefore)) && (!r.after || r.after.test(lineAfter)),
	);
}
