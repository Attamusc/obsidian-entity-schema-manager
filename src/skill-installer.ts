import { App, Notice } from 'obsidian';

const SKILL_MD_CONTENT = `---
name: entity-schema-manager
description: >
  Guide for interacting with the Obsidian Entity Schema Manager plugin.
  Use when working with entity types, schemas, or structured notes in an
  Obsidian vault. Triggers: creating entities, querying entity types,
  validating frontmatter, finding entities by type, understanding note
  schemas, generating entity templates, Templater integration.
---

# Entity Schema Manager

Interact with the Entity Schema Manager plugin to query, create, and manage structured entities in an Obsidian vault.

## API Access

\`\`\`javascript
// Get API instance
const api = window['entity-schema-manager.api.v1'];

// Check availability
if (!api) {
  // Fall back to reading entity-schemas.json from vault root
  const schemas = JSON.parse(await app.vault.adapter.read('entity-schemas.json'));
}
\`\`\`

## Common Operations

### Query Entity Types

\`\`\`javascript
// Get all entity type names
const types = api.getEntityTypeNames();  // ['Person', 'Team', ...]

// Check if type exists
const exists = api.hasEntityType('Person');  // true/false

// Get full schema definitions
const schemas = api.getEntitySchemas();
\`\`\`

### Query Entities

\`\`\`javascript
// Get all entities of a type
const people = api.getEntitiesByType('Person');
// Returns: [{ file, entityType, properties, missingProperties }]

// Get entity counts
const summary = api.getEntitySummary();  // { Person: 5, Team: 2 }

// Validate entities
const validation = api.getEntityValidation('Person');
// Returns: { total, valid, withIssues, issues: ['file.md: missing email'] }
\`\`\`

### Create New Entity

\`\`\`javascript
// 1. Get template with default values
const template = api.getEntityTemplate('Person');
// Returns: { name: '', role: '', team: '', is: 'atlas/entities/person' }

// 2. Get schema for folder path
const schema = api.getEntitySchemas().find(s => s.name === 'Person');
const folder = schema.matchCriteria.folderPath;  // 'atlas/notes'

// 3. Generate frontmatter YAML
const yaml = Object.entries(template)
  .map(([k, v]) => \`\${k}: \${JSON.stringify(v)}\`)
  .join('\\n');

// 4. Create file at correct location
const content = \`---\\n\${yaml}\\n---\\n\\n# \${entityName}\`;
await app.vault.create(\`\${folder}/\${filename}.md\`, content);
\`\`\`

### Identify Entity Type for File

\`\`\`javascript
// Given a file, determine its entity type
function getEntityType(file, frontmatter) {
  const schemas = api.getEntitySchemas();
  
  for (const schema of schemas) {
    const criteria = schema.matchCriteria;
    
    // Check folder path
    if (criteria.folderPath && !file.path.startsWith(criteria.folderPath)) continue;
    
    // Check required properties exist
    if (criteria.requiredProperties) {
      const missing = criteria.requiredProperties.filter(p => !(p in frontmatter));
      if (missing.length > 0) continue;
    }
    
    // Check property values match
    if (criteria.propertyValues) {
      const mismatch = Object.entries(criteria.propertyValues).some(([key, expected]) => {
        const actual = frontmatter[key];
        // Handle Obsidian links: [[path]] or [[path|display]]
        const normalize = v => String(v).replace(/^\\[\\[|\\]\\]$/g, '').split('|')[0];
        return normalize(actual) !== normalize(expected);
      });
      if (mismatch) continue;
    }
    
    return schema.name;  // Found matching schema
  }
  return null;  // No match
}
\`\`\`

## Templater Integration

For Templater plugin users:

\`\`\`javascript
// Get data for tp.system.suggester (entity type picker)
const { names, values } = TemplaterHelpers.getEntityTypeSuggesterData();
const selected = await tp.system.suggester(names, values);

// Get entities for linking
const { names, values } = TemplaterHelpers.getEntitySuggesterData('Person');
const person = await tp.system.suggester(names, values);

// Generate ready-to-use YAML frontmatter
const yaml = TemplaterHelpers.generateFrontmatterYAML('Person');
\`\`\`

## File-based Fallback

When API unavailable, read \`entity-schemas.json\` from vault root:

\`\`\`javascript
const content = await app.vault.adapter.read('entity-schemas.json');
const schemas = JSON.parse(content);

// schemas is array of EntitySchema objects with same structure as API
// Use matching logic above to identify entity types
\`\`\`

## Schema Reference

For detailed schema structure and TypeScript interfaces, see [references/schema-format.md](references/schema-format.md).

### Quick Reference

| Field | Type | Description |
|-------|------|-------------|
| \`name\` | string | Entity type name (e.g., "Person") |
| \`properties\` | object | Property definitions with type/required |
| \`matchCriteria.folderPath\` | string | Required folder prefix |
| \`matchCriteria.requiredProperties\` | string[] | Properties that must exist |
| \`matchCriteria.propertyValues\` | object | Property values to match |
| \`description\` | string | Human-readable description |

### Atlas Pattern

Default organization uses "atlas" folders:
- \`atlas/entities/\` - Entity type definitions (person.md, team.md)
- \`atlas/notes/\` - Entity instances
- Files link to type via \`is: [[atlas/entities/person]]\` property
`;

