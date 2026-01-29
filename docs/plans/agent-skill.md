# Plan: Entity Schema Manager Agent Skill

## Overview

Create a standalone `.skill` file that users can install into their vault-local `.opencode/skills/` directory. This skill will guide AI agents on how to interact with the Entity Schema Manager plugin to query, create, and manage entities.

## Goals

The skill should enable agents to:

1. **Query** entity types and schema definitions
2. **Identify** what type of entity a file represents
3. **Create** new entities with proper frontmatter
4. **Modify** entities (add/update properties)
5. **Validate** entities against their schemas
6. **Integrate** with Templater for template generation

## Skill Structure

```
entity-schema-manager/
├── SKILL.md                    # Main skill file with API usage patterns
└── references/
    └── schema-format.md        # Detailed schema structure reference
```

## SKILL.md Contents (~150 lines)

### Frontmatter

```yaml
name: entity-schema-manager
description: >
  Guide for interacting with the Obsidian Entity Schema Manager plugin.
  Use when working with entity types, schemas, or structured notes in an
  Obsidian vault. Triggers: creating entities, querying entity types,
  validating frontmatter, finding entities by type, understanding note
  schemas, generating entity templates.
```

### Body Sections

#### 1. Quick Start

How to access the API:
- Global namespace: `window['entity-schema-manager.api.v1']`
- Waiting for API: `waitForEntitySchemaAPI(timeout)`
- Checking availability: `isEntitySchemaAPIAvailable()`

#### 2. Common Operations

Code examples for each operation:

| Operation | Method | Returns |
|-----------|--------|---------|
| Get all entity types | `api.getEntityTypeNames()` | `['Person', 'Team', ...]` |
| Get entities by type | `api.getEntitiesByType('Person')` | `EntityInstance[]` |
| Get template for new entity | `api.getEntityTemplate('Person')` | `{name: '', role: '', ...}` |
| Check if type exists | `api.hasEntityType('Person')` | `boolean` |
| Get entity counts | `api.getEntitySummary()` | `{Person: 5, Team: 2}` |
| Validate entities | `api.getEntityValidation('Person')` | Validation result |
| Get full schemas | `api.getEntitySchemas()` | `EntitySchema[]` |

#### 3. Creating New Entities

Step-by-step workflow:
1. Get template via `api.getEntityTemplate(entityType)`
2. Get schema to determine correct folder: `api.getEntitySchemas().find(s => s.name === entityType)`
3. Generate YAML frontmatter from template
4. Create file at `{schema.matchCriteria.folderPath}/{filename}.md`

#### 4. Identifying Entity Type for a File

How to determine what entity type a file represents:
1. Read file frontmatter
2. Get all schemas via `api.getEntitySchemas()`
3. Match against each schema's `matchCriteria`:
   - Check `folderPath` matches file location
   - Check `requiredProperties` exist in frontmatter
   - Check `propertyValues` match (especially `is` property for atlas pattern)

#### 5. Templater Integration

Special helpers for Templater plugin users:
- `TemplaterHelpers.getEntityTypeSuggesterData()` - Data for `tp.system.suggester`
- `TemplaterHelpers.getEntitySuggesterData(entityType)` - Get entities for linking
- `TemplaterHelpers.generateFrontmatterYAML(entityType)` - Ready-to-use YAML

#### 6. File-based Fallback

When API is unavailable, read `entity-schemas.json` directly from vault root:
- Parse JSON to get schema definitions
- Use same matching logic as API

#### 7. Reference Link

Link to `references/schema-format.md` for detailed schema structure and TypeScript interfaces.

## references/schema-format.md Contents (~80 lines)

### Contents

1. **TypeScript Interfaces**
   - `EntitySchema` - Full schema definition
   - `PropertyDefinition` - Property type and metadata
   - `MatchCriteria` - How files are matched to schemas
   - `EntityInstance` - Discovered entity representation

2. **Example entity-schemas.json**
   ```json
   [
     {
       "name": "Person",
       "properties": {
         "name": { "type": "string", "required": true },
         "role": { "type": "string", "required": false }
       },
       "matchCriteria": {
         "folderPath": "atlas/notes",
         "requiredProperties": ["name", "is"],
         "propertyValues": { "is": "atlas/entities/person" }
       },
       "description": "Individual person entity"
     }
   ]
   ```

3. **MatchCriteria Explanation**
   - `folderPath` - File must be in this folder
   - `requiredProperties` - These properties must exist
   - `propertyValues` - Property values must match (supports Obsidian links)
   - `tagPattern` - Tags must contain pattern
   - `namePattern` - Filename must match pattern

4. **PropertyDefinition Types**
   - `string`, `number`, `boolean`, `array`, `object`
   - Optional fields: `required`, `defaultValue`, `description`

## Implementation Notes

### API Access Pattern

```javascript
// Recommended pattern for agents
const api = window['entity-schema-manager.api.v1'];
if (!api) {
  // Fall back to reading entity-schemas.json
  const schemas = JSON.parse(await app.vault.adapter.read('entity-schemas.json'));
}
```

### Atlas Organization Pattern

The default configuration uses an "atlas" pattern:
- `atlas/entities/` - Entity type definition files (person.md, team.md)
- `atlas/notes/` - Actual entity instance notes
- Files link to their type via `is: [[atlas/entities/person]]` property

### Key Considerations

1. **API-first approach**: Guide agents to use the JavaScript API when available
2. **Graceful fallback**: Include file-based approach for when API isn't accessible
3. **Practical examples**: Every operation includes runnable code
4. **Progressive disclosure**: Core operations in SKILL.md, detailed schema format in references/

## Output Location

The skill should be created at:
```
.opencode/skills/entity-schema-manager/
├── SKILL.md
└── references/
    └── schema-format.md
```

Users install by copying the `entity-schema-manager/` folder into their vault's `.opencode/skills/` directory.

## Success Criteria

- [x] Agent can query available entity types
- [x] Agent can determine entity type for a given file
- [x] Agent can create new entities with correct frontmatter
- [x] Agent can validate entities against schemas
- [x] Agent can use Templater helpers for template generation
- [x] Skill works with file-based fallback when API unavailable

## Implementation

The skill is implemented in two locations:

1. **Source files** at `.opencode/skills/entity-schema-manager/` - for development reference
2. **Bundled in plugin** via `src/skill-installer.ts` - embedded content for installation

### Installation Command

Users can install the skill via Obsidian command palette:

- **Command**: `Entity Schema Manager: Install agent skill`
- **Effect**: Creates `.opencode/skills/entity-schema-manager/` in the vault with SKILL.md and references/schema-format.md
