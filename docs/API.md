# API Documentation

## Core Interfaces

### EntitySchema

The main interface defining an entity type configuration.

```typescript
interface EntitySchema {
  name: string;                    // Display name for the entity type
  properties: Record<string, PropertyDefinition>;  // Property definitions
  matchCriteria: MatchCriteria;    // Rules for matching entities
  description?: string;            // Optional description
}
```

**Example:**
```typescript
const personSchema: EntitySchema = {
  name: "Person",
  description: "Individual person entity",
  properties: {
    name: { type: "string", required: true },
    role: { type: "string", required: false },
    email: { type: "string", required: false }
  },
  matchCriteria: {
    requiredProperties: ["name", "is"],
    folderPath: "atlas/notes",
    propertyValues: { "is": "atlas/entities/person" }
  }
};
```

### PropertyDefinition

Defines the structure and validation rules for entity properties.

```typescript
interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;      // Whether this property is mandatory
  defaultValue?: unknown;  // Default value when adding to entities
  description?: string;    // Documentation for the property
}
```

### MatchCriteria

Rules used to identify entities that belong to a specific schema.

```typescript
interface MatchCriteria {
  requiredProperties?: string[];           // Properties that must exist
  folderPath?: string;                    // Must be in this folder/subfolder
  tagPattern?: string;                    // Tags must contain this pattern
  namePattern?: string;                   // Filename must contain this text
  propertyValues?: Record<string, unknown>; // Properties must have specific values
}
```

**Property Value Matching:**
- **Exact Match**: Numbers, booleans, objects
- **Case-insensitive**: String values
- **Array Options**: Multiple acceptable values (OR logic)
- **Link Resolution**: Smart Obsidian link matching

### EntityInstance

Represents a discovered entity in the vault with validation results.

```typescript
interface EntityInstance {
  file: TFile;                    // Obsidian file reference
  entityType: string;             // Matched schema name
  properties: Record<string, unknown>;  // Frontmatter properties
  missingProperties: string[];    // Properties required by schema but missing
}
```

### EntitySchemaSettings

Plugin configuration and state.

```typescript
interface EntitySchemaSettings {
  schemas: EntitySchema[];              // Configured entity schemas
  backupBeforeOperations: boolean;      // Create backups before bulk ops
  showValidationIndicators: boolean;    // Show visual validation status
  schemaFilePath?: string;             // Custom schema file location
}
```

## Core Classes

### EntityScanner

Handles entity discovery and validation across the vault.

#### Methods

**`scanEntities(schemas: EntitySchema[]): Promise<EntityInstance[]>`**
- Scans all markdown files for entities matching provided schemas
- Returns array of discovered entity instances
- Updates internal cache and triggers UI notifications

**`getEntityInstances(): EntityInstance[]`**
- Returns currently cached entity instances
- Use after `scanEntities()` to get results

**`getValidationSummary(): ValidationResults`**
- Analyzes all entities for schema compliance
- Returns summary with total/valid counts and issue list

**`getEntitiesWithDrift(): EntityInstance[]`**
- Returns entities missing required properties
- Useful for identifying schema violations

**`getEntitiesByType(entityType: string): EntityInstance[]`**
- Filters entities by their matched schema type
- Used for bulk operations on specific entity types

**`getEntitiesGroupedByType(): Record<string, EntityInstance[]>`**
- Groups all entities by their schema type
- Returns object with type names as keys, entity arrays as values

### SchemaManager

Manages entity schema loading, validation, and persistence.

#### Methods

**`loadSchemas(): Promise<EntitySchema[]>`**
- Loads schemas from file or falls back to defaults
- Validates schema structure before returning
- Updates schema source tracking

**`saveSchemas(schemas: EntitySchema[]): Promise<boolean>`**
- Exports schemas to `entity-schemas.json` at vault root
- Returns success/failure status
- Creates human-readable JSON format

**`reloadSchemas(): Promise<EntitySchema[]>`**
- Forces reload from file, bypassing cache
- Useful after manual schema file edits

**`schemaFileExists(): Promise<boolean>`**
- Checks if schema file exists at vault root
- Used to enable/disable reload functionality

**`getSchemaSource(): SchemaSource`**
- Returns information about current schema source
- Indicates whether using file-based or hardcoded schemas

### BulkOperations

Handles bulk modifications across multiple entities.

#### Methods

**`performBulkPropertyAddition(entities: EntityInstance[], propertyName: string, defaultValue: unknown): Promise<{success: number; errors: number}>`**
- Adds a property to multiple entities' frontmatter
- Creates backups if enabled in settings
- Returns operation results with success/error counts

**`addPropertyToFrontmatter(content: string, propertyName: string, defaultValue: unknown): string`**
- Low-level method to add property to YAML frontmatter
- Handles files with or without existing frontmatter
- Preserves existing content structure

## Validation System

### ValidationResults

Structure returned by validation operations.

```typescript
interface ValidationResults {
  total: number;        // Total entities scanned
  valid: number;        // Entities passing validation
  issues: string[];     // Detailed issue descriptions
}
```

### Schema Validation

Schemas are validated for:
- **Structure**: Required fields present and correct types
- **Properties**: Valid type definitions and requirements
- **Match Criteria**: Properly formatted matching rules

### Entity Validation

Entities are validated against their matched schema for:
- **Required Properties**: All mandatory fields present
- **Property Types**: Values match expected types (basic validation)
- **Match Criteria**: Entity still matches its assigned schema

## File Operations

### Backup System

When `backupBeforeOperations` is enabled:
- Creates `entity-schema-backups/` folder if needed
- Backs up each file before modification
- Uses timestamped filenames: `{original}.backup.{timestamp}.md`

### Frontmatter Handling

The plugin safely manipulates YAML frontmatter:
- Preserves existing frontmatter structure
- Handles files without frontmatter (creates new block)
- Maintains proper YAML formatting
- Supports all property types (string, number, boolean, array, object)

## Link Resolution

Smart handling of Obsidian links in property values:

```typescript
// These all resolve to the same entity:
"[[atlas/entities/person.md|person]]"  // Full link with display
"[[atlas/entities/person.md]]"         // Full link without display  
"[[person.md]]"                        // Basename link
"person"                               // Basename without extension
"atlas/entities/person"                // Path without extension
```

## Error Handling

### Common Error Patterns

**JSON Parsing Errors**
- Schema file contains invalid JSON
- User input cannot be parsed as JSON
- Recovery: Fall back to defaults or request re-input

**File System Errors**
- Insufficient permissions for file operations
- Vault adapter unavailable
- Recovery: Show user error, skip operation

**Validation Errors**
- Schema structure invalid
- Entity doesn't match expected format
- Recovery: Log warning, continue with valid entities

### Error Recovery

All operations include error boundaries:
- Bulk operations continue on individual failures
- Invalid schemas are skipped with warnings
- File operation errors are caught and reported

## Extension Points

### Custom Property Types

Currently supports: `string`, `number`, `boolean`, `array`, `object`

Future extension possible through:
- Custom validation functions
- Type-specific default value generators
- Specialized UI input components

### Custom Match Criteria

Current criteria: `requiredProperties`, `folderPath`, `tagPattern`, `namePattern`, `propertyValues`

Extension possibilities:
- Custom matching functions
- Complex boolean logic (AND/OR/NOT)
- Date-based criteria
- Content-based matching

### Custom Operations

Beyond property addition, the framework supports:
- Property removal/modification
- Bulk content updates
- Schema migration operations
- Custom validation rules