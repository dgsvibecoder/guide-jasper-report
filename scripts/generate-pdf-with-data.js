#!/usr/bin/env node

require("dotenv").config({ path: __dirname + "/.env" });

const { spawnSync } = require("child_process");
const path = require("path");

// Credenciais do banco de dados
const DB_URL =
  process.env.DB_URL ||
  "jdbc:postgresql://172.30.64.1:5432/jasper-report-ai?sslmode=disable";
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "postgres";

const jrxmlPath = process.argv[2];
const outputPdfPath = process.argv[3];
// Extra KEY=VALUE params forwarded to pdf-with-data (e.g. dataInicio=2024-01-01)
const extraParams = process.argv.slice(4);

if (!jrxmlPath || !outputPdfPath) {
  console.error(
    "Usage: node generate-pdf-with-data.js <report.jasper> <output.pdf> [KEY=VALUE ...]",
  );
  process.exit(1);
}

const runnerDir = path.resolve(__dirname, "jasper-runner");
const jarPath = path.join(runnerDir, "target", "jasper-runner.jar");

if (!require("fs").existsSync(jarPath)) {
  console.error(`ERROR: Jasper runner jar not found: ${jarPath}`);
  process.exit(1);
}

const args = [
  "-jar",
  jarPath,
  "pdf-with-data",
  jrxmlPath,
  outputPdfPath,
  DB_URL,
  DB_USER,
  DB_PASSWORD,
  ...extraParams,
];

const result = spawnSync("java", args, {
  stdio: "inherit",
  cwd: path.dirname(jrxmlPath),
});

process.exit(result.status || 0);
