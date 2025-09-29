# Claude.md

**Project Overview:** 

This is a web site that issues a lightweight decentralize identity credential. At the top level are informational pages and an app. 

**Project Goals:** 

The goal is to use a third party tool still TBD to verify someone’s identity, then write the credentials to a custom wallet for the Algorand blockchain. The wallet will only be used to verify credentials to sites that request them. They will do so with QR code which asks if they were born before a certain date (configurable), and the wallet merely replies true or false along with the wallet address

**Technology Stack**

The site is built in Typescript with Remix/React Router V7. The database is firebase. The only information stored in the database is the wallet address, and whether it has been verified by the third party. It uses tailwind for CSS

**File Structure**

Build tools and configuration are in the project root

The site is root /app

Import paths should use ~ as an alias for /app

.
├── app
│   ├── app.css
│   ├── firebase.config.ts
│   ├── hooks

│   ├── components
│   ├── layouts
│   ├── root.tsx
│   ├── routes
│   │   ├── api
│   │   └── app
│   ├── routes.ts
│   └── utils

**Common Commands**

`To install dependencies, run: npm install`

To launch the app for development, run :  npm run dev

**Coding Conventions**

Route files are named in lower case, but their components inside the file are capitalize - e.g. Home, Contact. Components are named in CamelCase with the first word capitalized