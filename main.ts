import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, Modal, DropdownComponent } from 'obsidian';

export interface EntitySchema {
	name: string;
	properties: Record<string, PropertyDefinition>;
	matchCriteria: MatchCriteria;
	description?: string;
}

interface PropertyDefinition {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	required?: boolean;
	defaultValue?: any;
	description?: string;
}

interface MatchCriteria {
	requiredProperties?: string[];
	folderPath?: string;
	tagPattern?: string;
	namePattern?: string;
	propertyValues?: Record<string, any>;
}

interface EntityInstance {
	file: TFile;
	entityType: string;
	properties: Record<string, any>;
	missingProperties: string[];
}

interface EntitySchemaSettings {
	schemas: EntitySchema[];
	backupBeforeOperations: boolean;
	showValidationIndicators: boolean;
}

const DEFAULT_SETTINGS: EntitySchemaSettings = {
	schemas: [
		{
			name: "Person",
			properties: {
				name: { type: "string", required: true },
				role: { type: "string", required: false },
				team: { type: "string", required: false },
				email: { type: "string", required: false }
			},
			matchCriteria: {
				requiredProperties: ["name", "is"],
				folderPath: "atlas/notes",
				propertyValues: {
					"is": "atlas/entities/person"
				}
			},
			description: "Individual person entity"
		},
		{
			name: "Team",
			properties: {
				name: { type: "string", required: true },
				members: { type: "array", required: false },
				lead: { type: "string", required: false }
			},
			matchCriteria: {
				requiredProperties: ["name", "is"],
				folderPath: "atlas/notes",
				propertyValues: {
					"is": "atlas/entities/team"
				}
			},
			description: "Team or group entity"
		}
	],
	backupBeforeOperations: true,
	showValidationIndicators: true
};

export default class EntitySchemaPlugin extends Plugin {
	settings: EntitySchemaSettings;
	entityInstances: EntityInstance[] = [];
	static DEFAULT_SETTINGS = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('database', 'Entity Schema Manager', () => {
			this.showEntityDashboard();
		});

		// Add commands
		this.addCommand({
			id: 'scan-entities',
			name: 'Scan for entities',
			callback: () => this.scanEntities()
		});

		this.addCommand({
			id: 'add-property-to-entity-type',
			name: 'Add property to entity type',
			callback: () => this.showAddPropertyModal()
		});

		this.addCommand({
			id: 'validate-entities',
			name: 'Validate all entities',
			callback: () => this.validateEntities()
		});

		this.addCommand({
			id: 'show-schema-drift',
			name: 'Show schema drift',
			callback: () => this.showSchemaDrift()
		});

		// Add settings tab
		this.addSettingTab(new EntitySchemaSettingTab(this.app, this));

		// Initial scan
		this.scanEntities();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async scanEntities() {
		this.entityInstances = [];
		const files = this.app.vault.getMarkdownFiles();
		
		for (const file of files) {
			const metadata = this.app.metadataCache.getFileCache(file);
			if (!metadata?.frontmatter) continue;

			for (const schema of this.settings.schemas) {
				if (this.matchesSchema(file, metadata.frontmatter, schema)) {
					const missingProperties = this.getMissingProperties(metadata.frontmatter, schema);
					this.entityInstances.push({
						file,
						entityType: schema.name,
						properties: metadata.frontmatter,
						missingProperties
					});
					break; // Only match first applicable schema
				}
			}
		}

		new Notice(`Found ${this.entityInstances.length} entities`);
	}

	private matchesSchema(file: TFile, frontmatter: any, schema: EntitySchema): boolean {
		const criteria = schema.matchCriteria;
		
		// Check required properties
		if (criteria.requiredProperties) {
			for (const prop of criteria.requiredProperties) {
				if (!(prop in frontmatter)) return false;
			}
		}

		// Check folder path
		if (criteria.folderPath) {
			if (!file.path.startsWith(criteria.folderPath)) return false;
		}

		// Check tag pattern
		if (criteria.tagPattern && frontmatter.tags) {
			const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
			if (!tags.some((tag: string) => tag.includes(criteria.tagPattern!))) return false;
		}

		// Check name pattern
		if (criteria.namePattern) {
			if (!file.name.includes(criteria.namePattern)) return false;
		}

		// Check property values
		if (criteria.propertyValues) {
			for (const [propName, expectedValue] of Object.entries(criteria.propertyValues)) {
				const actualValue = frontmatter[propName];
				
				if (!this.comparePropertyValues(actualValue, expectedValue)) {
					return false;
				}
			}
		}

		return true;
	}

