import { App, Notice } from 'obsidian';
import { EntitySchema, SchemaSource } from './types';

export class SchemaManager {
	private app: App;
	private schemaSource: SchemaSource;
	
	constructor(app: App) {
		this.app = app;
		this.schemaSource = { type: 'hardcoded' };
	}

	/**
	 * Default schemas that serve as fallback when no file is found
	 */
	private getDefaultSchemas(): EntitySchema[] {
		return [
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
		];
	}

	/**
	 * Load schemas with fallback hierarchy: file -> defaults
	 */
	async loadSchemas(): Promise<EntitySchema[]> {
		const schemaFilePath = this.getSchemaFilePath();
		
		try {
			// Try to load from file first
			if (await this.app.vault.adapter.exists(schemaFilePath)) {
				const fileContent = await this.app.vault.adapter.read(schemaFilePath);
				const schemas = JSON.parse(fileContent);
				
				// Validate the loaded schemas
				if (this.validateSchemas(schemas)) {
					console.log('Entity Schema Manager: Loaded schemas from file:', schemaFilePath);
					this.schemaSource = { 
						type: 'file', 
						path: schemaFilePath,
						lastModified: Date.now()
					};
					return schemas;
				} else {
					console.warn('Entity Schema Manager: Invalid schema file format, falling back to defaults');
					new Notice('Invalid schema file format, using defaults');
				}
			}
		} catch (error) {
			console.error('Entity Schema Manager: Error loading schema file:', error);
			new Notice('Error loading schema file, using defaults');
		}
		
		// Fall back to defaults
		console.log('Entity Schema Manager: Using default schemas');
		this.schemaSource = { type: 'hardcoded' };
		return this.getDefaultSchemas();
	}

	/**
	 * Save schemas to file at vault root
	 */
	async saveSchemas(schemas: EntitySchema[]): Promise<boolean> {
		const schemaFilePath = this.getSchemaFilePath();
		
		try {
			const content = JSON.stringify(schemas, null, 2);
			await this.app.vault.adapter.write(schemaFilePath, content);
			
			console.log('Entity Schema Manager: Saved schemas to file:', schemaFilePath);
			this.schemaSource = { 
				type: 'file', 
				path: schemaFilePath,
				lastModified: Date.now()
			};
			
			new Notice('Schemas exported successfully');
			return true;
		} catch (error) {
			console.error('Entity Schema Manager: Error saving schema file:', error);
			new Notice('Error saving schema file');
			return false;
		}
	}

	/**
	 * Get the full path to the schema file
	 */
	private getSchemaFilePath(): string {
		return 'entity-schemas.json';
	}

	/**
	 * Validate schema structure
	 */
	private validateSchemas(schemas: unknown): schemas is EntitySchema[] {
		if (!Array.isArray(schemas)) {
			return false;
		}

		return schemas.every(schema => {
			return (
				typeof schema === 'object' &&
				typeof schema.name === 'string' &&
				typeof schema.properties === 'object' &&
				typeof schema.matchCriteria === 'object' &&
				this.validateProperties(schema.properties) &&
				this.validateMatchCriteria(schema.matchCriteria)
			);
		});
	}

	/**
	 * Validate properties structure
	 */
	private validateProperties(properties: unknown): boolean {
		if (typeof properties !== 'object' || properties === null) {
			return false;
		}

		return Object.values(properties).every(prop => {
			return (
				typeof prop === 'object' &&
				prop !== null &&
				typeof (prop as Record<string, unknown>).type === 'string' &&
				['string', 'number', 'boolean', 'array', 'object'].includes((prop as Record<string, unknown>).type as string)
			);
		});
	}

	/**
	 * Validate match criteria structure
	 */
	private validateMatchCriteria(criteria: unknown): boolean {
		if (typeof criteria !== 'object' || criteria === null) {
			return false;
		}

		const criteriaObj = criteria as Record<string, unknown>;

		// All properties are optional, so we just check types if they exist
		if (criteriaObj.requiredProperties && !Array.isArray(criteriaObj.requiredProperties)) {
			return false;
		}
		if (criteriaObj.folderPath && typeof criteriaObj.folderPath !== 'string') {
			return false;
		}
		if (criteriaObj.tagPattern && typeof criteriaObj.tagPattern !== 'string') {
			return false;
		}
		if (criteriaObj.namePattern && typeof criteriaObj.namePattern !== 'string') {
			return false;
		}
		if (criteriaObj.propertyValues && typeof criteriaObj.propertyValues !== 'object') {
			return false;
		}

		return true;
	}

	/**
	 * Get information about the current schema source
	 */
	getSchemaSource(): SchemaSource {
		return this.schemaSource;
	}

	/**
	 * Check if schema file exists
	 */
	async schemaFileExists(): Promise<boolean> {
		return await this.app.vault.adapter.exists(this.getSchemaFilePath());
	}

	/**
	 * Reload schemas from file
	 */
	async reloadSchemas(): Promise<EntitySchema[]> {
		console.log('Entity Schema Manager: Reloading schemas...');
		return await this.loadSchemas();
	}
}