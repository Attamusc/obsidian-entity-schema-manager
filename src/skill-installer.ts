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

## Environment Setup

### In-Obsidian Agents (via plugins like Smart Connections, Copilot)

\`\`\`javascript
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
\`\`\`

### External Agents (file-based access)

\`\`\`javascript
// Read schema definitions directly
const schemasPath = \`\${vaultPath}/entity-schemas.json\`;
const schemas = JSON.parse(fs.readFileSync(schemasPath, 'utf-8'));

// Read entities by scanning markdown files
// Use frontmatter parsing + schema matching logic
// See references/agent-patterns.md for complete external agent patterns
\`\`\`

## Common Questions & Answers

Quick reference for mapping user questions to API calls:

| User Asks | API Pattern | Example Response |
|-----------|-------------|------------------|
| "What kinds of entities do I have?" | \`api.getEntityTypeNames()\` | "You have: Person, Team, Project" |
| "How many people are there?" | \`api.getEntitySummary()['Person']\` | "5 Person entities" |
| "Show me all teams" | \`api.getEntitiesByType('Team')\` | Table of team names and files |
| "What's missing from my entities?" | \`api.getEntityValidation('Person')\` | List of entities with missing props |
| "Who's on Team X?" | Filter entities by property | List of people with team=X |
| "What references this person?" | Traverse entity links | List of entities linking to target |

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

## Modifying Entities

### Add a Property to a Single Entity

\`\`\`javascript
// Read file, parse frontmatter, add property, write back
async function addProperty(file, propName, value) {
  const content = await app.vault.read(file);
  const newContent = addPropertyToFrontmatter(content, propName, value);
  await app.vault.modify(file, newContent);
}

function addPropertyToFrontmatter(content, propName, value) {
  const frontmatterRegex = /^---\\n([\\s\\S]*?)\\n---/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    const frontmatter = match[1];
    const newFrontmatter = \`\${frontmatter}\\n\${propName}: \${JSON.stringify(value)}\`;
    return content.replace(frontmatterRegex, \`---\\n\${newFrontmatter}\\n---\`);
  } else {
    // No existing frontmatter
    return \`---\\n\${propName}: \${JSON.stringify(value)}\\n---\\n\\n\${content}\`;
  }
}
\`\`\`

### Batch Updates (In-Obsidian only)

\`\`\`javascript
// Update property across all entities of a type
const entities = api.getEntitiesByType('Person');
for (const entity of entities) {
  await addProperty(entity.file, 'department', 'Engineering');
}
\`\`\`

## Identify Entity Type for File

Given a file and its frontmatter, determine its entity type with complete edge case handling:

\`\`\`javascript
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
    .replace(/^\\[\\[|\\]\\]$/g, '')  // Remove [[ and ]]
    .split('|')[0]                 // Remove display text
    .replace(/\\.md$/, '')          // Remove .md extension
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

## References

- **[references/schema-format.md](references/schema-format.md)** - Detailed schema structure and TypeScript interfaces
- **[references/agent-patterns.md](references/agent-patterns.md)** - Complete patterns for queries, relationships, validation, modification, and error handling

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

const AGENT_PATTERNS_MD_CONTENT = `# Agent Patterns Reference

Complete patterns for answering entity-related questions. Use these patterns to build comprehensive responses for users asking about their entities.

## Table of Contents

