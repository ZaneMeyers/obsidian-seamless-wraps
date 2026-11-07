import { MarkdownView, Plugin, debounce } from 'obsidian';
import { processElement } from './reading';
import { CompiledRule, compileRules } from './rules';
import { PluginSettings, SettingsTab, normalizeSettings } from './settings';

/**
 * Runs after post-processors at the default order (0), so rules see text
 * that other plugins have already substituted, such as --- turned into —.
 */
const SORT_ORDER = 100;

export default class SeamlessWrapsPlugin extends Plugin {
	settings!: PluginSettings;
	private compiled: CompiledRule[] = [];

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.compiled = compileRules(this.settings.rules);

		this.registerMarkdownPostProcessor((el) => processElement(el, this.compiled), SORT_ORDER);
		this.addSettingTab(new SettingsTab(this.app, this));
		this.app.workspace.onLayoutReady(() => this.rerenderReadingViews());
	}

	onunload(): void {
		this.rerenderReadingViews();
	}

	async saveAndRefresh(): Promise<void> {
		await this.saveData(this.settings);
		this.compiled = compileRules(this.settings.rules);
		this.rerenderReadingViews();
	}

	/** For text inputs: avoids re-rendering every open note on each keystroke. */
	saveAndRefreshDebounced = debounce(() => void this.saveAndRefresh(), 500, true);

	private rerenderReadingViews(): void {
		this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
			if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
		});
	}
}
