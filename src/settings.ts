import { App, PluginSettingTab, Setting, SettingDefinitionItem, requireApiVersion } from 'obsidian';
import { ConfirmModal } from './confirm-modal';
import type SeamlessWrapsPlugin from './main';
import { DEFAULT_RULES, Rule, validatePattern } from './rules';

export interface PluginSettings {
	rules: Rule[];
}

function cloneRules(rules: Rule[]): Rule[] {
	return rules.map((r) => ({ ...r }));
}

export function normalizeSettings(data: unknown): PluginSettings {
	const saved = (data ?? {}) as { rules?: unknown };
	const rules = Array.isArray(saved.rules)
		? (saved.rules as Record<string, unknown>[]).map(
				(r): Rule => ({
					before: typeof r.before === 'string' ? r.before : '',
					after: typeof r.after === 'string' ? r.after : '',
					enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
				}),
			)
		: cloneRules(DEFAULT_RULES);
	return { rules };
}

function rulesHelp(): DocumentFragment {
	return createFragment((f) => {
		f.appendText('In Reading view, with ');
		f.createEl('em', { text: 'Strict line breaks' });
		f.appendText(
			' on, wrapped lines are joined with a space. A rule removes that space when the end of one line matches ',
		);
		f.createEl('em', { text: 'Line ends with' });
		f.appendText(' and the start of the next matches ');
		f.createEl('em', { text: 'Next line starts with' });
		f.appendText('. Both are JavaScript regular expressions. ');
		f.appendText('A pattern left empty matches anything. ');
		f.appendText('The editor is not affected.');
	});
}

/**
 * Obsidian 1.13+ renders this tab from getSettingDefinitions(), which makes
 * the settings searchable. Older versions call display(), which renders the
 * same settings imperatively.
 */
export class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: SeamlessWrapsPlugin,
	) {
		super(app, plugin);
	}

	// ---- Obsidian 1.13+ (declarative) ----

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Rules',
				items: [
					{ name: 'How rules work', desc: rulesHelp() },
					{
						name: 'Restore default rules',
						desc: 'Replace all rules with the defaults.',
						action: () => this.confirmRestoreDefaults(),
					},
				],
			},
			{
				type: 'list',
				cls: 'seamless-wraps-rule-list',
				emptyState: 'No rules. Add one with the + button.',
				addItem: { name: 'Add rule', action: () => void this.addRule() },
				onDelete: (index) => void this.deleteRule(index),
				items: this.plugin.settings.rules.map((rule, index) => ({
					name: `Rule ${index + 1}`,
					aliases: [rule.before, rule.after].filter((s) => s !== ''),
					render: (setting: Setting) => this.addRuleControls(setting, rule),
				})),
			},
		];
	}

	// ---- Obsidian < 1.13 (imperative fallback) ----

	display(): void {
		this.renderLegacy();
	}

	private renderLegacy(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Rules').setHeading().setDesc(rulesHelp());

		this.plugin.settings.rules.forEach((rule, index) => {
			const setting = new Setting(containerEl);
			this.addRuleControls(setting, rule);
			setting.addExtraButton((b) =>
				b
					.setIcon('trash')
					.setTooltip('Delete rule')
					.onClick(() => void this.deleteRule(index)),
			);
		});

		new Setting(containerEl)
			.addButton((b) =>
				b
					.setButtonText('Add rule')
					.setCta()
					.onClick(() => void this.addRule()),
			)
			.addButton((b) => b.setButtonText('Restore default rules').onClick(() => this.confirmRestoreDefaults()));
	}

	// ---- Shared ----

	/** Re-renders after rules are added or removed. */
	private rerender(): void {
		if (requireApiVersion('1.13.0')) this.update();
		else this.renderLegacy();
	}

	private async addRule(): Promise<void> {
		this.plugin.settings.rules.push({ before: '', after: '', enabled: true });
		await this.plugin.saveAndRefresh();
		this.rerender();
	}

	private async deleteRule(index: number): Promise<void> {
		this.plugin.settings.rules.splice(index, 1);
		await this.plugin.saveAndRefresh();
		this.rerender();
	}

	private confirmRestoreDefaults(): void {
		new ConfirmModal(
			this.app,
			'Restore default rules',
			'Replace all rules with the defaults? Your current rules will be lost.',
			'Restore defaults',
			async () => {
				this.plugin.settings.rules = cloneRules(DEFAULT_RULES);
				await this.plugin.saveAndRefresh();
				this.rerender();
			},
		).open();
	}

	/** Adds the enable toggle and both pattern inputs for one rule. */
	private addRuleControls(setting: Setting, rule: Rule): void {
		setting.setClass('seamless-wraps-rule-setting');
		const errorEl = setting.descEl.createDiv({ cls: 'seamless-wraps-rule-error' });

		const inputs: HTMLInputElement[] = [];
		const showValidation = () => {
			const errors = [rule.before, rule.after].map((p) => (p === '' ? null : validatePattern(p)));
			errors.forEach((e, i) => inputs[i]?.toggleClass('seamless-wraps-invalid', e !== null));
			const error = errors.find((e) => e !== null);
			errorEl.setText(error ? `Invalid pattern: ${error}` : '');
		};

		const addPattern = (key: 'before' | 'after', placeholder: string) =>
			setting.addText((t) => {
				t.setPlaceholder(placeholder).setValue(rule[key]);
				t.inputEl.addClass('seamless-wraps-pattern-input');
				inputs.push(t.inputEl);
				t.onChange((v) => {
					rule[key] = v;
					showValidation();
					this.plugin.saveAndRefreshDebounced();
				});
			});

		setting.addToggle((t) =>
			t
				.setTooltip('Enable rule')
				.setValue(rule.enabled)
				.onChange(async (v) => {
					rule.enabled = v;
					await this.plugin.saveAndRefresh();
				}),
		);
		addPattern('before', 'Line ends with');
		addPattern('after', 'Next line starts with');
		showValidation();
	}
}
