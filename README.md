# Entity Schema Manager Plugin

A powerful Obsidian plugin that helps you manage entity schemas and perform bulk operations on note properties. Perfect for maintaining consistent metadata across your entity-based note-taking system.

## 📚 Documentation

- **[📖 User Guide](README.md)** - Complete setup and usage guide (this document)
- **[🔧 API Documentation](docs/API.md)** - Developer interface reference
- **[🏗️ Architecture Guide](docs/ARCHITECTURE.md)** - System design and structure
- **[📋 Documentation Index](docs/INDEX.md)** - Complete project documentation index
- **[🤖 Development Guide](CLAUDE.md)** - Claude Code integration instructions

## Features

- **Entity Type Management**: Define and manage different types of entities (Person, Team, Project, etc.)
- **Schema Validation**: Validate entities against their defined schemas
- **Bulk Property Operations**: Add properties to multiple entities at once
- **Schema Drift Detection**: Identify entities missing required properties
- **Safe Operations**: Automatic backups before bulk operations
- **Flexible Matching**: Match entities by properties, folder paths, tags, or name patterns

## Installation

### Manual Installation

1. Download the plugin files (`main.js`, `manifest.json`, `styles.css`)
2. Create a new folder in your vault's `.obsidian/plugins/` directory called `entity-schema-manager`
3. Place the downloaded files in this folder
4. Reload Obsidian or restart the app
5. Enable the plugin in Settings > Community Plugins

### Development Installation

1. Clone this repository to your vault's `.obsidian/plugins/` directory
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile the plugin
4. Reload Obsidian and enable the plugin

## Usage

### Initial Setup

1. Open the plugin settings (Settings > Entity Schema Manager)
2. Review the default entity schemas (Person, Team) or create your own
3. Run the "Scan for entities" command to index your existing notes

### Basic Workflow

1. **Scan Entities**: Use the command palette (`Ctrl/Cmd + P`) and run "Entity Schema Manager: Scan for entities"
2. **View Dashboard**: Click the database icon in the ribbon or use "Entity Schema Manager: Show dashboard"
3. **Add Properties**: Use "Entity Schema Manager: Add property to entity type" to bulk-add properties
4. **Validate**: Run "Entity Schema Manager: Validate all entities" to check for schema compliance

### Entity Schema Configuration

Entity schemas are defined with the following structure:

```json
{
  "name": "Person",
  "description": "Individual person entity",
  "properties": {
    "name": { "type": "string", "required": true },
    "role": { "type": "string", "required": false },
    "team": { "type": "string", "required": false },
    "email": { "type": "string", "required": false }
  },
  "matchCriteria": {
    "requiredProperties": ["name"],
    "folderPath": "People"
  }
}
```

#### Property Types

- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `array`: Lists of values
- `object`: Complex nested data

#### Match Criteria

- `requiredProperties`: Properties that must exist for an entity to match this schema
- `folderPath`: Notes must be in this folder (or subfolder)
- `tagPattern`: Notes must contain tags matching this pattern
- `namePattern`: Note filename must contain this text
- `propertyValues`: Properties must have specific values (supports exact match, case-insensitive strings, and array options)

### Common Use Cases

#### Creating Specialized Entity Types Based on Property Values

You can now create more specific entity types that inherit from broader categories:

```json
{
  "name": "GitHub Employee",
  "description": "Employees working at GitHub",
  "properties": {
    "name": { "type": "string", "required": true },
    "is": { "type": "string", "required": true },
    "role": { "type": "string", "required": true },
    "team": { "type": "string", "required": true },
    "level": { "type": "string", "required": false },
    "github_username": { "type": "string", "required": false }
  },
  "matchCriteria": {
    "requiredProperties": ["name", "is"],
    "folderPath": "People",
    "propertyValues": {
      "is": "[[atlas/entities/person.md|person]]"
    }
  }
}
```

This schema will match any person entity that has an `is` property linking to your person entity definition, regardless of how the link is formatted.

#### Adding a New Property to All Team Members

1. Run "Add property to entity type"
2. Select "Person" entity type
3. Enter property name: "level"
4. Enter default value: "unknown"
5. Preview the changes and confirm
6. The plugin will update all Person entities with the new property

#### Finding Schema Violations

1. Run "Show schema drift" to see entities missing required properties
2. Use "Validate all entities" for a comprehensive report
3. Fix issues manually or use bulk operations to add missing properties

#### Reorganizing Your Entity Structure

1. Update schema definitions in settings
2. Run "Scan for entities" to re-index with new criteria
3. Use "Show schema drift" to identify entities that need updates
4. Perform bulk operations to align entities with new schema

### Example Entity Frontmatter

**GitHub Employee Entity:**

```yaml
---
name: "John Doe"
is: "[[atlas/entities/person.md|person]]"
role: "Software Engineer"
team: "Backend Team"
email: "john.doe@github.com"
level: "Senior"
github_username: "johndoe"
tags: ["person", "github", "engineer"]
---
```

**Alternative GitHub Employee (different link format):**

