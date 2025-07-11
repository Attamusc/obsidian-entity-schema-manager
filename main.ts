import { Plugin, Notice } from 'obsidian';
import { EntityInstance, EntitySchemaSettings } from './src/types';
import { SchemaManager } from './src/schema-manager';
import { EntityScanner } from './src/entity-scanner';
import { BulkOperations } from './src/bulk-operations';
import { EntitySchemaSettingTab } from './src/settings-tab';
import {
	ValidationResultModal,
	SchemaDriftModal,
	AddPropertyModal,
	BulkOperationPreviewModal,
	EntityDashboardModal
} from './src/modals';

export type { EntitySchema } from './src/types';

const DEFAULT_SETTINGS: EntitySchemaSettings = {
	schemas: [], // Schemas will be loaded by SchemaManager
	backupBeforeOperations: true,
	showValidationIndicators: true
};

export default class EntitySchemaPlugin extends Plugin {
	settings: EntitySchemaSettings;
	schemaManager: SchemaManager;
	entityScanner: EntityScanner;
	bulkOperations: BulkOperations;
	static DEFAULT_SETTINGS = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// Initialize managers
		this.schemaManager = new SchemaManager(this.app);
		this.entityScanner = new EntityScanner(this.app);
		this.bulkOperations = new BulkOperations(this.app, () => this.settings);

		// Load schemas
		this.settings.schemas = await this.schemaManager.loadSchemas();
		await this.saveSettings();

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

		this.addCommand({
			id: 'reload-entity-schemas',
			name: 'Reload entity schemas',
			callback: () => this.reloadSchemas()
		});

		this.addCommand({
			id: 'export-entity-schemas',
			name: 'Export entity schemas',
			callback: () => this.exportSchemas()
		});

		// Add settings tab
		this.addSettingTab(new EntitySchemaSettingTab(this.app, this, this.schemaManager));

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
		await this.entityScanner.scanEntities(this.settings.schemas);
	}


	async validateEntities() {
		const results = this.entityScanner.getValidationSummary();
		const modal = new ValidationResultModal(this.app, results);
		modal.open();
	}

	showSchemaDrift() {
		const drift = this.entityScanner.getEntitiesWithDrift();
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
		const modal = new EntityDashboardModal(this.app, this.entityScanner.getEntityInstances(), this.settings.schemas);
		modal.open();
	}

	async addPropertyToEntityType(entityTypeName: string, propertyName: string, defaultValue: unknown) {
		const targetEntities = this.entityScanner.getEntitiesByType(entityTypeName);

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

	async performBulkPropertyAddition(entities: EntityInstance[], propertyName: string, defaultValue: unknown) {
		const result = await this.bulkOperations.performBulkPropertyAddition(entities, propertyName, defaultValue);

		// Rescan entities to update our cache
		await this.scanEntities();
		return result;
	}

	async reloadSchemas() {
		this.settings.schemas = await this.schemaManager.reloadSchemas();
		await this.saveSettings();
		await this.scanEntities();
		new Notice('Entity schemas reloaded');
	}

	async exportSchemas() {
		const success = await this.schemaManager.saveSchemas(this.settings.schemas);
		if (success) {
			new Notice('Entity schemas exported to entity-schemas.json');
		}
	}
}
