import { EntitySchema } from '../../main';

export const testSchemas: EntitySchema[] = [
  {
    name: "Person",
    properties: {
      name: { type: "string", required: true },
      role: { type: "string", required: false },
      team: { type: "string", required: false },
      email: { type: "string", required: false }
    },
    matchCriteria: {
      requiredProperties: ["name", "is"],
      folderPath: "atlas/notes",
      propertyValues: {
        "is": "atlas/entities/person"
      }
    },
    description: "Individual person entity"
  },
  {
    name: "Team",
    properties: {
      name: { type: "string", required: true },
      members: { type: "array", required: false },
      lead: { type: "string", required: false }
    },
    matchCriteria: {
      requiredProperties: ["name", "is"],
      folderPath: "atlas/notes",
      propertyValues: {
        "is": "atlas/entities/team"
      }
    },
    description: "Team or group entity"
  },
  {
    name: "Project",
    properties: {
      name: { type: "string", required: true },
      status: { type: "string", required: true },
      team: { type: "string", required: false },
      deadline: { type: "string", required: false }
    },
    matchCriteria: {
      requiredProperties: ["name", "type"],
      folderPath: "projects",
      propertyValues: {
        "type": "project"
      }
    },
    description: "Project entity"
  }
];

export const testFrontmatter = {
  validPersonEntity: {
    name: "John Doe",
    is: "[[atlas/entities/person.md|person]]",
    role: "Software Engineer",
    team: "Backend Team",
    email: "john@example.com"
  },
  
  validPersonEntitySimpleLink: {
    name: "Jane Smith",
    is: "[[person]]",
    role: "Product Manager"
  },
  
  validTeamEntity: {
    name: "Backend Team",
    is: "[[atlas/entities/team.md|team]]",
    lead: "John Doe",
    members: ["John Doe", "Jane Smith"]
  },
  
  invalidPersonMissingName: {
    is: "[[person]]",
    role: "Developer"
  },
  
  invalidPersonMissingIs: {
    name: "Bob Wilson",
    role: "Designer"
  },
  
  invalidPersonWrongFolder: {
    name: "Alice Johnson",
    is: "[[person]]",
    role: "Manager"
  },
  
  nonMatchingEntity: {
    name: "Random Note",
    content: "This is just a regular note"
  }
};

export const testFileContents = {
  withFrontmatter: `---
name: "John Doe"
is: "[[person]]"
role: "Software Engineer"
---

# John Doe

Some content about John.`,

  withoutFrontmatter: `# John Doe

Some content about John without frontmatter.`,

  emptyFrontmatter: `---
---

# Empty Frontmatter

Some content.`,

  malformedFrontmatter: `---
name: "John Doe"
is: [[person]]
role: Software Engineer
missing closing quote: "bad
---

Content here.`
};