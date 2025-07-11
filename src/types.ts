import { TFile } from 'obsidian';

export interface EntitySchema {
	name: string;
	properties: Record<string, PropertyDefinition>;
	matchCriteria: MatchCriteria;
	description?: string;
}

export interface PropertyDefinition {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	required?: boolean;
	defaultValue?: unknown;
	description?: string;
}

export interface MatchCriteria {
	requiredProperties?: string[];
	folderPath?: string;
	tagPattern?: string;
	namePattern?: string;
	propertyValues?: Record<string, unknown>;
}

export interface EntityInstance {
	file: TFile;
	entityType: string;
	properties: Record<string, unknown>;
	missingProperties: string[];
}

export interface EntitySchemaSettings {
	schemas: EntitySchema[];
	backupBeforeOperations: boolean;
	showValidationIndicators: boolean;
	schemaFilePath?: string;
}

export interface ValidationResults {
	total: number;
	valid: number;
	issues: string[];
}

export interface SchemaSource {
	type: 'hardcoded' | 'file';
	path?: string;
	lastModified?: number;
}