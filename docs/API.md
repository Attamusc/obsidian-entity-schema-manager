# API Documentation

## Inter-Plugin Communication API

The Entity Schema Manager provides a comprehensive API for inter-plugin communication, enabling external plugins like Templater to seamlessly integrate with entity management functionality.

### Quick Start

```typescript
import { getEntitySchemaAPI, EntitySchemaUtils } from 'entity-schema-manager';

// Method 1: Direct API access
const api = getEntitySchemaAPI();
if (api) {
  const entityTypes = api.getEntityTypeNames();
  const template = api.getEntityTemplate('Person');
}

// Method 2: Utility class (recommended)
await EntitySchemaUtils.initialize();
const entityTypes = EntitySchemaUtils.getEntityTypesForPicker();
```

### Installation for External Plugins

To use the Entity Schema Manager API in your plugin:

1. **Import types and utilities:**
```typescript
import { 
  getEntitySchemaAPI, 
  EntitySchemaAPI, 
  waitForEntitySchemaAPI,
  EntitySchemaUtils 
} from 'entity-schema-manager';
```

2. **Initialize in your plugin:**
```typescript
class MyPlugin extends Plugin {
  async onload() {
    // Wait for Entity Schema Manager to load
    try {
      const api = await waitForEntitySchemaAPI(5000);
      console.log('Entity Schema Manager API available');
    } catch (error) {
      console.warn('Entity Schema Manager not available');
    }
  }
}
```

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

## Inter-Plugin Usage Examples

### Templater Integration

The Entity Schema Manager API is designed to work seamlessly with Templater for creating entity-based templates.

#### Entity Type Picker Template

```javascript
<%*
// Templater script for entity type selection
const { getEntitySchemaAPI, TemplaterHelpers } = await import('entity-schema-manager');

const api = getEntitySchemaAPI();
if (!api) {
  tR += "Entity Schema Manager not available";
  return;
}

// Get entity types for selection
const suggesterData = TemplaterHelpers.getEntityTypeSuggesterData();
if (suggesterData.names.length === 0) {
  tR += "No entity types configured";
  return;
}

// Show picker to user
const selectedType = await tp.system.suggester(
  suggesterData.names, 
  suggesterData.values,
  false,
  "Select entity type:"
);

if (!selectedType) return;

// Generate frontmatter for selected type
const frontmatter = TemplaterHelpers.generateFrontmatterYAML(selectedType);
tR += frontmatter;

// Add basic content structure
tR += `\n# ${selectedType}\n\n`;
tR += `<!-- Generated ${selectedType} entity -->\n`;
%>
```

#### Entity Reference Picker Template

```javascript
<%*
// Templater script for selecting existing entities
const { EntitySchemaUtils } = await import('entity-schema-manager');

// Initialize utility
const initialized = await EntitySchemaUtils.initialize(3000);
if (!initialized) {
  tR += "[[Entity not found]]";
  return;
}

// Get entity type from user
const entityTypes = EntitySchemaUtils.getEntityTypesForPicker();
const selectedType = await tp.system.suggester(
  entityTypes,
  entityTypes,
  false,
  "Select entity type to reference:"
);

if (!selectedType) return;

// Get entities of selected type
const entities = EntitySchemaUtils.getEntityNamesForDisplay(selectedType);
if (entities.length === 0) {
  tR += `No ${selectedType} entities found`;
  return;
}

// Show entity picker
const names = entities.map(e => e.name);
const paths = entities.map(e => e.path);

const selectedEntity = await tp.system.suggester(
  names,
  paths,
  false,
  `Select ${selectedType}:`
);

if (selectedEntity) {
  // Create link to selected entity
  const entityName = entities.find(e => e.path === selectedEntity)?.name;
  tR += `[[${selectedEntity}|${entityName}]]`;
}
%>
```

#### Dynamic Property Template

```javascript
<%*
// Templater script for entity creation with dynamic properties
const { getEntitySchemaAPI } = await import('entity-schema-manager');

const api = getEntitySchemaAPI();
if (!api) return "API not available";

// Get entity type (could be from filename or user input)
const entityType = await tp.system.prompt("Entity type:", "Person");

if (!api.hasEntityType(entityType)) {
  return `Unknown entity type: ${entityType}`;
}

// Get template for entity type
const template = api.getEntityTemplate(entityType);
const schemas = api.getEntitySchemas();
const schema = schemas.find(s => s.name === entityType);

// Generate frontmatter
tR += "---\n";

