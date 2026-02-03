---
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

## Environment Setup

### In-Obsidian Agents (via plugins like Smart Connections, Copilot)

```javascript
// Direct API access - primary method
const api = window['entity-schema-manager.api.v1'];

// Alternative: plugin registry access
const plugin = app.plugins.plugins['entity-schema-manager'];
const api = plugin?.api;

// Check availability
if (!api) {
  // Fall back to reading entity-schemas.json from vault root
  const schemas = JSON.parse(await app.vault.adapter.read('entity-schemas.json'));
}
```

### External Agents (file-based access)

```javascript
// Read schema definitions directly
const schemasPath = `${vaultPath}/entity-schemas.json`;
const schemas = JSON.parse(fs.readFileSync(schemasPath, 'utf-8'));

// Read entities by scanning markdown files
// Use frontmatter parsing + schema matching logic
// See references/agent-patterns.md for complete external agent patterns
```

## Common Questions & Answers

Quick reference for mapping user questions to API calls:

| User Asks | API Pattern | Example Response |
|-----------|-------------|------------------|
| "What kinds of entities do I have?" | `api.getEntityTypeNames()` | "You have: Person, Team, Project" |
| "How many people are there?" | `api.getEntitySummary()['Person']` | "5 Person entities" |
| "Show me all teams" | `api.getEntitiesByType('Team')` | Table of team names and files |
| "What's missing from my entities?" | `api.getEntityValidation('Person')` | List of entities with missing props |
| "Who's on Team X?" | Filter entities by property | List of people with team=X |
| "What references this person?" | Traverse entity links | List of entities linking to target |

## Common Operations

### Query Entity Types

```javascript
// Get all entity type names
const types = api.getEntityTypeNames();  // ['Person', 'Team', ...]

// Check if type exists
const exists = api.hasEntityType('Person');  // true/false

// Get full schema definitions
const schemas = api.getEntitySchemas();
```

### Query Entities

```javascript
// Get all entities of a type
const people = api.getEntitiesByType('Person');
// Returns: [{ file, entityType, properties, missingProperties }]

// Get entity counts
const summary = api.getEntitySummary();  // { Person: 5, Team: 2 }

// Validate entities
const validation = api.getEntityValidation('Person');
// Returns: { total, valid, withIssues, issues: ['file.md: missing email'] }
```

### Create New Entity

```javascript
// 1. Get template with default values
const template = api.getEntityTemplate('Person');
// Returns: { name: '', role: '', team: '', is: 'atlas/entities/person' }

// 2. Get schema for folder path
const schema = api.getEntitySchemas().find(s => s.name === 'Person');
const folder = schema.matchCriteria.folderPath;  // 'atlas/notes'

// 3. Generate frontmatter YAML
const yaml = Object.entries(template)
  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
  .join('\n');

// 4. Create file at correct location
const content = `---\n${yaml}\n---\n\n# ${entityName}`;
await app.vault.create(`${folder}/${filename}.md`, content);
```

## Modifying Entities

### Add a Property to a Single Entity

```javascript
// Read file, parse frontmatter, add property, write back
async function addProperty(file, propName, value) {
  const content = await app.vault.read(file);
  const newContent = addPropertyToFrontmatter(content, propName, value);
  await app.vault.modify(file, newContent);
}

function addPropertyToFrontmatter(content, propName, value) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    const frontmatter = match[1];
    const newFrontmatter = `${frontmatter}\n${propName}: ${JSON.stringify(value)}`;
    return content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
  } else {
    // No existing frontmatter
    return `---\n${propName}: ${JSON.stringify(value)}\n---\n\n${content}`;
  }
}
```

### Batch Updates (In-Obsidian only)

```javascript
// Update property across all entities of a type
const entities = api.getEntitiesByType('Person');
for (const entity of entities) {
  await addProperty(entity.file, 'department', 'Engineering');
}
```

## Identify Entity Type for File

Given a file and its frontmatter, determine its entity type with complete edge case handling:

```javascript
function identifyEntityType(file, frontmatter) {
  const schemas = api.getEntitySchemas();
  
  for (const schema of schemas) {
    if (matchesSchema(file, frontmatter, schema)) {
      return {
        type: schema.name,
        schema: schema,
        missingRequired: findMissingRequired(frontmatter, schema)
      };
    }
  }
  return { type: null, schema: null, missingRequired: [] };
}

function matchesSchema(file, frontmatter, schema) {
  const c = schema.matchCriteria;
  
  // Check folder path
  if (c.folderPath && !file.path.startsWith(c.folderPath)) return false;
  
  // Check required properties exist
  if (c.requiredProperties) {
    for (const prop of c.requiredProperties) {
      if (!(prop in frontmatter)) return false;
    }
  }
  
  // Check property values (with Obsidian link normalization)
  if (c.propertyValues) {
    for (const [key, expected] of Object.entries(c.propertyValues)) {
      if (!propertyValuesMatch(frontmatter[key], expected)) return false;
    }
  }
  
  return true;
}

function propertyValuesMatch(actual, expected) {
  const normalize = v => String(v || '')
    .replace(/^\[\[|\]\]$/g, '')  // Remove [[ and ]]
    .split('|')[0]                 // Remove display text
    .replace(/\.md$/, '')          // Remove .md extension
    .toLowerCase();
  
  return normalize(actual) === normalize(expected);
}

function findMissingRequired(frontmatter, schema) {
  const missing = [];
  for (const [propName, propDef] of Object.entries(schema.properties)) {
    if (propDef.required && !(propName in frontmatter)) {
      missing.push(propName);
    }
  }
  return missing;
}
```

## Templater Integration

For Templater plugin users:

```javascript
// Get data for tp.system.suggester (entity type picker)
const { names, values } = TemplaterHelpers.getEntityTypeSuggesterData();
const selected = await tp.system.suggester(names, values);

// Get entities for linking
const { names, values } = TemplaterHelpers.getEntitySuggesterData('Person');
const person = await tp.system.suggester(names, values);

// Generate ready-to-use YAML frontmatter
const yaml = TemplaterHelpers.generateFrontmatterYAML('Person');
```

## File-based Fallback

When API unavailable, read `entity-schemas.json` from vault root:

```javascript
const content = await app.vault.adapter.read('entity-schemas.json');
const schemas = JSON.parse(content);

// schemas is array of EntitySchema objects with same structure as API
// Use matching logic above to identify entity types
```

## References

- **[references/schema-format.md](references/schema-format.md)** - Detailed schema structure and TypeScript interfaces
- **[references/agent-patterns.md](references/agent-patterns.md)** - Complete patterns for queries, relationships, validation, modification, and error handling

### Quick Reference

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Entity type name (e.g., "Person") |
| `properties` | object | Property definitions with type/required |
| `matchCriteria.folderPath` | string | Required folder prefix |
| `matchCriteria.requiredProperties` | string[] | Properties that must exist |
| `matchCriteria.propertyValues` | object | Property values to match |
| `description` | string | Human-readable description |

### Atlas Pattern

Default organization uses "atlas" folders:
- `atlas/entities/` - Entity type definitions (person.md, team.md)
- `atlas/notes/` - Entity instances
- Files link to type via `is: [[atlas/entities/person]]` property
