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
import { EntitySchemaAPIService } from './src/api-service';
import { EntitySchemaAPI } from './src/api';
import { SkillInstaller } from './src/skill-installer';

export type { EntitySchema } from './src/types';
export type { EntitySchemaAPI } from './src/api';

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
	apiService: EntitySchemaAPIService;
	api: EntitySchemaAPI;
	skillInstaller: SkillInstaller;
	static DEFAULT_SETTINGS = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// Initialize managers
		this.schemaManager = new SchemaManager(this.app);
		this.entityScanner = new EntityScanner(this.app);
		this.bulkOperations = new BulkOperations(this.app, () => this.settings);
		this.skillInstaller = new SkillInstaller(this.app);

		// Initialize API service
		this.apiService = new EntitySchemaAPIService(this.entityScanner, this.schemaManager);
		this.api = this.apiService;

		// Load schemas
		this.settings.schemas = await this.schemaManager.loadSchemas();
		await this.saveSettings();

		// Update API service with loaded schemas
		this.apiService.updateSchemas(this.settings.schemas);

		// Register API for inter-plugin communication
		this.registerAPI();

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

		this.addCommand({
			id: 'install-agent-skill',
			name: 'Install agent skill',
			callback: () => this.installAgentSkill()
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
		// Update API cache after scanning
		if (this.apiService) {
			this.apiService.updateSchemas(this.settings.schemas);
		}
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
		// Update API cache after reloading schemas
		if (this.apiService) {
			this.apiService.updateSchemas(this.settings.schemas);
		}
		new Notice('Entity schemas reloaded');
	}

	async exportSchemas() {
		const success = await this.schemaManager.saveSchemas(this.settings.schemas);
		if (success) {
			new Notice('Entity schemas exported to entity-schemas.json');
		}
	}

	async installAgentSkill() {
		await this.skillInstaller.installSkill();
	}

	/**
	 * Register API for inter-plugin communication
	 */
	private registerAPI() {
		// Method 1: Global namespace (primary method)
		window['entity-schema-manager.api.v1'] = this.api;
		
		// Method 2: Plugin registry (fallback method)
		// Make the API available via app.plugins.plugins["entity-schema-manager"].api
		(this as unknown as { api: EntitySchemaAPI }).api = this.api;
		
		console.log('Entity Schema Manager: API registered for inter-plugin communication');
	}

	/**
	 * Unregister API during plugin unload
	 */
	private unregisterAPI() {
		// Clean up global namespace
		if (window['entity-schema-manager.api.v1'] === this.api) {
			delete window['entity-schema-manager.api.v1'];
		}
		
		// Clean up plugin registry
		delete (this as unknown as { api?: EntitySchemaAPI }).api;
		
		console.log('Entity Schema Manager: API unregistered');
	}

	/**
	 * Plugin unload cleanup
	 */
	onunload() {
		this.unregisterAPI();
	}
}
