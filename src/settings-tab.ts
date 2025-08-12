import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { EntitySchema } from './types';
import { SchemaManager } from './schema-manager';
import type EntitySchemaPlugin from '../main';

export class EntitySchemaSettingTab extends PluginSettingTab {
	private plugin: EntitySchemaPlugin;
	private schemaManager: SchemaManager;

	constructor(app: App, plugin: EntitySchemaPlugin, schemaManager: SchemaManager) {
		super(app, plugin);
		this.plugin = plugin;
		this.schemaManager = schemaManager;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Entity Schema Manager Settings' });

		// Schema management section
		this.addSchemaManagementSection(containerEl);

		// General settings
		this.addGeneralSettings(containerEl);

		// Current schemas display
		this.addCurrentSchemasSection(containerEl);

		// Discovered entities preview
		this.addDiscoveredEntitiesSection(containerEl);
	}

	private addSchemaManagementSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Schema Management' });

		// Schema source info
		const schemaSource = this.schemaManager.getSchemaSource();
		const sourceInfo = containerEl.createDiv();
		sourceInfo.createEl('p', { 
			text: `Schema source: ${schemaSource.type}${schemaSource.path ? ` (${schemaSource.path})` : ''}` 
		});

		// Schema management buttons
		const buttonContainer = containerEl.createDiv();
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginBottom = '20px';

		// Export schemas button
		const exportButton = buttonContainer.createEl('button', { text: 'Export Schemas to File' });
		exportButton.addEventListener('click', async () => {
			const success = await this.schemaManager.saveSchemas(this.plugin.settings.schemas);
			if (success) {
				this.display(); // Refresh the display to show updated source
			}
		});

		// Reload schemas button
		const reloadButton = buttonContainer.createEl('button', { text: 'Reload Schemas from File' });
		reloadButton.addEventListener('click', async () => {
			const schemas = await this.schemaManager.reloadSchemas();
			this.plugin.settings.schemas = schemas;
			await this.plugin.saveSettings();
			await this.plugin.scanEntities(); // Rescan with new schemas
			this.display(); // Refresh the display
			new Notice('Schemas reloaded successfully');
		});

		// Check if file exists and enable/disable reload button
		this.schemaManager.schemaFileExists().then(exists => {
			reloadButton.disabled = !exists;
			if (!exists) {
				reloadButton.title = 'No schema file found at vault root';
			}
		});