for (const [propName, defaultValue] of Object.entries(template)) {
  const propDef = schema?.properties[propName];
  const isRequired = propDef?.required ? " (required)" : "";
  
  if (propDef?.type === 'string' && propName !== 'is') {
    // Prompt for string values
    const value = await tp.system.prompt(
      `${propName}${isRequired}:`, 
      defaultValue as string
    );
    tR += `${propName}: "${value}"\n`;
  } else if (propDef?.type === 'array') {
    // Handle arrays
    tR += `${propName}: []\n`;
  } else {
    // Use default value
    if (typeof defaultValue === 'string') {
      tR += `${propName}: "${defaultValue}"\n`;
    } else {
      tR += `${propName}: ${JSON.stringify(defaultValue)}\n`;
    }
  }
}

tR += "---\n\n";

// Add entity name as title
const entityName = template.name || "New " + entityType;
tR += `# ${entityName}\n\n`;
%>
```

### Custom Plugin Integration

For custom plugins that want to integrate with Entity Schema Manager:

```typescript
import { getEntitySchemaAPI, waitForEntitySchemaAPI, EntitySchemaAPI } from 'entity-schema-manager';

class MyCustomPlugin extends Plugin {
  private entityAPI: EntitySchemaAPI | null = null;

  async onload() {
    // Wait for Entity Schema Manager to be available
    try {
      this.entityAPI = await waitForEntitySchemaAPI(5000);
      this.addCommand({
        id: 'create-entity-link',
        name: 'Create Entity Link',
        callback: () => this.createEntityLink()
      });
    } catch (error) {
      console.warn('Entity Schema Manager not available:', error);
    }
  }

  async createEntityLink() {
    if (!this.entityAPI) return;

    // Get all entity types
    const entityTypes = this.entityAPI.getEntityTypeNames();
    
    // Show type picker
    const typeModal = new EntityTypePickerModal(this.app, entityTypes, (selectedType) => {
      this.showEntityPicker(selectedType);
    });
    typeModal.open();
  }

  async showEntityPicker(entityType: string) {
    if (!this.entityAPI) return;

    // Get entities of selected type
    const entities = this.entityAPI.getEntitiesByType(entityType);
    
    // Show entity picker
    const entityModal = new EntityPickerModal(this.app, entities, (selectedEntity) => {
      // Insert link at cursor
      const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
      if (editor) {
        const linkText = `[[${selectedEntity.file.path}|${selectedEntity.properties.name}]]`;
        editor.replaceSelection(linkText);
      }
    });
    entityModal.open();
  }
}
```

### Entity Validation Integration

```typescript
import { getEntitySchemaAPI } from 'entity-schema-manager';

class EntityValidatorPlugin extends Plugin {
  async validateCurrentFile() {
    const api = getEntitySchemaAPI();
    if (!api) return;

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    // Check if current file is an entity
    const allEntities = [];
    for (const entityType of api.getEntityTypeNames()) {
      allEntities.push(...api.getEntitiesByType(entityType));
    }

    const currentEntity = allEntities.find(e => e.file.path === activeFile.path);
    if (!currentEntity) {
      new Notice('Current file is not a recognized entity');
      return;
    }

    // Get validation results
    const validation = api.getEntityValidation(currentEntity.entityType);
    const fileValidation = validation.issues.find(issue => 
      issue.includes(activeFile.name)
    );

    if (fileValidation) {
      new Notice(`Validation issues: ${fileValidation}`, 5000);
    } else {
      new Notice('Entity validation passed');
    }
  }
}
```

### Bulk Operations Integration

```typescript
import { getEntitySchemaAPI } from 'entity-schema-manager';

class BulkEntityProcessor extends Plugin {
  async addTagToAllEntities(entityType: string, tag: string) {
    const api = getEntitySchemaAPI();
    if (!api) return;

    const entities = api.getEntitiesByType(entityType);
    let processedCount = 0;

    for (const entity of entities) {
      try {
        await this.addTagToFile(entity.file, tag);
        processedCount++;
      } catch (error) {
        console.error(`Failed to add tag to ${entity.file.path}:`, error);
      }
    }

    new Notice(`Added tag "${tag}" to ${processedCount}/${entities.length} ${entityType} entities`);
  }

  private async addTagToFile(file: TFile, tag: string) {
    const content = await this.app.vault.read(file);
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (match) {
      // Add tag logic here
      // Implementation depends on your specific requirements
    }
  }
}
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