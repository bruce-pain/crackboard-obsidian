import { MarkdownView, Plugin, App, PluginSettingTab, Setting, requestUrl } from 'obsidian';

// Constants
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const ENDPOINT = 'http://crackboard.dev/heartbeat';

interface CrackboardPluginSettings {
	sessionKey: string;
}

const DEFAULT_SETTINGS: CrackboardPluginSettings = {
	sessionKey: ''
}

export default class CrackboardPlugin extends Plugin {
	settings: CrackboardPluginSettings;

	// Variables
	private lastHeartbeatTime: number | undefined;
	private typingTimer: number | undefined;

	private async sendHeartbeat(language: string) {
		try {
			const response = requestUrl({
				url: ENDPOINT,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					timestamp: new Date().toISOString(),
					"session_key": this.settings.sessionKey,
					"language_name": language
				})
			});

			if ((await response).status == 200) {
				this.lastHeartbeatTime = Date.now();
				console.log('Heartbeat sent successfully.');
			} else {
				console.error('Failed to send heartbeat:', (await response).status);
			}
		} catch (error) {
			console.error('Failed to send heartbeat:', error);
		}

	};

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new CrackboardSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				if (this.typingTimer) {
					window.clearTimeout(this.typingTimer)
				}

				this.typingTimer = window.setTimeout(() => {
					const now = Date.now()
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						const language = "markdown";
						if (!this.lastHeartbeatTime || (now - this.lastHeartbeatTime) >= HEARTBEAT_INTERVAL) {
							this.sendHeartbeat(language);
						}
					}
				}, HEARTBEAT_INTERVAL);
			})
		)

	}

	onunload(): void {
		if (this.typingTimer) {
			window.clearTimeout(this.typingTimer);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		console.log("saving..")
		await this.saveData(this.settings);
	}
}

class CrackboardSettingTab extends PluginSettingTab {
	plugin: CrackboardPlugin;

	constructor(app: App, plugin: CrackboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Session Key')
			.setDesc('Enter your Crackboard session key')
			.addText(text => text
				.setPlaceholder('Enter your session key')
				.setValue(this.plugin.settings.sessionKey).onChange(async (value) => {
					this.plugin.settings.sessionKey = value;
					await this.plugin.saveSettings();
				}));
	}
}