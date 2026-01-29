# Schema Format Reference

Detailed TypeScript interfaces and schema structure for the Entity Schema Manager plugin.

## TypeScript Interfaces

### EntitySchema

```typescript
interface EntitySchema {
  name: string;                              // Entity type name (e.g., "Person")
  properties: Record<string, PropertyDefinition>;
  matchCriteria: MatchCriteria;
  description?: string;                      // Human-readable description
}
```

### PropertyDefinition

```typescript
interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;                        // Default: false
  defaultValue?: unknown;                    // Value for templates
  description?: string;                      // Property documentation
}
```

### MatchCriteria

```typescript
interface MatchCriteria {
  requiredProperties?: string[];             // Properties that must exist
  folderPath?: string;                       // File must be in this folder
  tagPattern?: string;                       // Tags must contain pattern
  namePattern?: string;                      // Filename must match pattern
  propertyValues?: Record<string, unknown>;  // Property values to match
}
```

### EntityInstance

```typescript
interface EntityInstance {
  file: TFile;                               // Obsidian file reference
  entityType: string;                        // Matched entity type name
  properties: Record<string, unknown>;       // All frontmatter properties
  missingProperties: string[];               // Missing required properties
}
```

## Example entity-schemas.json

```json
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
```

## MatchCriteria Details

### folderPath

File must be located within this folder path (prefix match).

```json
"folderPath": "atlas/notes"
// Matches: atlas/notes/john.md, atlas/notes/subfolder/jane.md
// Doesn't match: other/john.md
```

### requiredProperties

All listed properties must exist in frontmatter (value can be empty).

```json
"requiredProperties": ["name", "is"]
// File must have both 'name' and 'is' in frontmatter
```

### propertyValues

Property values must match exactly. Supports Obsidian link formats.

```json
"propertyValues": {
  "is": "atlas/entities/person"
}
// Matches frontmatter:
//   is: atlas/entities/person
//   is: "[[atlas/entities/person]]"
//   is: "[[atlas/entities/person|Person]]"
```

### tagPattern

File tags must contain this pattern.

```json
"tagPattern": "person"
// Matches files with tags: #person, #person/employee, #type/person
```

### namePattern

Filename must contain this pattern.

```json
"namePattern": "person-"
// Matches: person-john.md, person-jane.md
```

## Property Types

| Type | Description | Example Default |
|------|-------------|-----------------|
| `string` | Text value | `""` |
| `number` | Numeric value | `0` |
| `boolean` | True/false | `false` |
| `array` | List of values | `[]` |
| `object` | Nested object | `{}` |

## Validation

Entities are validated against their schema's required properties:

```javascript
const validation = api.getEntityValidation('Person');
// {
//   total: 5,           // Total entities of this type
//   valid: 4,           // Entities with all required properties
//   withIssues: 1,      // Entities missing properties
//   issues: ['john.md: missing email']
// }
```