		// Schema file info
		const infoDiv = containerEl.createDiv();
		infoDiv.style.fontSize = '0.9em';
		infoDiv.style.color = 'var(--text-muted)';
		infoDiv.style.marginBottom = '20px';
		infoDiv.createEl('p', { text: 'Schema file location: entity-schemas.json (at vault root)' });
		infoDiv.createEl('p', { text: 'Export your current schemas to create a vault-specific configuration file.' });
		infoDiv.createEl('p', { text: 'After editing the file, use "Reload Schemas" to apply changes without rebuilding the plugin.' });
	}

	private addGeneralSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'General Settings' });

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
	}

	private addCurrentSchemasSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Current Entity Schemas' });
		
		const schemaSource = this.schemaManager.getSchemaSource();
		const sourceNote = containerEl.createDiv();
		sourceNote.style.fontSize = '0.9em';
		sourceNote.style.color = 'var(--text-muted)';
		sourceNote.style.marginBottom = '15px';
		
		if (schemaSource.type === 'file') {
			sourceNote.createEl('p', { text: `✓ Loaded from: ${schemaSource.path}` });
		} else {
			sourceNote.createEl('p', { text: '⚠ Using hardcoded defaults (no schema file found)' });
		}

		// Schema list
		this.plugin.settings.schemas.forEach((schema: EntitySchema) => {
			const schemaDiv = containerEl.createDiv();
			schemaDiv.style.border = '1px solid var(--background-modifier-border)';
			schemaDiv.style.borderRadius = '5px';
			schemaDiv.style.padding = '15px';
			schemaDiv.style.marginBottom = '10px';
			
			schemaDiv.createEl('h4', { text: schema.name });
			schemaDiv.createEl('p', { text: schema.description || 'No description' });
			
			// Properties
			const propsDiv = schemaDiv.createDiv();
			propsDiv.createEl('strong', { text: 'Properties:' });
			const propList = propsDiv.createEl('ul');
			Object.entries(schema.properties).forEach(([name, def]) => {
				const item = propList.createEl('li');
				item.createEl('code', { text: name });
				item.createEl('span', { text: `: ${def.type}${def.required ? ' (required)' : ''}` });
			});

			// Match criteria
			const criteriaDiv = schemaDiv.createDiv();
			criteriaDiv.createEl('strong', { text: 'Match Criteria:' });
			const criteriaList = criteriaDiv.createEl('ul');
			
			if (schema.matchCriteria.folderPath) {
				const item = criteriaList.createEl('li');
				item.createEl('span', { text: 'Folder: ' });
				item.createEl('code', { text: schema.matchCriteria.folderPath });
			}
			
			if (schema.matchCriteria.requiredProperties) {
				const item = criteriaList.createEl('li');
				item.createEl('span', { text: 'Required Properties: ' });
				item.createEl('code', { text: schema.matchCriteria.requiredProperties.join(', ') });
			}
			
			if (schema.matchCriteria.propertyValues) {
				const item = criteriaList.createEl('li');
				item.createEl('span', { text: 'Property Values: ' });
				item.createEl('code', { text: JSON.stringify(schema.matchCriteria.propertyValues) });
			}
		});
	}

	private addDiscoveredEntitiesSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Discovered Entities Preview' });

		// Header with scan info and refresh button
		const headerDiv = containerEl.createDiv();
		headerDiv.style.display = 'flex';
		headerDiv.style.justifyContent = 'space-between';
		headerDiv.style.alignItems = 'center';
		headerDiv.style.marginBottom = '15px';

		const infoDiv = headerDiv.createDiv();
		const lastScanTime = this.plugin.entityScanner.getLastScanTime();
		const totalEntities = this.plugin.entityScanner.getEntityInstances().length;
		
		infoDiv.createEl('p', { 
			text: `Total entities found: ${totalEntities}`,
			attr: { style: 'margin: 0; font-weight: bold;' }
		});
		
		if (lastScanTime) {
			infoDiv.createEl('p', { 
				text: `Last scan: ${lastScanTime.toLocaleString()}`,
				attr: { style: 'margin: 0; font-size: 0.9em; color: var(--text-muted);' }
			});
		}

		// Refresh button
		const refreshButton = headerDiv.createEl('button', { text: 'Refresh' });
		refreshButton.addEventListener('click', async () => {
			refreshButton.disabled = true;
			refreshButton.textContent = 'Scanning...';
			
			try {
				await this.plugin.scanEntities();
				this.display(); // Refresh the entire settings display
			} finally {
				refreshButton.disabled = false;
				refreshButton.textContent = 'Refresh';
			}
		});

		// Group entities by type
		const entitiesByType = this.plugin.entityScanner.getEntitiesGroupedByType();
		const entityTypes = Object.keys(entitiesByType).sort();

		if (entityTypes.length === 0) {
			const noEntitiesDiv = containerEl.createDiv();
			noEntitiesDiv.style.textAlign = 'center';
			noEntitiesDiv.style.padding = '20px';
			noEntitiesDiv.style.color = 'var(--text-muted)';
			noEntitiesDiv.createEl('p', { text: 'No entities discovered yet.' });
			noEntitiesDiv.createEl('p', { text: 'Click "Refresh" to scan for entities.' });
			return;
		}

		// Create collapsible sections for each entity type
		entityTypes.forEach(entityType => {
			const entities = entitiesByType[entityType];
			const validEntities = entities.filter(e => e.missingProperties.length === 0).length;
			const invalidEntities = entities.length - validEntities;

			// Entity type header (collapsible)
			const typeDiv = containerEl.createDiv();
			typeDiv.style.border = '1px solid var(--background-modifier-border)';
			typeDiv.style.borderRadius = '5px';
			typeDiv.style.marginBottom = '10px';

			const headerButton = typeDiv.createEl('button');
			headerButton.style.width = '100%';
			headerButton.style.padding = '10px 15px';
			headerButton.style.background = 'var(--background-secondary)';
			headerButton.style.border = 'none';
			headerButton.style.borderRadius = '5px 5px 0 0';
			headerButton.style.cursor = 'pointer';
			headerButton.style.textAlign = 'left';
			headerButton.style.display = 'flex';
			headerButton.style.justifyContent = 'space-between';
			headerButton.style.alignItems = 'center';

			const titleSpan = headerButton.createSpan();
			titleSpan.createEl('strong', { text: entityType });
			titleSpan.createEl('span', { text: ` (${entities.length} files)` });

			const statusSpan = headerButton.createSpan();
			statusSpan.style.fontSize = '0.9em';
			if (invalidEntities > 0) {
				statusSpan.createEl('span', { 
					text: `✓ ${validEntities} `,
					attr: { style: 'color: var(--text-success);' }
				});
				statusSpan.createEl('span', { 
					text: `⚠ ${invalidEntities}`,
					attr: { style: 'color: var(--text-warning);' }
				});
			} else {
				statusSpan.createEl('span', { 
					text: `✓ All valid`,
					attr: { style: 'color: var(--text-success);' }
				});
			}

			const expandIcon = headerButton.createSpan({ text: '▼' });
			expandIcon.style.fontSize = '0.8em';

			// Entity list (initially hidden)
			const entityListDiv = typeDiv.createDiv();
			entityListDiv.style.display = 'none';
			entityListDiv.style.padding = '0 15px 15px 15px';

			// Toggle functionality
			let isExpanded = false;
			headerButton.addEventListener('click', () => {
				isExpanded = !isExpanded;
				entityListDiv.style.display = isExpanded ? 'block' : 'none';
				expandIcon.textContent = isExpanded ? '▲' : '▼';
			});

			// Populate entity list
			entities.forEach(entity => {
				const entityDiv = entityListDiv.createDiv();
				entityDiv.style.padding = '8px 0';
				entityDiv.style.borderBottom = '1px solid var(--background-modifier-border-hover)';

				// File name (clickable)
				const fileLink = entityDiv.createEl('a');
				fileLink.textContent = entity.file.name;
				fileLink.style.fontWeight = 'bold';
				fileLink.style.cursor = 'pointer';
				fileLink.style.textDecoration = 'none';
				fileLink.addEventListener('click', (e) => {
					e.preventDefault();
					this.app.workspace.openLinkText(entity.file.path, '', false);
				});

				// File path
				const pathDiv = entityDiv.createDiv();
				pathDiv.style.fontSize = '0.85em';
				pathDiv.style.color = 'var(--text-muted)';
				pathDiv.textContent = entity.file.path;

				// Validation status
				const statusDiv = entityDiv.createDiv();
				statusDiv.style.fontSize = '0.85em';
				statusDiv.style.marginTop = '4px';

				if (entity.missingProperties.length === 0) {
					statusDiv.createEl('span', { 
						text: '✓ Valid',
						attr: { style: 'color: var(--text-success);' }
					});
				} else {
					statusDiv.createEl('span', { 
						text: `⚠ Missing: ${entity.missingProperties.join(', ')}`,
						attr: { style: 'color: var(--text-warning);' }
					});
				}
			});
		});
	}
}