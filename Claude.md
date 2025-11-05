# Claude.md

**Project Overview:** 

This is a web site that issues a lightweight decentralize identity credential. At the top level are informational pages and an app.

**Project Goals:** 

The goal is to use a third party tool still TBD to verify someone’s identity, then write the credentials to a custom wallet for the Algorand blockchain. The wallet will only be used to verify credentials to sites that request them. They will do so with QR code which asks if they were born before a certain date (configurable), and the wallet merely replies true or false along with the wallet address

**Technology Stack**

The site is built in Typescript with React Router V7. It uses tailwind for CSS and DaisyUI for common UI elements. The database is firebase. The only information stored in the database is session tokens. Because of the sensitive nature of data used in verifications, take care to never write any data to firebase except for the minimum needed to maintain sessions state.

**File Structure**

Build tools and configuration are in the project root

The site is root /app

Import paths should use ~ as an alias for /app

There is an example credential in app/components/credentials/w3c-minimal.ts

.
├── app
│ ├── app.css
│ ├── firebase.config.ts
│ ├── hooks
│ ├── components
│ ├── layouts
│ ├── root.tsx
│ ├── routes
│ │ ├── api
│ │ └── app
│ ├── routes.ts
│ └── utils

**Common Commands**

`To install dependencies, run: npm install`

To launch the app for development, run : npm run dev

**Project Documentation**

This project includes a comprehensive `llms.txt` file at the root with detailed documentation about:

- Project architecture and core concepts
- All API endpoints with request/response formats
- Component library and utility functions
- W3C credential schema and verification flow
- Algorand integration and blockchain operations
- Security considerations and best practices
- Environment variables and configuration
- Common development tasks and troubleshooting

**For detailed information about any aspect of the project, refer to the llms.txt file first.**

**Documentation Search with blz**

This project uses `blz` - a fast CLI tool for searching llms.txt documentation files. Use it to quickly find documentation for the tech stack and this project.

Available documentation sources (add if not already indexed):

```bash
# This project's documentation (IMPORTANT - add this first)
# Option 1: Local file (if you have the repo cloned)
blz add cardlessid ./llms.txt

# Option 2: From the live website
blz add cardlessid https://cardlessid.org/llms.txt

# React Router v7 (community-maintained)
blz add react-router https://gist.githubusercontent.com/luiisca/14eb031a892163502e66adb687ba6728/raw/27437452506bec6764d3bf9391a80eed94a53826/ReactRouter_LLMs.txt

# JavaScript/TypeScript ecosystem
blz add bun https://bun.sh/llms.txt
blz add turborepo https://turborepo.com/llms.txt

# UI Libraries and Design Systems
blz add ant-design https://ant.design/llms.txt
blz add ark-ui https://ark-ui.com/llms.txt

# Frameworks
blz add astro https://docs.astro.build/llms.txt

# Vercel and AI
blz add vercel https://vercel.com/llms.txt
blz add ai-sdk https://ai-sdk.dev/llms.txt

# Developer Tools
blz add gradio https://www.gradio.app/llms.txt

# Check https://llmstxthub.com for more documentation sources
```

Note: TypeScript, Firebase, Algorand, Tailwind CSS, and DaisyUI do not currently provide llms.txt files. Use their official documentation directly when needed.

Common blz commands:

- Search documentation: `blz "search term"`
- Get specific lines: `blz get source:line-range` (e.g., `blz get cardlessid:100-150`)
- List indexed sources: `blz list`

**When encountering questions about this project or the tech stack, ALWAYS use blz to search relevant documentation before making assumptions. The llms.txt file contains comprehensive information about the entire codebase.**

**Coding Conventions**

Route files are named in lower case, but their components inside the file are capitalize - e.g. Home, Contact. Components are named in CamelCase with the first word capitalized

**Scratchpad**
When creating test scripts and working documents, always put them in /@scratchpad unless otherwise specified
