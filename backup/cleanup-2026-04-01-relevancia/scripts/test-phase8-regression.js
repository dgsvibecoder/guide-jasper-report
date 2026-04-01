#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const outputDir = path.join(workspaceRoot, 'output', 'phase8-regression');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase8-regression-'));
const withPdf = process.argv.includes('--with-pdf');

const results = [];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function runCommand(command, args, options = {}) {
  const proc = spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: process.env,
    ...options
  });

  return {
    status: proc.status,
    stdout: (proc.stdout || '').trim(),
    stderr: (proc.stderr || '').trim()
  };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isTransientBuildLock(stderrText) {
  const text = String(stderrText || '').toLowerCase();
  return text.includes('could not replace original artifact with shaded artifact');
}

function addResult(name, passed, details) {
  results.push({ name, passed, details });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}`);
  if (details && details.message) console.log(`       ${details.message}`);
}

function assertExitCode(name, command, args, expectedExitCode) {
  const res = runCommand(command, args);
  const passed = res.status === expectedExitCode;
  addResult(name, passed, {
    expectedExitCode,
    actualExitCode: res.status,
    message: passed
      ? `exit code ${res.status} as expected`
      : `expected exit code ${expectedExitCode}, got ${res.status}`,
    stdoutTail: res.stdout.split('\n').slice(-8),
    stderrTail: res.stderr.split('\n').slice(-8)
  });
}

function assertExitCodeWithRetry(name, command, args, expectedExitCode, retries = 2) {
  let attempt = 0;
  let last = null;

  while (attempt <= retries) {
    const res = runCommand(command, args);
    last = res;

    if (res.status === expectedExitCode) {
      addResult(name, true, {
        expectedExitCode,
        actualExitCode: res.status,
        attempts: attempt + 1,
        message: `exit code ${res.status} as expected`,
        stdoutTail: res.stdout.split('\n').slice(-8),
        stderrTail: res.stderr.split('\n').slice(-8)
      });
      return;
    }

    if (!(expectedExitCode === 0 && isTransientBuildLock(res.stderr) && attempt < retries)) {
      break;
    }

    attempt += 1;
    sleep(1200);
  }

  addResult(name, false, {
    expectedExitCode,
    actualExitCode: last ? last.status : null,
    attempts: attempt + 1,
    message: `expected exit code ${expectedExitCode}, got ${last ? last.status : 'unknown'}`,
    stdoutTail: last ? last.stdout.split('\n').slice(-8) : [],
    stderrTail: last ? last.stderr.split('\n').slice(-8) : []
  });
}

function writeNegativeFixtures() {
  const invalidViewJrxml = path.join(tempDir, 'invalid-view.jrxml');
  const invalidMasterJrxml = path.join(tempDir, 'invalid-master-hardcoded-subreport.jrxml');

  fs.writeFileSync(
    invalidViewJrxml,
    `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="INVALID_VIEW_SMOKE" pageWidth="595" pageHeight="842" columnWidth="515" leftMargin="40" rightMargin="40" topMargin="40" bottomMargin="40">
  <queryString><![CDATA[
    SELECT id, nome
    FROM view_does_not_exist
    WHERE 1=1
  ]]></queryString>
  <field name="id" class="java.lang.String"/>
  <field name="nome" class="java.lang.String"/>
  <title><band height="20"/></title>
  <columnHeader><band height="20"/></columnHeader>
  <detail><band height="20"/></detail>
  <pageFooter><band height="20"/></pageFooter>