```yaml
---
name: "Jane Smith"
is: "[[person]]"  # This will also match the schema
role: "Product Manager"
team: "Platform Team"
email: "jane.smith@github.com"
level: "Staff"
github_username: "janesmith"
tags: ["person", "github", "pm"]
---
```

**Regular Person Entity (won't match GitHub Employee schema):**

```yaml
---
name: "Bob Johnson"
is: "[[atlas/entities/person.md|person]]"
role: "Consultant"
company: "Independent"
email: "bob@example.com"
tags: ["person", "consultant"]
---
```

**Team Entity:**

```yaml
---
name: "Backend Team"
lead: "Jane Smith"
members: ["John Doe", "Alice Johnson"]
focus_area: "API Development"
tags: ["team", "engineering"]
---
```

## Commands

| Command | Description |
|---------|-------------|
| `Scan for entities` | Index all entities in your vault |
| `Add property to entity type` | Bulk-add a property to all entities of a specific type |
| `Validate all entities` | Check all entities against their schemas |
| `Show schema drift` | Display entities with missing properties |
| `Show dashboard` | Overview of all entities and their status |

## Settings

- **Backup before operations**: Automatically create backups before bulk changes
- **Show validation indicators**: Display visual indicators for schema compliance
- **Entity Schemas**: Configure your entity types and their properties

## Safety Features

### Automatic Backups

When enabled, the plugin creates backups in the `entity-schema-backups` folder before any bulk operation. Backups are timestamped and include the original filename.

### Preview Mode

All bulk operations show a preview of what will be changed before applying modifications. You can review and cancel if something looks incorrect.

### Undo Support

Since operations modify YAML frontmatter, you can use Obsidian's built-in undo functionality (`Ctrl/Cmd + Z`) to revert recent changes.

## Troubleshooting

### Plugin Not Finding My Entities

1. Check that your entities have the required properties defined in the schema
2. Verify the `matchCriteria` settings match your folder structure
3. Run "Scan for entities" after making schema changes
4. Ensure your notes have valid YAML frontmatter

### Bulk Operations Not Working

1. Verify you have write permissions to your vault
2. Check that backup folder can be created if backups are enabled
3. Ensure target entities aren't open in other applications
4. Try with a smaller subset of entities first

### Schema Validation Issues

1. Check for typos in property names (they're case-sensitive)
2. Ensure YAML frontmatter syntax is correct
3. Verify that required properties actually exist in the frontmatter
4. Use "Show schema drift" to identify specific issues

## Advanced Usage

### Custom Entity Types

You can create custom entity types for your specific use case:

```json
{
  "name": "Project",
  "description": "Software development project",
  "properties": {
    "name": { "type": "string", "required": true },
    "status": { "type": "string", "required": true },
    "team": { "type": "string", "required": false },
    "deadline": { "type": "string", "required": false },
    "stakeholders": { "type": "array", "required": false }
  },
  "matchCriteria": {
    "folderPath": "Projects",
    "requiredProperties": ["name", "status"]
  }
}
```

### Complex Match Criteria

Combine multiple criteria for precise entity matching:

```json
{
  "matchCriteria": {
    "requiredProperties": ["name", "type"],
    "folderPath": "Entities/People",
    "tagPattern": "person",
    "namePattern": "Profile",
    "propertyValues": {
      "company": "GitHub",
      "status": "active"
    }
  }
}
```

#### Property Value Matching Options

The `propertyValues` criteria supports several matching modes, with special handling for Obsidian links:

1. **Link Matching** (smart handling of Obsidian [[links]]):

   ```json
   "propertyValues": {
     "is": "[[atlas/entities/person.md|person]]"
   }
   ```

   This will match any of these variations:
   - `"[[atlas/entities/person.md|person]]"` (exact match)
   - `"[[atlas/entities/person.md]]"` (same file, no display text)
   - `"[[person.md]]"` (basename match)
   - `"person"` (basename without extension)
   - `"atlas/entities/person"` (path without extension)

2. **Exact Match** (numbers, booleans):

   ```json
   "propertyValues": {
     "age": 30,
     "is_manager": true
   }
   ```

3. **Case-Insensitive String Match**:

   ```json
   "propertyValues": {
     "company": "github"  // Matches "GitHub", "github", "GITHUB"
   }
   ```

4. **Array Options** (entity must have one of these values):

   ```json
   "propertyValues": {
     "department": ["Engineering", "Product", "Design"],
     "type": ["[[person]]", "[[individual]]"]  // Multiple link options
   }
   ```

### Default Values for Different Types

When adding properties, you can specify different types of default values:

- String: `"unknown"`
- Number: `0`
- Boolean: `false`
- Array: `["tag1", "tag2"]`
- Object: `{"key": "value"}`

## Contributing

This plugin is designed to be extensible. Key areas for contribution:

- Additional property types
- More sophisticated matching criteria
- Export/import of schema configurations
- Integration with other Obsidian plugins
- Advanced validation rules

## License

MIT License - feel free to modify and distribute as needed.

## Support

If you encounter issues or have feature requests, please check the troubleshooting section first. For entity-based note-taking workflows, this plugin works best when combined with:

- Consistent folder organization
- Standardized tagging systems
- Regular use of YAML frontmatter
- Periodic schema validation

Happy note-taking!
