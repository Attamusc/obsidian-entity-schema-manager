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

## API Access

```javascript
// Get API instance
const api = window['entity-schema-manager.api.v1'];

// Check availability
if (!api) {
  // Fall back to reading entity-schemas.json from vault root
  const schemas = JSON.parse(await app.vault.adapter.read('entity-schemas.json'));
}
```

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

### Identify Entity Type for File

```javascript
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
        const normalize = v => String(v).replace(/^\[\[|\]\]$/g, '').split('|')[0];
        return normalize(actual) !== normalize(expected);
      });
      if (mismatch) continue;
    }
    
    return schema.name;  // Found matching schema
  }
  return null;  // No match
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

## Schema Reference

For detailed schema structure and TypeScript interfaces, see [references/schema-format.md](references/schema-format.md).

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
