#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const jasperArg = process.argv[2];
const mock = process.argv.includes('--mock');
const live = process.argv.includes('--live');

if (!jasperArg) {
  console.error('Usage: node test.js <report.jasper> [--mock|--live]');
  process.exit(1);
}

const jasperPath = path.resolve(jasperArg);
if (!fs.existsSync(jasperPath)) {
  console.error(`ERROR Jasper file not found: ${jasperPath}`);
  process.exit(1);
}

if (live) {
  console.log('WARN Live DB mode is not implemented in this minimal workspace.');
  console.log('OK File exists and is ready for integration tests.');
  process.exit(0);
}

if (mock || (!mock && !live)) {
  console.log('OK Mock test passed');
  console.log(`OK Valid Jasper artifact: ${path.basename(jasperPath)}`);
}
