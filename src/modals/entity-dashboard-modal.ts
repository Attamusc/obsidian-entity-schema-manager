import { App, Modal } from 'obsidian';
import { EntityInstance, EntitySchema } from '../types';

export class EntityDashboardModal extends Modal {
	constructor(
		app: App,
		private entities: EntityInstance[],
		private schemas: EntitySchema[]
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Entity Dashboard' });

		// Summary by type
		const typeCount = new Map<string, number>();
		this.entities.forEach(entity => {
			typeCount.set(entity.entityType, (typeCount.get(entity.entityType) || 0) + 1);
		});

		const summaryDiv = contentEl.createDiv();
		summaryDiv.createEl('h3', { text: 'Entity Types:' });
		typeCount.forEach((count, type) => {
			summaryDiv.createEl('p', { text: `${type}: ${count} entities` });
		});

		// Schema drift summary
		const driftCount = this.entities.filter(e => e.missingProperties.length > 0).length;
		if (driftCount > 0) {
			const driftDiv = contentEl.createDiv();
			driftDiv.createEl('h3', { text: 'Schema Issues:' });
			driftDiv.createEl('p', { text: `${driftCount} entities have missing properties` });
		}

		const button = contentEl.createEl('button', { text: 'Close' });
		button.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}