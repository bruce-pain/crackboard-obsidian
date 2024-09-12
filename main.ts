import { MarkdownView, Plugin, App, PluginSettingTab, Setting } from 'obsidian';

// Constants
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const ENDPOINT = 'http://crackboard.dev/heartbeat';

// Variables
let lastHeartbeatTime: number | undefined;
let typingTimer: number | undefined;
let sessionKey: string | undefined;


interface CrackboardPluginSettings {
	sessionKey: string;
}

const DEFAULT_SETTINGS: CrackboardPluginSettings = {
	sessionKey: ''
}

export default class CrackboardPlugin extends Plugin {
	settings: CrackboardPluginSettings;

	private async sendHeartbeat(language: string) {
		try {
			const response = await fetch(ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					timestamp: new Date().toISOString(),
					"session_key": this.settings.sessionKey,
					"language_name": language
				})
			});

			if (response.ok) {
				lastHeartbeatTime = Date.now();
				console.log('Heartbeat sent successfully.');
			} else {
				console.error('Failed to send heartbeat:', response.statusText);
			}
		} catch (error) {
			console.error('Failed to send heartbeat:', error);
		}

		// console.log(`Heartbeat sent successfully.\nSession key: ${this.settings.sessionKey}`);

	};

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new CrackboardSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				if (typingTimer) {
					window.clearTimeout(typingTimer)
				}

				typingTimer = window.setTimeout(() => {
					const now = Date.now()
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						const language = "markdown";
						if (!lastHeartbeatTime || (now - lastHeartbeatTime) >= HEARTBEAT_INTERVAL) {
							this.sendHeartbeat(language);
						}
					}
				}, HEARTBEAT_INTERVAL);
			})
		)

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