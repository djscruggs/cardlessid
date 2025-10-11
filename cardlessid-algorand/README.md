# cardlessid-algorand

Smart contract development workspace for CardlessID on the Algorand blockchain.

## Overview

This AlgoKit workspace contains the smart contracts for CardlessID, a decentralized identity verification system. The contracts enable on-chain verification and credential management, providing the blockchain backend for the CardlessID web application.

## Project Structure

- `projects/cardlessid-algorand/` - Main smart contract project
  - `smart_contracts/` - Contract source code (Algorand TypeScript)
  - `smart_contracts/artifacts/` - Compiled contracts and generated clients
  - `scripts/` - Utility scripts including type stub generation

## Relationship to CardlessID

This is a **subproject** of the main CardlessID application (located in the parent directory). The smart contracts handle:
- On-chain issuer registry
- Credential verification logic
- Blockchain state management

The parent CardlessID React application imports the generated TypeScript client from `app/utils/CardlessIssuerClient.ts`, which is automatically copied during the build process.

## Getting Started

### Building the Contracts

From this directory:
```bash
algokit project run build
```

From the parent CardlessID directory:
```bash
npm run algokit:build
```

This will:
1. Compile the Algorand TypeScript smart contracts
2. Generate TEAL approval and clear programs
3. Generate TypeScript client code
4. Copy the client to the parent app's `app/utils/` directory

### Development Workflow

1. Make changes to smart contracts in `projects/cardlessid-algorand/smart_contracts/`
2. Run `algokit project run build` to compile and generate the client
3. The generated client is automatically available in the parent React app
4. Import in parent app: `import { CardlessIssuerClient } from '~/utils/CardlessIssuerClient'`

### Other Commands

- `algokit project run test` - Run contract tests
- `algokit project run lint` - Lint and format code
- `algokit project run deploy` - Deploy contracts (development)
- `algokit project run deploy:ci` - Deploy contracts (CI/CD)

## Special Configuration

### Nested Project Setup

Because this AlgoKit project is nested within a larger React project, a postinstall script creates stub type definitions to prevent TypeScript compilation conflicts with the parent project's React types. This is handled automatically during `npm install`.

## Learn More

- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/algokit.md)
- [Algorand TypeScript](https://github.com/algorandfoundation/puya-ts)
- [CardlessID Documentation](../README.md)