</jasperReport>
`,
    'utf8'
  );

  const baseMaster = fs.readFileSync(
    path.join(workspaceRoot, 'output', 'SMOKE_TEST_MD_001', 'master.jrxml'),
    'utf8'
  );
  const hardenedMaster = baseMaster.replace(
    '<subreportExpression><![CDATA[$P{SUBREPORT_DETAIL_PATH}]]></subreportExpression>',
    '<subreportExpression><![CDATA["detail.jasper"]]></subreportExpression>'
  );

  fs.writeFileSync(invalidMasterJrxml, hardenedMaster, 'utf8');

  return { invalidViewJrxml, invalidMasterJrxml };
}

function maybePdfFlag() {
  return withPdf ? ['--pdf'] : [];
}

function ensureJavaRunnerReady() {
  const runnerDir = path.join(workspaceRoot, 'scripts', 'jasper-runner');
  const res = runCommand('mvn', ['-q', '-DskipTests', 'package'], { cwd: runnerDir });

  if (res.status !== 0) {
    addResult('Precheck JasperRunner build', false, {
      expectedExitCode: 0,
      actualExitCode: res.status,
      message: 'failed to build jasper-runner before regression suite',
      stdoutTail: res.stdout.split('\n').slice(-8),
      stderrTail: res.stderr.split('\n').slice(-8)
    });
    return false;
  }

  addResult('Precheck JasperRunner build', true, {
    expectedExitCode: 0,
    actualExitCode: 0,
    message: 'jasper-runner build ready'
  });
  return true;
}

function runPositiveSuite() {
  const simpleTarget = withPdf
    ? 'output/SMOKE_TEST_SIMPLES_005/smoke_test_accessops.jrxml'
    : 'output/SMOKE_TEST_SIMPLES_001/smoke_test.jrxml';

  assertExitCode(
    'Smoke SIMPLE validation',
    'node',
    ['scripts/validate.js', simpleTarget],
    0
  );

  assertExitCodeWithRetry(
    `Smoke SIMPLE compile${withPdf ? ' + PDF' : ''}`,
    'node',
    ['scripts/compile.js', simpleTarget, ...maybePdfFlag()],
    0
  );

  assertExitCode(
    'Smoke MASTER_DETAIL semantic validation',
    'node',
    [
      'scripts/validate.js',
      'output/SMOKE_TEST_MD_001/master.jrxml',
      '--detail',
      'output/SMOKE_TEST_MD_001/detail.jrxml',
      '--relationship',
      'accessops_medicalEvents'
    ],
    0
  );

  assertExitCodeWithRetry(
    `Smoke MASTER_DETAIL compile${withPdf ? ' + PDF' : ''}`,
    'node',
    [
      'scripts/compile.js',
      'output/SMOKE_TEST_MD_001/master.jrxml',
      '--detail',
      'output/SMOKE_TEST_MD_001/detail.jrxml',
      '--relationship',
      'accessops_medicalEvents',
      ...maybePdfFlag()
    ],
    0
  );
}

function runNegativeSuite(fixtures) {
  assertExitCode(
    'Negative SIMPLE invalid view should fail validation',
    'node',
    ['scripts/validate.js', fixtures.invalidViewJrxml],
    2
  );

  assertExitCode(
    'Negative MASTER_DETAIL invalid relationship should fail compile precheck',
    'node',
    [
      'scripts/compile.js',
      'output/SMOKE_TEST_MD_001/master.jrxml',
      '--detail',
      'output/SMOKE_TEST_MD_001/detail.jrxml',
      '--relationship',
      'relationship_that_does_not_exist'
    ],
    3
  );

  assertExitCode(
    'Negative MASTER_DETAIL hardcoded subreport path should fail semantic validation',
    'node',
    [
      'scripts/validate.js',
      fixtures.invalidMasterJrxml,
      '--detail',
      'output/SMOKE_TEST_MD_001/detail.jrxml',
      '--relationship',
      'accessops_medicalEvents'
    ],
    3
  );
}

function finalize() {
  ensureDir(outputDir);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const status = failed === 0 ? 'SUCCESS' : 'FAILURE';

  const report = {
    phase: 'FASE_8',
    generatedAt: new Date().toISOString(),
    mode: withPdf ? 'with-pdf' : 'compile-only',
    environment: {
      platform: process.platform,
      node: process.version,
      workspaceRoot
    },
    summary: {
      total: results.length,
      passed,
      failed,
      status
    },
    tests: results
  };

  const modeReportPath = path.join(
    outputDir,
    withPdf ? 'latest-results-with-pdf.json' : 'latest-results-compile-only.json'
  );
  const latestReportPath = path.join(outputDir, 'latest-results.json');
  fs.writeFileSync(modeReportPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(latestReportPath, JSON.stringify(report, null, 2), 'utf8');

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {
    // Best effort cleanup.
  }

  console.log('');
  console.log('=== FASE 8 REGRESSION SUMMARY ===');
  console.log(`Mode: ${report.mode}`);
  console.log(`Total: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Status: ${report.summary.status}`);
  console.log(`Report (mode): ${modeReportPath}`);
  console.log(`Report (latest): ${latestReportPath}`);

  process.exit(failed === 0 ? 0 : 1);
}

function main() {
  console.log('Running FASE 8 regression suite...');
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Mode: ${withPdf ? 'with-pdf' : 'compile-only'}`);
  console.log('');

  const fixtures = writeNegativeFixtures();

  if (!ensureJavaRunnerReady()) {
    finalize();
    return;
  }

  runPositiveSuite();
  runNegativeSuite(fixtures);
  finalize();
}

main();
