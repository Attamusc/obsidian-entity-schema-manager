import { App, Modal } from 'obsidian';
import { EntityInstance } from '../types';

export class SchemaDriftModal extends Modal {
	constructor(app: App, private driftEntities: EntityInstance[]) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Schema Drift Analysis' });
		
		if (this.driftEntities.length === 0) {
			contentEl.createEl('p', { text: 'No schema drift detected. All entities are up to date!' });
		} else {
			contentEl.createEl('p', { text: `${this.driftEntities.length} entities have missing properties:` });
			
			const list = contentEl.createEl('ul');
			this.driftEntities.forEach(entity => {
				const item = list.createEl('li');
				item.createEl('strong', { text: entity.file.name });
				item.createEl('span', { text: ` (${entity.entityType}): missing ` });
				item.createEl('code', { text: entity.missingProperties.join(', ') });
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