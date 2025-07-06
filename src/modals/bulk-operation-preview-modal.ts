import { App, Modal } from 'obsidian';
import { EntityInstance } from '../types';

export class BulkOperationPreviewModal extends Modal {
	constructor(
		app: App,
		private entities: EntityInstance[],
		private operationDescription: string,
		private onConfirm: (selectedEntities: EntityInstance[]) => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Bulk Operation Preview' });
		contentEl.createEl('p', { text: this.operationDescription });
		contentEl.createEl('p', { text: `This will affect ${this.entities.length} entities:` });

		const list = contentEl.createEl('ul');
		this.entities.forEach(entity => {
			const item = list.createEl('li');
			item.createEl('span', { text: `${entity.file.name} (${entity.entityType})` });
		});

		const buttonDiv = contentEl.createDiv();
		const confirmButton = buttonDiv.createEl('button', { text: 'Confirm' });
		confirmButton.addEventListener('click', () => {
			this.onConfirm(this.entities);
			this.close();
		});
		
		const cancelButton = buttonDiv.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}