1. [Query Patterns](#query-patterns)
2. [Relationship Exploration](#relationship-exploration)
3. [Validation & Diagnostics](#validation--diagnostics)
4. [Modification Patterns](#modification-patterns)
5. [Response Formatting](#response-formatting)
6. [Error Handling](#error-handling)
7. [External Agent Patterns](#external-agent-patterns)

---

## Query Patterns

### List All Entities of Type with Properties

\`\`\`javascript
const people = api.getEntitiesByType('Person');
const result = people.map(p => ({
  name: p.properties.name || p.file.basename,
  file: p.file.path,
  properties: { ...p.properties },
  issues: p.missingProperties
}));
\`\`\`

### Find Entities by Property Value

\`\`\`javascript
function findByProperty(entityType, propName, propValue) {
  const entities = api.getEntitiesByType(entityType);
  return entities.filter(e => {
    const val = e.properties[propName];
    if (val === propValue) return true;
    if (typeof val === 'string' && val.toLowerCase().includes(String(propValue).toLowerCase())) return true;
    if (String(val).includes(\`[[\${propValue}]]\`)) return true; // Link match
    return false;
  });
}

// Usage: Find all people on team "Engineering"
const engineers = findByProperty('Person', 'team', 'Engineering');
\`\`\`

### Get Entity by Name

\`\`\`javascript
function getEntityByName(entityType, name) {
  const entities = api.getEntitiesByType(entityType);
  return entities.find(e => 
    e.properties.name === name || 
    e.file.basename === name ||
    e.file.basename === \`\${name}.md\`
  );
}

// Usage
const john = getEntityByName('Person', 'John Smith');
\`\`\`

### Get Counts and Summary Statistics

\`\`\`javascript
function getDetailedSummary() {
  const types = api.getEntityTypeNames();
  const summary = {};
  
  for (const type of types) {
    const entities = api.getEntitiesByType(type);
    const validation = api.getEntityValidation(type);
    
    summary[type] = {
      count: entities.length,
      valid: validation.valid,
      withIssues: validation.withIssues,
      issues: validation.issues
    };
  }
  
  return summary;
}
\`\`\`

---

## Relationship Exploration

### Find Entities Referencing Target

\`\`\`javascript
function findReferencesTo(targetPath) {
  const references = [];
  const types = api.getEntityTypeNames();
  
  for (const type of types) {
    const entities = api.getEntitiesByType(type);
    for (const entity of entities) {
      const propsStr = JSON.stringify(entity.properties);
      if (propsStr.includes(targetPath) || propsStr.includes(\`[[\${targetPath}]]\`)) {
        references.push({
          from: entity.file.path,
          type: entity.entityType,
          entity: entity
        });
      }
    }
  }
  return references;
}

// Usage: Find all entities that reference "John Smith"
const referencingEntities = findReferencesTo('atlas/notes/john-smith');
\`\`\`

### Build Entity Relationship Map

\`\`\`javascript
function buildRelationshipMap() {
  const types = api.getEntityTypeNames();
  const map = {};
  
  for (const type of types) {
    const entities = api.getEntitiesByType(type);
    for (const entity of entities) {
      const links = extractLinks(entity.properties);
      map[entity.file.path] = {
        type: type,
        linksTo: links,
        name: entity.properties.name || entity.file.basename
      };
    }
  }
  return map;
}

function extractLinks(properties) {
  const links = [];
  const linkRegex = /\\[\\[([^\\]|]+)(?:\\|[^\\]]+)?\\]\\]/g;
  const propsStr = JSON.stringify(properties);
  let match;
  while ((match = linkRegex.exec(propsStr)) !== null) {
    links.push(match[1]);
  }
  return links;
}
\`\`\`

### Find Related Entities by Type

\`\`\`javascript
function findRelatedByType(entity, relatedType) {
  const links = extractLinks(entity.properties);
  const related = api.getEntitiesByType(relatedType);
  
  return related.filter(r => 
    links.some(link => 
      r.file.path.includes(link) || 
      r.file.basename.replace('.md', '') === link
    )
  );
}

// Usage: Find all Teams that a Person is linked to
const person = getEntityByName('Person', 'John Smith');
const teams = findRelatedByType(person, 'Team');
\`\`\`

---

## Validation & Diagnostics

### Full Health Report

\`\`\`javascript
function getHealthReport() {
  const summary = api.getEntitySummary();
  const report = { types: {}, totalEntities: 0, totalIssues: 0 };
  
  for (const [type, count] of Object.entries(summary)) {
    const validation = api.getEntityValidation(type);
    report.types[type] = {
      count: count,
      valid: validation.valid,
      withIssues: validation.withIssues,
      issues: validation.issues
    };
    report.totalEntities += count;
    report.totalIssues += validation.withIssues;
  }
  return report;
}
\`\`\`

### Diagnose Why File Doesn't Match Schema

\`\`\`javascript
function diagnoseNonMatch(filePath, frontmatter, expectedType) {
  const schemas = api.getEntitySchemas();
  const schema = schemas.find(s => s.name === expectedType);
  if (!schema) return [\`Schema '\${expectedType}' not found\`];
  
  const issues = [];
  const c = schema.matchCriteria;
  
  if (c.folderPath && !filePath.startsWith(c.folderPath)) {
    issues.push(\`File not in folder '\${c.folderPath}' (actual: '\${filePath}')\`);
  }
  
  if (c.requiredProperties) {
    const missing = c.requiredProperties.filter(p => !(p in frontmatter));
    if (missing.length) issues.push(\`Missing required properties: \${missing.join(', ')}\`);
  }
  
  if (c.propertyValues) {
    for (const [key, expected] of Object.entries(c.propertyValues)) {
      if (!propertyValuesMatch(frontmatter[key], expected)) {
        issues.push(\`Property '\${key}' should be '\${expected}' but is '\${frontmatter[key]}'\`);
      }
    }
  }
  
  return issues.length ? issues : ['File matches schema correctly'];
}

function propertyValuesMatch(actual, expected) {
  const normalize = v => String(v || '')
    .replace(/^\\[\\[|\\]\\]$/g, '')
    .split('|')[0]
    .replace(/\\.md$/, '')
    .toLowerCase();
  
  return normalize(actual) === normalize(expected);
}
\`\`\`

### Find Orphaned Entities

\`\`\`javascript
function findOrphanedEntities() {
  const types = api.getEntityTypeNames();
  const allEntityPaths = new Set();
  const allLinks = new Set();
  
  // Collect all entity paths and links
  for (const type of types) {
    const entities = api.getEntitiesByType(type);
    for (const entity of entities) {
      allEntityPaths.add(entity.file.path);
      const links = extractLinks(entity.properties);
      links.forEach(link => allLinks.add(link));
    }
  }
  
  // Find entities not linked by any other entity
  const orphans = [];
  for (const path of allEntityPaths) {
    const basename = path.replace(/\\.md$/, '').split('/').pop();
    const isLinked = [...allLinks].some(link => 
      path.includes(link) || basename === link
    );
    if (!isLinked) {
      orphans.push(path);
    }
  }
  
  return orphans;
}
\`\`\`

---

## Modification Patterns

### Safe Property Addition

\`\`\`javascript
async function safeAddProperty(entityOrPath, propName, value, options = {}) {
  const { backup = true, overwrite = false } = options;
  
  // Get file reference
  const file = typeof entityOrPath === 'string' 
    ? app.vault.getAbstractFileByPath(entityOrPath)
    : entityOrPath.file;
  
  if (!file) throw new Error(\`File not found: \${entityOrPath}\`);
  
  const content = await app.vault.read(file);
  
  // Check if property already exists
  const frontmatterRegex = /^---\\n([\\s\\S]*?)\\n---/;
  const match = content.match(frontmatterRegex);
  if (match && match[1].includes(\`\${propName}:\`)) {
    if (!overwrite) {
      return { success: false, reason: 'Property already exists' };
    }
  }
  
  // Create backup if requested
  if (backup) {
    const backupPath = \`entity-schema-backups/\${file.name}.\${Date.now()}.bak\`;
    await app.vault.create(backupPath, content);
  }
  
  // Add property
  const newContent = addPropertyToFrontmatter(content, propName, value);
  await app.vault.modify(file, newContent);
  
  return { success: true };
}

function addPropertyToFrontmatter(content, propName, value) {
  const frontmatterRegex = /^---\\n([\\s\\S]*?)\\n---/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    const frontmatter = match[1];
    const newFrontmatter = \`\${frontmatter}\\n\${propName}: \${JSON.stringify(value)}\`;
    return content.replace(frontmatterRegex, \`---\\n\${newFrontmatter}\\n---\`);
  } else {
    return \`---\\n\${propName}: \${JSON.stringify(value)}\\n---\\n\\n\${content}\`;
  }
}
\`\`\`

### Batch Property Update

\`\`\`javascript
async function batchUpdateProperty(entityType, propName, valueOrFn) {
  const entities = api.getEntitiesByType(entityType);
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const entity of entities) {
    try {
      const value = typeof valueOrFn === 'function' 
        ? valueOrFn(entity) 
        : valueOrFn;
      await safeAddProperty(entity, propName, value);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(\`\${entity.file.path}: \${err.message}\`);
    }
  }
  
  return results;
}

// Usage: Add department to all people
const result = await batchUpdateProperty('Person', 'department', 'Engineering');

// Usage: Add computed property
const result = await batchUpdateProperty('Person', 'initials', entity => {
  const name = entity.properties.name || '';
  return name.split(' ').map(n => n[0]).join('');
});
\`\`\`

### Update Existing Property

\`\`\`javascript
async function updateProperty(entityOrPath, propName, newValue) {
  const file = typeof entityOrPath === 'string' 
    ? app.vault.getAbstractFileByPath(entityOrPath)
    : entityOrPath.file;
  
  if (!file) throw new Error(\`File not found: \${entityOrPath}\`);
  
  const content = await app.vault.read(file);
  const frontmatterRegex = /^---\\n([\\s\\S]*?)\\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) throw new Error('No frontmatter found');
  
  const frontmatter = match[1];
  const propRegex = new RegExp(\`^\${propName}:.*$\`, 'm');
  
  if (!propRegex.test(frontmatter)) {
    throw new Error(\`Property '\${propName}' not found\`);
  }
  
  const newFrontmatter = frontmatter.replace(
    propRegex, 
    \`\${propName}: \${JSON.stringify(newValue)}\`
  );
  
  const newContent = content.replace(frontmatterRegex, \`---\\n\${newFrontmatter}\\n---\`);
  await app.vault.modify(file, newContent);
  
  return { success: true };
}
\`\`\`

---

## Response Formatting

### Format as Markdown Table

\`\`\`javascript
function formatAsTable(entities, columns = ['name', 'file', 'status']) {
  const headers = columns.map(c => c.charAt(0).toUpperCase() + c.slice(1));
  const separator = columns.map(() => '---');
  
  const rows = entities.map(e => columns.map(col => {
    switch(col) {
      case 'name': return e.properties.name || e.file.basename;
      case 'file': return e.file.path;
      case 'status': return e.missingProperties.length === 0 ? '✓' : \`⚠ \${e.missingProperties.join(', ')}\`;
      default: return e.properties[col] ?? '';
    }
  }));
  
  return [
    \`| \${headers.join(' | ')} |\`,
    \`| \${separator.join(' | ')} |\`,
    ...rows.map(r => \`| \${r.join(' | ')} |\`)
  ].join('\\n');
}

// Usage
const people = api.getEntitiesByType('Person');
const table = formatAsTable(people, ['name', 'role', 'team', 'status']);
\`\`\`

### Format Summary

\`\`\`javascript
function formatSummary(summary) {
  const lines = ['## Entity Summary\\n'];
  for (const [type, count] of Object.entries(summary)) {
    const validation = api.getEntityValidation(type);
    const status = validation.withIssues > 0 ? \`⚠ \${validation.withIssues} issues\` : '✓';
    lines.push(\`- **\${type}**: \${count} entities \${status}\`);
  }
  return lines.join('\\n');
}
\`\`\`

### Format Entity Details

\`\`\`javascript
function formatEntityDetails(entity) {
  const lines = [
    \`## \${entity.properties.name || entity.file.basename}\`,
    \`**Type:** \${entity.entityType}\`,
    \`**File:** \${entity.file.path}\`,
    '',
    '### Properties',
  ];
  
  for (const [key, value] of Object.entries(entity.properties)) {
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    lines.push(\`- **\${key}:** \${displayValue}\`);
  }
  
  if (entity.missingProperties.length > 0) {
    lines.push('', '### Missing Required Properties');
    entity.missingProperties.forEach(p => lines.push(\`- \${p}\`));
  }
  
  return lines.join('\\n');
}
\`\`\`

### Format Health Report

\`\`\`javascript
function formatHealthReport(report) {
  const lines = [
    '# Entity Health Report',
    '',
    \`**Total Entities:** \${report.totalEntities}\`,
    \`**Total Issues:** \${report.totalIssues}\`,
    '',
    '## By Type',
  ];
  
  for (const [type, data] of Object.entries(report.types)) {
    const icon = data.withIssues > 0 ? '⚠️' : '✅';
    lines.push(\`### \${icon} \${type}\`);
    lines.push(\`- Count: \${data.count}\`);
    lines.push(\`- Valid: \${data.valid}\`);
    lines.push(\`- With Issues: \${data.withIssues}\`);
    
    if (data.issues.length > 0) {
      lines.push('- Issues:');
      data.issues.forEach(issue => lines.push(\`  - \${issue}\`));
    }
    lines.push('');
  }
  
  return lines.join('\\n');
}
\`\`\`

---

## Error Handling

### Safe API Call Wrapper

\`\`\`javascript
function safeAPICall(fn, fallback = null) {
  const api = window['entity-schema-manager.api.v1'];
  if (!api) {
    console.warn('Entity Schema Manager API not available');
    return fallback;
  }
  try {
    return fn(api);
  } catch (err) {
    console.error('API call failed:', err);
    return fallback;
  }
}

// Usage
const types = safeAPICall(api => api.getEntityTypeNames(), []);
const people = safeAPICall(api => api.getEntitiesByType('Person'), []);
\`\`\`

### Comprehensive Error Handling

\`\`\`javascript
async function safeEntityOperation(operation, entityType, options = {}) {
  const { onError = 'skip', logErrors = true } = options;
  const results = { success: [], failed: [], errors: [] };
  
  const api = window['entity-schema-manager.api.v1'];
  if (!api) {
    throw new Error('Entity Schema Manager API not available');
  }
  
  const entities = api.getEntitiesByType(entityType);
  
  for (const entity of entities) {
    try {
      const result = await operation(entity);
      results.success.push({ entity, result });
    } catch (err) {
      const error = { entity, error: err.message };
      results.failed.push(error);
      results.errors.push(\`\${entity.file.path}: \${err.message}\`);
      
      if (logErrors) {
        console.error(\`Error processing \${entity.file.path}:\`, err);
      }
      
      if (onError === 'throw') {
        throw err;
      }
    }
  }
  
  return results;
}
\`\`\`

### API Availability Check

\`\`\`javascript
function checkAPIAvailability() {
  const api = window['entity-schema-manager.api.v1'];
  
  if (!api) {
    return {
      available: false,
      reason: 'Plugin not loaded or API not exposed',
      suggestion: 'Ensure Entity Schema Manager plugin is installed and enabled'
    };
  }
  
  // Verify API methods exist
  const requiredMethods = [
    'getEntityTypeNames',
    'getEntitiesByType', 
    'getEntitySchemas',
    'getEntitySummary',
    'getEntityValidation'
  ];
  
  const missingMethods = requiredMethods.filter(m => typeof api[m] !== 'function');
  
  if (missingMethods.length > 0) {
    return {
      available: false,
      reason: \`API missing methods: \${missingMethods.join(', ')}\`,
      suggestion: 'Plugin may be outdated, try updating'
    };
  }
  
  return { available: true };
}
\`\`\`

---

## External Agent Patterns

For agents running outside Obsidian (file-based access):

### Load Vault Entities

\`\`\`javascript
const fs = require('fs');
const path = require('path');
const yaml = require('yaml'); // or use regex parsing

function loadVaultEntities(vaultPath) {
  // Load schemas
  const schemasPath = path.join(vaultPath, 'entity-schemas.json');
  const schemas = JSON.parse(fs.readFileSync(schemasPath, 'utf-8'));
  
  // Scan markdown files
  const entities = [];
  scanDirectory(vaultPath, (filePath, content) => {
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) return;
    
    for (const schema of schemas) {
      if (matchesSchema(filePath, frontmatter, schema)) {
        entities.push({
          file: { path: filePath, basename: path.basename(filePath) },
          entityType: schema.name,
          properties: frontmatter,
          missingProperties: findMissing(frontmatter, schema)
        });
        break;
      }
    }
  });
  
  return entities;
}
\`\`\`

### Parse Frontmatter

\`\`\`javascript
function parseFrontmatter(content) {
  const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);
  if (!match) return null;
  try {
    return yaml.parse(match[1]);
  } catch { return null; }
}
\`\`\`

### Scan Directory for Markdown Files

\`\`\`javascript
function scanDirectory(dir, callback) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip hidden directories
      if (!file.name.startsWith('.')) {
        scanDirectory(fullPath, callback);
      }
    } else if (file.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      callback(fullPath, content);
    }
  }
}
\`\`\`

### Schema Matching for External Agents

\`\`\`javascript
function matchesSchema(filePath, frontmatter, schema) {
  const c = schema.matchCriteria;
  
  // Check folder path
  if (c.folderPath && !filePath.includes(c.folderPath)) return false;
  
  // Check required properties exist
  if (c.requiredProperties) {
    for (const prop of c.requiredProperties) {
      if (!(prop in frontmatter)) return false;
    }
  }
  
  // Check property values
  if (c.propertyValues) {
    for (const [key, expected] of Object.entries(c.propertyValues)) {
      if (!propertyValuesMatch(frontmatter[key], expected)) return false;
    }
  }
  
  return true;
}

function findMissing(frontmatter, schema) {
  const missing = [];
  for (const [propName, propDef] of Object.entries(schema.properties)) {
    if (propDef.required && !(propName in frontmatter)) {
      missing.push(propName);
    }
  }
  return missing;
}
\`\`\`

### Complete External Agent Example

\`\`\`javascript
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class ExternalEntityManager {
  constructor(vaultPath) {
    this.vaultPath = vaultPath;
    this.schemas = this.loadSchemas();
    this.entities = this.loadEntities();
  }
  
  loadSchemas() {
    const schemasPath = path.join(this.vaultPath, 'entity-schemas.json');
    return JSON.parse(fs.readFileSync(schemasPath, 'utf-8'));
  }
  
  loadEntities() {
    const entities = [];
    this.scanDirectory(this.vaultPath, (filePath, content) => {
      const frontmatter = this.parseFrontmatter(content);
      if (!frontmatter) return;
      
      for (const schema of this.schemas) {
        if (this.matchesSchema(filePath, frontmatter, schema)) {
          entities.push({
            file: { path: filePath, basename: path.basename(filePath) },
            entityType: schema.name,
            properties: frontmatter,
            missingProperties: this.findMissing(frontmatter, schema)
          });
          break;
        }
      }
    });
    return entities;
  }
  
  // Implement API-compatible methods
  getEntityTypeNames() {
    return this.schemas.map(s => s.name);
  }
  
  getEntitiesByType(typeName) {
    return this.entities.filter(e => e.entityType === typeName);
  }
  
  getEntitySummary() {
    const summary = {};
    for (const entity of this.entities) {
      summary[entity.entityType] = (summary[entity.entityType] || 0) + 1;
    }
    return summary;
  }
  
  getEntityValidation(typeName) {
    const entities = this.getEntitiesByType(typeName);
    const withIssues = entities.filter(e => e.missingProperties.length > 0);
    return {
      total: entities.length,
      valid: entities.length - withIssues.length,
      withIssues: withIssues.length,
      issues: withIssues.map(e => \`\${e.file.basename}: missing \${e.missingProperties.join(', ')}\`)
    };
  }
  
  // Helper methods (parseFrontmatter, scanDirectory, matchesSchema, findMissing)
  // ... same as above
}

// Usage
const manager = new ExternalEntityManager('/path/to/vault');
const types = manager.getEntityTypeNames();
const people = manager.getEntitiesByType('Person');
\`\`\`
`;

const SKILL_DIR = '.opencode/skills/entity-schema-manager';
const SKILL_MD_PATH = `${SKILL_DIR}/SKILL.md`;
const REFERENCES_DIR = `${SKILL_DIR}/references`;
const SCHEMA_FORMAT_PATH = `${REFERENCES_DIR}/schema-format.md`;
const AGENT_PATTERNS_PATH = `${REFERENCES_DIR}/agent-patterns.md`;

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
			await this.app.vault.adapter.write(AGENT_PATTERNS_PATH, AGENT_PATTERNS_MD_CONTENT);

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
