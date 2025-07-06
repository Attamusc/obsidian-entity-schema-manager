import { App, Modal } from 'obsidian';
import { ValidationResults } from '../types';

export class ValidationResultModal extends Modal {
	constructor(app: App, private results: ValidationResults) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Entity Validation Results' });
		
		const summary = contentEl.createDiv();
		summary.createEl('p', { text: `Total entities: ${this.results.total}` });
		summary.createEl('p', { text: `Valid entities: ${this.results.valid}` });
		summary.createEl('p', { text: `Invalid entities: ${this.results.total - this.results.valid}` });

		if (this.results.issues.length > 0) {
			contentEl.createEl('h3', { text: 'Issues Found:' });
			const issueList = contentEl.createEl('ul');
			this.results.issues.forEach(issue => {
				issueList.createEl('li', { text: issue });
			});
		}

		const button = contentEl.createEl('button', { text: 'Close' });
		button.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}