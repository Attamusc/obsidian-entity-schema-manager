import { App, Notice, TFile } from 'obsidian';
import { EntitySchema, EntityInstance } from './types';

export class EntityScanner {
	private app: App;
	private entityInstances: EntityInstance[] = [];
	private lastScanTime: Date | null = null;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Scan all markdown files in the vault for entities matching the given schemas
	 */
	async scanEntities(schemas: EntitySchema[]): Promise<EntityInstance[]> {
		console.log('Entity Schema Manager: Starting entity scan...');
		this.entityInstances = [];
		this.lastScanTime = new Date();
		const files = this.app.vault.getMarkdownFiles();
		console.log(`Entity Schema Manager: Found ${files.length} markdown files to scan`);

		for (const file of files) {
			const metadata = this.app.metadataCache.getFileCache(file);
			if (!metadata?.frontmatter) {
				console.log(`Entity Schema Manager: Skipping ${file.path} - no frontmatter`);
				continue;
			}

			console.log(`Entity Schema Manager: Scanning ${file.path} with frontmatter`);
			let matchedSchema = false;

			for (const schema of schemas) {
				if (this.matchesSchema(file, metadata.frontmatter, schema)) {
					console.log(`Entity Schema Manager: ✓ ${file.path} matches "${schema.name}" entity type`);
					const missingProperties = this.getMissingProperties(metadata.frontmatter, schema);
					this.entityInstances.push({
						file,
						entityType: schema.name,
						properties: metadata.frontmatter,
						missingProperties
					});
					matchedSchema = true;
					break; // Only match first applicable schema
				}
			}

			if (!matchedSchema) {
				console.log(`Entity Schema Manager: ✗ ${file.path} does not match any entity schemas`);
			}
		}

		console.log(`Entity Schema Manager: Scan complete. Found ${this.entityInstances.length} entities`);
		new Notice(`Found ${this.entityInstances.length} entities`);
		return this.entityInstances;
	}

	/**
	 * Get the current entity instances
	 */
	getEntityInstances(): EntityInstance[] {
		return this.entityInstances;
	}

	/**
	 * Check if a file matches a given schema
	 */
	private matchesSchema(file: TFile, frontmatter: Record<string, unknown>, schema: EntitySchema): boolean {
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

	/**
	 * Compare property values with support for links, arrays, and case-insensitive strings
	 */
	private comparePropertyValues(actualValue: unknown, expectedValue: unknown): boolean {
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

	/**
	 * Check if a value is an Obsidian link
	 */
	private isObsidianLink(value: string): boolean {
		// Check for [[link]] or [[link|display]] format
		return /^\[\[.*\]\]$/.test(value.trim());
	}

	/**
	 * Compare links using Obsidian's API for proper resolution
	 */
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

	/**
	 * Extract the path from an Obsidian link
	 */
	private extractLinkPath(value: string): string {
		// If it's an Obsidian link [[path|display]], extract just the path
		if (this.isObsidianLink(value)) {
			const match = value.match(/^\[\[([^|]+)(?:\|.*?)?\]\]$/);
			return match ? match[1].trim() : value;
		}
		return value;
	}

	/**
	 * Compare a file path with a string in various formats
	 */
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

	/**
	 * Get missing properties for an entity based on its schema
	 */
	private getMissingProperties(frontmatter: Record<string, unknown>, schema: EntitySchema): string[] {
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

	/**
	 * Get validation summary for all entities
	 */
	getValidationSummary(): { total: number, valid: number, issues: string[] } {
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

		return {
			total: totalEntities,
			valid: validEntities,
			issues
		};
	}

	/**
	 * Get entities with schema drift (missing properties)
	 */
	getEntitiesWithDrift(): EntityInstance[] {
		return this.entityInstances.filter(e => e.missingProperties.length > 0);
	}

	/**
	 * Get entities by type
	 */
	getEntitiesByType(entityType: string): EntityInstance[] {
		return this.entityInstances.filter(e => e.entityType === entityType);
	}

	/**
	 * Get the last scan time
	 */
	getLastScanTime(): Date | null {
		return this.lastScanTime;
	}

	/**
	 * Get entities grouped by type with counts
	 */
	getEntitiesGroupedByType(): Record<string, EntityInstance[]> {
		return this.entityInstances.reduce((groups, entity) => {
			if (!groups[entity.entityType]) {
				groups[entity.entityType] = [];
			}
			groups[entity.entityType].push(entity);
			return groups;
		}, {} as Record<string, EntityInstance[]>);
	}
}
