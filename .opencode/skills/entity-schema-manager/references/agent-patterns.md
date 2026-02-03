# Agent Patterns Reference

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

```javascript
const people = api.getEntitiesByType('Person');
const result = people.map(p => ({
  name: p.properties.name || p.file.basename,
  file: p.file.path,
  properties: { ...p.properties },
  issues: p.missingProperties
}));
```

### Find Entities by Property Value

```javascript
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

// Usage: Find all people on team "Engineering"
const engineers = findByProperty('Person', 'team', 'Engineering');
```

### Get Entity by Name

```javascript
function getEntityByName(entityType, name) {
  const entities = api.getEntitiesByType(entityType);
  return entities.find(e => 
    e.properties.name === name || 
    e.file.basename === name ||
    e.file.basename === `${name}.md`
  );
}

// Usage
const john = getEntityByName('Person', 'John Smith');
```

### Get Counts and Summary Statistics

```javascript
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
```

---

## Relationship Exploration

### Find Entities Referencing Target

```javascript
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

// Usage: Find all entities that reference "John Smith"
const referencingEntities = findReferencesTo('atlas/notes/john-smith');
```

### Build Entity Relationship Map

```javascript
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

### Find Related Entities by Type

```javascript
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
```

---

## Validation & Diagnostics

### Full Health Report

```javascript
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
```

### Diagnose Why File Doesn't Match Schema

```javascript
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

function propertyValuesMatch(actual, expected) {
  const normalize = v => String(v || '')
    .replace(/^\[\[|\]\]$/g, '')
    .split('|')[0]
    .replace(/\.md$/, '')
    .toLowerCase();
  
  return normalize(actual) === normalize(expected);
}
```

### Find Orphaned Entities

```javascript
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
    const basename = path.replace(/\.md$/, '').split('/').pop();
    const isLinked = [...allLinks].some(link => 
      path.includes(link) || basename === link
    );
    if (!isLinked) {
      orphans.push(path);
    }
  }
  
  return orphans;
}
```

---

## Modification Patterns

### Safe Property Addition

```javascript
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

function addPropertyToFrontmatter(content, propName, value) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    const frontmatter = match[1];
    const newFrontmatter = `${frontmatter}\n${propName}: ${JSON.stringify(value)}`;
    return content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
  } else {
    return `---\n${propName}: ${JSON.stringify(value)}\n---\n\n${content}`;
  }
}
```

### Batch Property Update

```javascript
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

// Usage: Add department to all people
const result = await batchUpdateProperty('Person', 'department', 'Engineering');

// Usage: Add computed property
const result = await batchUpdateProperty('Person', 'initials', entity => {
  const name = entity.properties.name || '';
  return name.split(' ').map(n => n[0]).join('');
});
```

### Update Existing Property

```javascript
async function updateProperty(entityOrPath, propName, newValue) {
  const file = typeof entityOrPath === 'string' 
    ? app.vault.getAbstractFileByPath(entityOrPath)
    : entityOrPath.file;
  
  if (!file) throw new Error(`File not found: ${entityOrPath}`);
  
  const content = await app.vault.read(file);
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) throw new Error('No frontmatter found');
  
  const frontmatter = match[1];
  const propRegex = new RegExp(`^${propName}:.*$`, 'm');
  
  if (!propRegex.test(frontmatter)) {
    throw new Error(`Property '${propName}' not found`);
  }
  
  const newFrontmatter = frontmatter.replace(
    propRegex, 
    `${propName}: ${JSON.stringify(newValue)}`
  );
  
  const newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
  await app.vault.modify(file, newContent);
  
  return { success: true };
}
```

---

## Response Formatting

### Format as Markdown Table

```javascript
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

// Usage
const people = api.getEntitiesByType('Person');
const table = formatAsTable(people, ['name', 'role', 'team', 'status']);
```

### Format Summary

```javascript
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

### Format Entity Details

```javascript
function formatEntityDetails(entity) {
  const lines = [
    `## ${entity.properties.name || entity.file.basename}`,
    `**Type:** ${entity.entityType}`,
    `**File:** ${entity.file.path}`,
    '',
    '### Properties',
  ];
  
  for (const [key, value] of Object.entries(entity.properties)) {
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    lines.push(`- **${key}:** ${displayValue}`);
  }
  
  if (entity.missingProperties.length > 0) {
    lines.push('', '### Missing Required Properties');
    entity.missingProperties.forEach(p => lines.push(`- ${p}`));
  }
  
  return lines.join('\n');
}
```

### Format Health Report

```javascript
function formatHealthReport(report) {
  const lines = [
    '# Entity Health Report',
    '',
    `**Total Entities:** ${report.totalEntities}`,
    `**Total Issues:** ${report.totalIssues}`,
    '',
    '## By Type',
  ];
  
  for (const [type, data] of Object.entries(report.types)) {
    const icon = data.withIssues > 0 ? '⚠️' : '✅';
    lines.push(`### ${icon} ${type}`);
    lines.push(`- Count: ${data.count}`);
    lines.push(`- Valid: ${data.valid}`);
    lines.push(`- With Issues: ${data.withIssues}`);
    
    if (data.issues.length > 0) {
      lines.push('- Issues:');
      data.issues.forEach(issue => lines.push(`  - ${issue}`));
    }
    lines.push('');
  }
  
  return lines.join('\n');
}
```

---

## Error Handling

### Safe API Call Wrapper

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
const people = safeAPICall(api => api.getEntitiesByType('Person'), []);
```

### Comprehensive Error Handling

```javascript
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
      results.errors.push(`${entity.file.path}: ${err.message}`);
      
      if (logErrors) {
        console.error(`Error processing ${entity.file.path}:`, err);
      }
      
      if (onError === 'throw') {
        throw err;
      }
    }
  }
  
  return results;
}
```

### API Availability Check

```javascript
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
      reason: `API missing methods: ${missingMethods.join(', ')}`,
      suggestion: 'Plugin may be outdated, try updating'
    };
  }
  
  return { available: true };
}
```

---

## External Agent Patterns

For agents running outside Obsidian (file-based access):

### Load Vault Entities

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
```

### Parse Frontmatter

```javascript
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.parse(match[1]);
  } catch { return null; }
}
```

### Scan Directory for Markdown Files

```javascript
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
```

### Schema Matching for External Agents

```javascript
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
```

### Complete External Agent Example

```javascript
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
      issues: withIssues.map(e => `${e.file.basename}: missing ${e.missingProperties.join(', ')}`)
    };
  }
  
  // Helper methods (parseFrontmatter, scanDirectory, matchesSchema, findMissing)
  // ... same as above
}

// Usage
const manager = new ExternalEntityManager('/path/to/vault');
const types = manager.getEntityTypeNames();
const people = manager.getEntitiesByType('Person');
```
