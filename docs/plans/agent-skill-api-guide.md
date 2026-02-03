# Plan: Enhance Agent Skill with Detailed Inter-Plugin API Guide

## Overview

Enhance the Entity Schema Manager skill to provide comprehensive guidance for AI agents to answer entity-related questions. The improved skill will cover both in-Obsidian and external agent contexts, with complete code examples for queries, modifications, and troubleshooting.

## Current State

**Existing skill structure:**
- `skill.md` - Main skill file (~165 lines)
- `references/schema-format.md` - Detailed schema reference (~170 lines)

**Current coverage:**
- Basic API access pattern (`window['entity-schema-manager.api.v1']`)
- Query entity types/entities
- Create new entities
- Identify entity type for a file
- Templater integration (brief)
- File-based fallback
- Schema reference

**Gaps identified:**
1. **No detailed "agent workflow" patterns** - The skill shows API methods but doesn't guide an agent through complete question-answering workflows
2. **Missing lookup patterns for common questions** - No guidance on how to answer "Who are all the people on team X?" or "What entities reference person Y?"
3. **Limited validation/troubleshooting guidance** - Agent doesn't know how to help diagnose schema issues
4. **No entity relationship exploration** - How to traverse entity links
5. **Missing summary/statistics patterns** - How to provide aggregate information
6. **No error handling patterns** - What to do when things go wrong

## Goals

Enable agents to:
1. Answer common entity questions with complete code patterns
2. Work in both in-Obsidian and external (file-based) contexts
3. Modify entities safely with proper error handling
4. Diagnose and troubleshoot schema/entity issues
5. Explore entity relationships and references
6. Format responses appropriately for users

## Deliverables

| File | Action | Est. Lines Added |
|------|--------|-----------------|
| `.opencode/skills/entity-schema-manager/skill.md` | Major expansion | ~150 lines |
| `.opencode/skills/entity-schema-manager/references/agent-patterns.md` | **New file** | ~200 lines |
| `src/skill-installer.ts` | Sync both files inline | ~350 lines added |

## Detailed Changes

### 1. skill.md Expansion

#### A) New Section: "Environment Setup"

Add guidance for both agent contexts:

```markdown
## Environment Setup

### In-Obsidian Agents (via plugins like Smart Connections, Copilot)
```javascript
// Direct API access - primary method
const api = window['entity-schema-manager.api.v1'];

// Alternative: plugin registry access
const plugin = app.plugins.plugins['entity-schema-manager'];
const api = plugin?.api;
```

### External Agents (file-based access)
```javascript
// Read schema definitions directly
const schemasPath = `${vaultPath}/entity-schemas.json`;
const schemas = JSON.parse(fs.readFileSync(schemasPath, 'utf-8'));

// Read entities by scanning markdown files
// Use frontmatter parsing + schema matching logic
```
```

#### B) New Section: "Common Questions & Answers"

A quick-reference table mapping user questions to API calls:

| User Asks | API Pattern | Example Response |
|-----------|-------------|------------------|
| "What kinds of entities do I have?" | `api.getEntityTypeNames()` | "You have: Person, Team, Project" |
| "How many people are there?" | `api.getEntityCount('Person')` | "5 Person entities" |
| "Show me all teams" | `api.getEntitiesByType('Team')` | Table of team names and files |
| "What's missing from my entities?" | `api.getEntityValidation('Person')` | List of entities with missing props |
| "Who's on Team X?" | Filter entities by property | List of people with team=X |

#### C) New Section: "Modifying Entities"

```markdown
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
// Uses the plugin's BulkOperations internally
const entities = api.getEntitiesByType('Person');
for (const entity of entities) {
  await addProperty(entity.file, 'department', 'Engineering');
}
```
```

#### D) Expanded Section: "Identifying Entity Type"

More complete with edge case handling:

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
```

---

### 2. New Reference File: `references/agent-patterns.md`

**Structure:**

```markdown
# Agent Patterns Reference

Complete patterns for answering entity-related questions.

## Table of Contents
1. Query Patterns
2. Relationship Exploration
3. Validation & Diagnostics
4. Modification Patterns
5. Response Formatting
6. Error Handling
7. External Agent Patterns
```

#### Section 1: Query Patterns

```javascript
// List All Entities of Type with Properties
const people = api.getEntitiesByType('Person');
const result = people.map(p => ({
  name: p.properties.name || p.file.basename,
  file: p.file.path,
  properties: { ...p.properties },
  issues: p.missingProperties
}));

// Find Entities by Property Value
function findByProperty(entityType, propName, propValue) {
  const entities = api.getEntitiesByType(entityType);
  return entities.filter(e => {
    const val = e.properties[propName];
    if (val === propValue) return true;
    if (typeof val === 'string' && val.toLowerCase().includes(String(propValue).toLowerCase())) return true;
    if (String(val).includes(`[[${propValue}]]`)) return true; // Link match
    return false;
  });
}

// Get Entity by Name
function getEntityByName(entityType, name) {
  const entities = api.getEntitiesByType(entityType);
  return entities.find(e => 
    e.properties.name === name || 
    e.file.basename === name ||
    e.file.basename === `${name}.md`
  );
}
```

#### Section 2: Relationship Exploration

```javascript
// Find Entities Referencing Target
function findReferencesTo(targetPath) {
  const references = [];
  const types = api.getEntityTypeNames();
  
  for (const type of types) {
    const entities = api.getEntitiesByType(type);
    for (const entity of entities) {
      const propsStr = JSON.stringify(entity.properties);
      if (propsStr.includes(targetPath) || propsStr.includes(`[[${targetPath}]]`)) {
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

// Build Entity Relationship Map
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
  const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const propsStr = JSON.stringify(properties);
  let match;
  while ((match = linkRegex.exec(propsStr)) !== null) {
    links.push(match[1]);
  }
  return links;
}
```