	private comparePropertyValues(actualValue: any, expectedValue: any): boolean {
		// Handle arrays of expected values (OR logic)
		if (Array.isArray(expectedValue)) {
			return expectedValue.some(expected => this.comparePropertyValues(actualValue, expected));
		}

		// Handle null/undefined values
		if (actualValue == null || expectedValue == null) {
			return actualValue === expectedValue;
		}

		// Handle link matching
		if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
			// Check if either value looks like a link
			const actualIsLink = this.isObsidianLink(actualValue);
			const expectedIsLink = this.isObsidianLink(expectedValue);

			if (actualIsLink || expectedIsLink) {
				return this.compareLinksUsingAPI(actualValue, expectedValue);
			}

			// Regular case-insensitive string comparison
			return actualValue.toLowerCase() === expectedValue.toLowerCase();
		}

		// Exact match for other types (numbers, booleans, objects)
		return actualValue === expectedValue;
	}

	private isObsidianLink(value: string): boolean {
		// Check for [[link]] or [[link|display]] format
		return /^\[\[.*\]\]$/.test(value.trim());
	}

	private compareLinksUsingAPI(actualValue: string, expectedValue: string): boolean {
		// Extract link paths from Obsidian link format if needed
		const actualLinkPath = this.extractLinkPath(actualValue);
		const expectedLinkPath = this.extractLinkPath(expectedValue);

		// Use Obsidian's MetadataCache to resolve links to actual files
		const actualFile = this.app.metadataCache.getFirstLinkpathDest(actualLinkPath, '');
		const expectedFile = this.app.metadataCache.getFirstLinkpathDest(expectedLinkPath, '');

		// If both resolve to files, compare the file paths
		if (actualFile && expectedFile) {
			return actualFile.path === expectedFile.path;
		}

		// If one resolves to a file and the other doesn't, compare with the resolved file path
		if (actualFile && !expectedFile) {
			// Compare resolved file path with expected string (various formats)
			return this.compareFilePathWithString(actualFile, expectedValue);
		}

		if (!actualFile && expectedFile) {
			// Compare actual string with resolved file path (various formats)  
			return this.compareFilePathWithString(expectedFile, actualValue);
		}

		// Neither resolves to a file, fall back to string comparison
		// This handles cases where links point to non-existent files or are malformed
		return actualLinkPath.toLowerCase() === expectedLinkPath.toLowerCase();
	}

	private extractLinkPath(value: string): string {
		// If it's an Obsidian link [[path|display]], extract just the path
		if (this.isObsidianLink(value)) {
			const match = value.match(/^\[\[([^|]+)(?:\|.*?)?\]\]$/);
			return match ? match[1].trim() : value;
		}
		return value;
	}

	private compareFilePathWithString(file: TFile, compareString: string): boolean {
		const compareLower = compareString.toLowerCase();
		const extractedPath = this.extractLinkPath(compareString).toLowerCase();
		
		// Compare with full path
		if (file.path.toLowerCase() === compareLower || file.path.toLowerCase() === extractedPath) {
			return true;
		}
		
		// Compare with basename (filename without extension)
		const basename = file.basename.toLowerCase();
		if (basename === compareLower || basename === extractedPath) {
			return true;
		}
		
		// Compare with name (filename with extension)
		if (file.name.toLowerCase() === compareLower || file.name.toLowerCase() === extractedPath) {
			return true;
		}
		
		// Check if the compare string is contained in the file path (for partial matches)
		return file.path.toLowerCase().includes(extractedPath);
	}

	private getMissingProperties(frontmatter: any, schema: EntitySchema): string[] {
		const missing: string[] = [];
		
		// Check required properties defined in schema.properties
		for (const [propName, propDef] of Object.entries(schema.properties)) {
			if (propDef.required && !(propName in frontmatter)) {
				missing.push(propName);
			}
		}
		
		// Also check required properties defined in matchCriteria.requiredProperties
		if (schema.matchCriteria.requiredProperties) {
			for (const propName of schema.matchCriteria.requiredProperties) {
				if (!(propName in frontmatter) && !missing.includes(propName)) {
					missing.push(propName);
				}
			}
		}
		
		return missing;
	}

	async validateEntities() {
		let totalEntities = 0;
		let validEntities = 0;
		const issues: string[] = [];

		for (const instance of this.entityInstances) {
			totalEntities++;
			if (instance.missingProperties.length === 0) {
				validEntities++;
			} else {
				issues.push(`${instance.file.name}: missing ${instance.missingProperties.join(', ')}`);
			}
		}

		const modal = new ValidationResultModal(this.app, {
			total: totalEntities,
			valid: validEntities,
			issues
		});
		modal.open();
	}

	showSchemaDrift() {
		const drift = this.entityInstances.filter(e => e.missingProperties.length > 0);
		const modal = new SchemaDriftModal(this.app, drift);
		modal.open();
	}

	showAddPropertyModal() {
		const modal = new AddPropertyModal(this.app, this.settings.schemas, (entityType, property, defaultValue) => {
			this.addPropertyToEntityType(entityType, property, defaultValue);
		});
		modal.open();
	}

	showEntityDashboard() {
		const modal = new EntityDashboardModal(this.app, this.entityInstances, this.settings.schemas);
		modal.open();
	}

	async addPropertyToEntityType(entityTypeName: string, propertyName: string, defaultValue: any) {
		const targetEntities = this.entityInstances.filter(e => e.entityType === entityTypeName);
		
		if (targetEntities.length === 0) {
			new Notice(`No entities found for type: ${entityTypeName}`);
			return;
		}

		const modal = new BulkOperationPreviewModal(
			this.app,
			targetEntities,
			`Add "${propertyName}" property to ${entityTypeName} entities`,
			async (selectedEntities) => {
				await this.performBulkPropertyAddition(selectedEntities, propertyName, defaultValue);
			}
		);
		modal.open();
	}

	async performBulkPropertyAddition(entities: EntityInstance[], propertyName: string, defaultValue: any) {
		if (this.settings.backupBeforeOperations) {
			// Create backup folder if it doesn't exist
			const backupFolder = 'entity-schema-backups';
			if (!await this.app.vault.adapter.exists(backupFolder)) {
				await this.app.vault.createFolder(backupFolder);
			}
		}

		let successCount = 0;
		let errorCount = 0;

		for (const entity of entities) {
			try {
				// Create backup if enabled
				if (this.settings.backupBeforeOperations) {
					const backupPath = `entity-schema-backups/${entity.file.name}.backup.${Date.now()}.md`;
					const content = await this.app.vault.read(entity.file);
					await this.app.vault.create(backupPath, content);
				}

				// Read current content
				const content = await this.app.vault.read(entity.file);
				const updatedContent = this.addPropertyToFrontmatter(content, propertyName, defaultValue);
				
				// Write updated content
				await this.app.vault.modify(entity.file, updatedContent);
				successCount++;
			} catch (error) {
				console.error(`Error updating ${entity.file.name}:`, error);
				errorCount++;
			}
		}

		new Notice(`Updated ${successCount} entities. ${errorCount} errors.`);
		
		// Rescan entities to update our cache
		await this.scanEntities();
	}

	private addPropertyToFrontmatter(content: string, propertyName: string, defaultValue: any): string {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);
		
		if (!match) {
			// No frontmatter exists, create it
			const newFrontmatter = `---\n${propertyName}: ${this.formatValue(defaultValue)}\n---\n\n`;
			return newFrontmatter + content;
		}

		const existingFrontmatter = match[1];
		const newProperty = `${propertyName}: ${this.formatValue(defaultValue)}`;
		const updatedFrontmatter = existingFrontmatter + '\n' + newProperty;
		
		return content.replace(frontmatterRegex, `---\n${updatedFrontmatter}\n---`);
	}

	private formatValue(value: any): string {
		if (typeof value === 'string') {
			return `"${value}"`;
		} else if (Array.isArray(value)) {
			return `[${value.map(v => `"${v}"`).join(', ')}]`;
		}
		return String(value);
	}
}