const SCHEMA_FORMAT_MD_CONTENT = `# Schema Format Reference

Detailed TypeScript interfaces and schema structure for the Entity Schema Manager plugin.

## TypeScript Interfaces

### EntitySchema

\`\`\`typescript
interface EntitySchema {
  name: string;                              // Entity type name (e.g., "Person")
  properties: Record<string, PropertyDefinition>;
  matchCriteria: MatchCriteria;
  description?: string;                      // Human-readable description
}
\`\`\`

### PropertyDefinition

\`\`\`typescript
interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;                        // Default: false
  defaultValue?: unknown;                    // Value for templates
  description?: string;                      // Property documentation
}
\`\`\`

### MatchCriteria

\`\`\`typescript
interface MatchCriteria {
  requiredProperties?: string[];             // Properties that must exist
  folderPath?: string;                       // File must be in this folder
  tagPattern?: string;                       // Tags must contain pattern
  namePattern?: string;                      // Filename must match pattern
  propertyValues?: Record<string, unknown>;  // Property values to match
}
\`\`\`

### EntityInstance

\`\`\`typescript
interface EntityInstance {
  file: TFile;                               // Obsidian file reference
  entityType: string;                        // Matched entity type name
  properties: Record<string, unknown>;       // All frontmatter properties
  missingProperties: string[];               // Missing required properties
}
\`\`\`

## Example entity-schemas.json

\`\`\`json
[
  {
    "name": "Person",
    "properties": {
      "name": { "type": "string", "required": true },
      "role": { "type": "string", "required": false },
      "team": { "type": "string", "required": false },
      "email": { "type": "string", "required": false }
    },
    "matchCriteria": {
      "requiredProperties": ["name", "is"],
      "folderPath": "atlas/notes",
      "propertyValues": {
        "is": "atlas/entities/person"
      }
    },
    "description": "Individual person entity"
  },
  {
    "name": "Team",
    "properties": {
      "name": { "type": "string", "required": true },
      "members": { "type": "array", "required": false },
      "lead": { "type": "string", "required": false }
    },
    "matchCriteria": {
      "requiredProperties": ["name", "is"],
      "folderPath": "atlas/notes",
      "propertyValues": {
        "is": "atlas/entities/team"
      }
    },
    "description": "Team or group entity"
  }
]
\`\`\`

## MatchCriteria Details

### folderPath

File must be located within this folder path (prefix match).

\`\`\`json
"folderPath": "atlas/notes"
// Matches: atlas/notes/john.md, atlas/notes/subfolder/jane.md
// Doesn't match: other/john.md
\`\`\`

### requiredProperties

All listed properties must exist in frontmatter (value can be empty).

\`\`\`json
"requiredProperties": ["name", "is"]
// File must have both 'name' and 'is' in frontmatter
\`\`\`

### propertyValues

Property values must match exactly. Supports Obsidian link formats.

\`\`\`json
"propertyValues": {
  "is": "atlas/entities/person"
}
// Matches frontmatter:
//   is: atlas/entities/person
//   is: "[[atlas/entities/person]]"
//   is: "[[atlas/entities/person|Person]]"
\`\`\`

### tagPattern

File tags must contain this pattern.

\`\`\`json
"tagPattern": "person"
// Matches files with tags: #person, #person/employee, #type/person
\`\`\`

### namePattern

Filename must contain this pattern.

\`\`\`json
"namePattern": "person-"
// Matches: person-john.md, person-jane.md
\`\`\`

## Property Types

| Type | Description | Example Default |
|------|-------------|-----------------|
| \`string\` | Text value | \`""\` |
| \`number\` | Numeric value | \`0\` |
| \`boolean\` | True/false | \`false\` |
| \`array\` | List of values | \`[]\` |
| \`object\` | Nested object | \`{}\` |

## Validation

Entities are validated against their schema's required properties:

\`\`\`javascript
const validation = api.getEntityValidation('Person');
// {
//   total: 5,           // Total entities of this type
//   valid: 4,           // Entities with all required properties
//   withIssues: 1,      // Entities missing properties
//   issues: ['john.md: missing email']
// }
\`\`\`
`;

const SKILL_DIR = '.opencode/skills/entity-schema-manager';
const SKILL_MD_PATH = `${SKILL_DIR}/SKILL.md`;
const REFERENCES_DIR = `${SKILL_DIR}/references`;
const SCHEMA_FORMAT_PATH = `${REFERENCES_DIR}/schema-format.md`;

export class SkillInstaller {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Install the agent skill to the vault
	 */
	async installSkill(): Promise<boolean> {
		try {
			// Create directories
			await this.ensureDirectory(SKILL_DIR);
			await this.ensureDirectory(REFERENCES_DIR);

			// Write skill files
			await this.app.vault.adapter.write(SKILL_MD_PATH, SKILL_MD_CONTENT);
			await this.app.vault.adapter.write(SCHEMA_FORMAT_PATH, SCHEMA_FORMAT_MD_CONTENT);

			console.log('Entity Schema Manager: Agent skill installed successfully');
			new Notice('Agent skill installed to .opencode/skills/entity-schema-manager/');
			return true;
		} catch (error) {
			console.error('Entity Schema Manager: Error installing agent skill:', error);
			new Notice('Error installing agent skill');
			return false;
		}
	}

	/**
	 * Check if the skill is already installed
	 */
	async isSkillInstalled(): Promise<boolean> {
		return await this.app.vault.adapter.exists(SKILL_MD_PATH);
	}

	/**
	 * Ensure a directory exists, creating it if necessary
	 */
	private async ensureDirectory(path: string): Promise<void> {
		if (!await this.app.vault.adapter.exists(path)) {
			await this.app.vault.adapter.mkdir(path);
		}
	}
}
