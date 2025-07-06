import { App, Notice } from 'obsidian';
import { EntityInstance, EntitySchemaSettings } from './types';

export class BulkOperations {
	private app: App;
	private getSettings: () => EntitySchemaSettings;

	constructor(app: App, getSettings: () => EntitySchemaSettings) {
		this.app = app;
		this.getSettings = getSettings;
	}

	/**
	 * Perform bulk property addition to multiple entities
	 */
	async performBulkPropertyAddition(
		entities: EntityInstance[], 
		propertyName: string, 
		defaultValue: any
	): Promise<{ success: number; errors: number }> {
		const settings = this.getSettings();
		if (settings.backupBeforeOperations) {
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
				if (settings.backupBeforeOperations) {
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
		return { success: successCount, errors: errorCount };
	}

	/**
	 * Add a property to the frontmatter of a file's content
	 */
	addPropertyToFrontmatter(content: string, propertyName: string, defaultValue: any): string {
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

	/**
	 * Format a value for YAML frontmatter
	 */
	formatValue(value: any): string {
		if (typeof value === 'string') {
			return `"${value}"`;
		} else if (Array.isArray(value)) {
			return `[${value.map(v => `"${v}"`).join(', ')}]`;
		}
		return String(value);
	}
}