class ValidationResultModal extends Modal {
	constructor(app: App, private results: { total: number, valid: number, issues: string[] }) {
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

class SchemaDriftModal extends Modal {
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

class AddPropertyModal extends Modal {
	private entityTypeSelect: DropdownComponent;
	private propertyNameInput: HTMLInputElement;
	private defaultValueInput: HTMLInputElement;

	constructor(
		app: App,
		private schemas: EntitySchema[],
		private onAdd: (entityType: string, property: string, defaultValue: any) => void
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

		let defaultValue: any = defaultValueStr;
		
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

class BulkOperationPreviewModal extends Modal {
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

class EntityDashboardModal extends Modal {
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

class EntitySchemaSettingTab extends PluginSettingTab {
	plugin: EntitySchemaPlugin;

	constructor(app: App, plugin: EntitySchemaPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Entity Schema Manager Settings' });

		new Setting(containerEl)
			.setName('Backup before operations')
			.setDesc('Create backups before bulk operations')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.backupBeforeOperations)
				.onChange(async (value) => {
					this.plugin.settings.backupBeforeOperations = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show validation indicators')
			.setDesc('Show visual indicators for schema validation')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showValidationIndicators)
				.onChange(async (value) => {
					this.plugin.settings.showValidationIndicators = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Entity Schemas' });
		containerEl.createEl('p', { text: 'Configure your entity types and their properties here.' });

		// Schema management would go here - for now showing current schemas
		this.plugin.settings.schemas.forEach((schema, index) => {
			const schemaDiv = containerEl.createDiv();
			schemaDiv.createEl('h4', { text: schema.name });
			schemaDiv.createEl('p', { text: schema.description || 'No description' });
			
			const propList = schemaDiv.createEl('ul');
			Object.entries(schema.properties).forEach(([name, def]) => {
				const item = propList.createEl('li');
				item.createEl('code', { text: name });
				item.createEl('span', { text: `: ${def.type}${def.required ? ' (required)' : ''}` });
			});
		});
	}
}
