import { CompiledRule, shouldJoin } from './rules';

/**
 * With "Strict line breaks" on, Reading view keeps each soft line break as a
 * "\n" in the rendered text, and the browser shows it as a space. Deleting
 * that "\n" (and any spaces or tabs around it) joins the lines with nothing.
 */

/** Text inside these is left alone: a newline there is not a prose wrap. */
const LOCKED_SELECTOR = [
	'code',
	'pre',
	'kbd',
	'samp',
	'script',
	'style',
	'textarea',
	'svg',
	'math',
	'.math',
	'mjx-container',
	'.frontmatter',
	'.frontmatter-container',
	'.metadata-container',
].join(',');

/** Text is only joined with other text in the same block. */
const BLOCK_SELECTOR = [
	'p',
	'li',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'td',
	'th',
	'dt',
	'dd',
	'blockquote',
	'figcaption',
	'summary',
	'div',
].join(',');

/** A newline plus the spaces and tabs around it. */
const BREAK = /[ \t]*\n[ \t]*/g;

export function processElement(root: HTMLElement, rules: CompiledRule[]): void {
	if (rules.length === 0) return;
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

	// A run of text nodes that read as one stretch of prose. Formatting
	// (bold, links, Replace on Render spans) doesn't break a run; a <br> or
	// a different block does.
	let run: Text[] = [];
	let runBlock: Element | null = null;
	const flush = () => {
		if (run.length > 0) joinRun(run, rules);
		run = [];
	};

	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		if (n.nodeType !== Node.TEXT_NODE) {
			if (n.nodeName === 'BR') flush();
			continue;
		}
		const text = n as Text;
		const block = text.parentElement?.closest(BLOCK_SELECTOR) ?? null;
		if (block !== runBlock) {
			flush();
			runBlock = block;
		}
		run.push(text);
	}
	flush();
}

/** Removes the breaks the rules match, editing text nodes in place. */
function joinRun(nodes: Text[], rules: CompiledRule[]): void {
	const text = nodes.map((n) => n.data).join('');
	if (!text.includes('\n')) return;

	const starts: number[] = [];
	let offset = 0;
	for (const n of nodes) {
		starts.push(offset);
		offset += n.data.length;
	}

	// Each cut is a [from, to) range of `text` to delete.
	const cuts: [number, number][] = [];
	for (const m of text.matchAll(BREAK)) {
		const from = m.index;
		const to = from + m[0].length;
		if (overlapsLocked(nodes, starts, from, to)) continue;
		const lineStart = text.lastIndexOf('\n', from - 1) + 1;
		let lineEnd = text.indexOf('\n', to);
		if (lineEnd === -1) lineEnd = text.length;
		if (shouldJoin(text.slice(lineStart, from), text.slice(to, lineEnd), rules)) cuts.push([from, to]);
	}
	if (cuts.length === 0) return;

	nodes.forEach((node, i) => {
		const start = starts[i]!;
		const end = start + node.data.length;
		let data = node.data;
		// Right to left, so earlier offsets stay valid.
		for (let c = cuts.length - 1; c >= 0; c--) {
			const [from, to] = cuts[c]!;
			const a = Math.max(from, start);
			const b = Math.min(to, end);
			if (a < b) data = data.slice(0, a - start) + data.slice(b - start);
		}
		if (data !== node.data) node.data = data;
	});
}

function overlapsLocked(nodes: Text[], starts: number[], from: number, to: number): boolean {
	return nodes.some((node, i) => {
		const start = starts[i]!;
		const end = start + node.data.length;
		return start < to && end > from && node.parentElement?.closest(LOCKED_SELECTOR) != null;
	});
}
