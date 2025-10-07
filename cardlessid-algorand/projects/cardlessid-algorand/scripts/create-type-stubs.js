#!/usr/bin/env node
/**
 * Creates stub type definition files to prevent parent node_modules resolution
 * This is needed when the AlgoKit project is nested in a larger project with
 * conflicting type definitions (like React types that require DOM)
 */

const fs = require('fs');
const path = require('path');

const stubs = ['react', 'react-dom', 'qrcode'];

const stubIndexContent = '// Stub file to prevent parent types from being loaded\nexport {};\n';
const createPackageJson = (name) => ({
  name: `@types/${name}`,
  version: '0.0.0',
  types: 'index.d.ts'
});

stubs.forEach(stub => {
  const dir = path.join(__dirname, '..', 'node_modules', '@types', stub);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(dir, 'index.d.ts'), stubIndexContent);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(createPackageJson(stub), null, 2));
});

console.log('✓ Created type stub files to prevent parent node_modules resolution');