#### Section 3: Validation & Diagnostics

```javascript
// Full Health Report
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

// Diagnose Why File Doesn't Match Schema
function diagnoseNonMatch(filePath, frontmatter, expectedType) {
  const schemas = api.getEntitySchemas();
  const schema = schemas.find(s => s.name === expectedType);
  if (!schema) return [`Schema '${expectedType}' not found`];
  
  const issues = [];
  const c = schema.matchCriteria;
  
  if (c.folderPath && !filePath.startsWith(c.folderPath)) {
    issues.push(`File not in folder '${c.folderPath}' (actual: '${filePath}')`);
  }
  
  if (c.requiredProperties) {
    const missing = c.requiredProperties.filter(p => !(p in frontmatter));
    if (missing.length) issues.push(`Missing required properties: ${missing.join(', ')}`);
  }
  
  if (c.propertyValues) {
    for (const [key, expected] of Object.entries(c.propertyValues)) {
      if (!propertyValuesMatch(frontmatter[key], expected)) {
        issues.push(`Property '${key}' should be '${expected}' but is '${frontmatter[key]}'`);
      }
    }
  }
  
  return issues.length ? issues : ['File matches schema correctly'];
}
```

#### Section 4: Modification Patterns

```javascript
// Safe Property Addition
async function safeAddProperty(entityOrPath, propName, value, options = {}) {
  const { backup = true, overwrite = false } = options;
  
  // Get file reference
  const file = typeof entityOrPath === 'string' 
    ? app.vault.getAbstractFileByPath(entityOrPath)
    : entityOrPath.file;
  
  if (!file) throw new Error(`File not found: ${entityOrPath}`);
  
  const content = await app.vault.read(file);
  
  // Check if property already exists
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  if (match && match[1].includes(`${propName}:`)) {
    if (!overwrite) {
      return { success: false, reason: 'Property already exists' };
    }
  }
  
  // Create backup if requested
  if (backup) {
    const backupPath = `entity-schema-backups/${file.name}.${Date.now()}.bak`;
    await app.vault.create(backupPath, content);
  }
  
  // Add property
  const newContent = addPropertyToFrontmatter(content, propName, value);
  await app.vault.modify(file, newContent);
  
  return { success: true };
}

// Batch Property Update
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
      results.errors.push(`${entity.file.path}: ${err.message}`);
    }
  }
  
  return results;
}
```

#### Section 5: Response Formatting

```javascript
// Format as Markdown Table
function formatAsTable(entities, columns = ['name', 'file', 'status']) {
  const headers = columns.map(c => c.charAt(0).toUpperCase() + c.slice(1));
  const separator = columns.map(() => '---');
  
  const rows = entities.map(e => columns.map(col => {
    switch(col) {
      case 'name': return e.properties.name || e.file.basename;
      case 'file': return e.file.path;
      case 'status': return e.missingProperties.length === 0 ? '✓' : `⚠ ${e.missingProperties.join(', ')}`;
      default: return e.properties[col] ?? '';
    }
  }));
  
  return [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`)
  ].join('\n');
}

// Format Summary
function formatSummary(summary) {
  const lines = ['## Entity Summary\n'];
  for (const [type, count] of Object.entries(summary)) {
    const validation = api.getEntityValidation(type);
    const status = validation.withIssues > 0 ? `⚠ ${validation.withIssues} issues` : '✓';
    lines.push(`- **${type}**: ${count} entities ${status}`);
  }
  return lines.join('\n');
}
```

#### Section 6: Error Handling

```javascript
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
```

#### Section 7: External Agent Patterns (File-based)

```javascript
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

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.parse(match[1]);
  } catch { return null; }
}
```

---

### 3. Update `src/skill-installer.ts`

Sync both files inline as string constants:
- `SKILL_MD_CONTENT` - Updated with expanded content
- `SCHEMA_FORMAT_MD_CONTENT` - Keep existing
- **New**: `AGENT_PATTERNS_MD_CONTENT` - New reference file content
- Update `installSkill()` to write all three files

---

## Implementation Tasks

- [ ] **Task 1**: Update `skill.md` - Add new sections for environment setup, common questions, and modification patterns
- [ ] **Task 2**: Create `references/agent-patterns.md` - New reference file with complete query, relationship, validation, modification, formatting, and error handling patterns
- [ ] **Task 3**: Update `src/skill-installer.ts` - Sync both files as inline constants, add installation of new reference file
- [ ] **Task 4**: Test - Verify skill installs correctly and content is accurate

## Estimated Effort

- **skill.md expansion**: ~150 new lines
- **agent-patterns.md (new)**: ~200 lines  
- **skill-installer.ts sync**: ~350 additional lines (content + installation logic)
- **Total new code**: ~700 lines

## Success Criteria

- [ ] Agent can answer "what entity types exist?" using API
- [ ] Agent can find entities by property value (e.g., "who's on team X?")
- [ ] Agent can explore entity relationships and references
- [ ] Agent can diagnose why a file doesn't match expected schema
- [ ] Agent can safely modify entity properties with backup
- [ ] Agent can format responses as tables or summaries
- [ ] Skill works for both in-Obsidian and external file-based agents
- [ ] `skill-installer.ts` installs all files correctly

## Related

- [Original Agent Skill Plan](./agent-skill.md)
- [API Documentation](../API.md)
