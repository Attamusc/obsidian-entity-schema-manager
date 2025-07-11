import { App, Modal, Notice, DropdownComponent } from 'obsidian';
import { EntitySchema } from '../types';

export class AddPropertyModal extends Modal {
	private entityTypeSelect: DropdownComponent;
	private propertyNameInput: HTMLInputElement;
	private defaultValueInput: HTMLInputElement;

	constructor(
		app: App,
		private schemas: EntitySchema[],
		private onAdd: (entityType: string, property: string, defaultValue: unknown) => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Add Property to Entity Type' });

		// Entity Type Selection
		const entityTypeDiv = contentEl.createDiv();
		entityTypeDiv.createEl('label', { text: 'Entity Type:' });
		this.entityTypeSelect = new DropdownComponent(entityTypeDiv);
		this.schemas.forEach(schema => {
			this.entityTypeSelect.addOption(schema.name, schema.name);
		});

		// Property Name Input
		const propertyDiv = contentEl.createDiv();
		propertyDiv.createEl('label', { text: 'Property Name:' });
		this.propertyNameInput = propertyDiv.createEl('input', { type: 'text' });
		this.propertyNameInput.placeholder = 'e.g., level, title, department';

		// Default Value Input
		const defaultDiv = contentEl.createDiv();
		defaultDiv.createEl('label', { text: 'Default Value:' });
		this.defaultValueInput = defaultDiv.createEl('input', { type: 'text' });
		this.defaultValueInput.placeholder = 'e.g., "unknown", 1, ["tag1", "tag2"]';

		// Buttons
		const buttonDiv = contentEl.createDiv();
		const addButton = buttonDiv.createEl('button', { text: 'Add Property' });
		addButton.addEventListener('click', () => this.handleAdd());
		
		const cancelButton = buttonDiv.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
	}

	private handleAdd() {
		const entityType = this.entityTypeSelect.getValue();
		const propertyName = this.propertyNameInput.value.trim();
		const defaultValueStr = this.defaultValueInput.value.trim();

		if (!propertyName) {
			new Notice('Property name is required');
			return;
		}

		let defaultValue: unknown = defaultValueStr;
		
		// Try to parse as JSON for complex values
		if (defaultValueStr.startsWith('[') || defaultValueStr.startsWith('{')) {
			try {
				defaultValue = JSON.parse(defaultValueStr);
			} catch {
				// Keep as string if JSON parsing fails
			}
		} else if (defaultValueStr === 'true' || defaultValueStr === 'false') {
			defaultValue = defaultValueStr === 'true';
		} else if (!isNaN(Number(defaultValueStr)) && defaultValueStr !== '') {
			defaultValue = Number(defaultValueStr);
		}

		this.onAdd(entityType, propertyName, defaultValue);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}