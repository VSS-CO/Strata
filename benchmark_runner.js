const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const examplesDir = "examples";
const resultsFile = "benchmark_results.json";

// Get all .str files, prioritizing numbered examples
const files = fs.readdirSync(examplesDir).filter(f => f.endsWith(".str"));
const prioritized = [];
const others = [];

files.forEach(f => {
  if (/^\d{2}_/.test(f)) {
    prioritized.push(f);
  } else if (!f.startsWith("test_")) {
    others.push(f);
  }
});

const sortedFiles = [...prioritized.sort(), ...others.sort()];
console.log(`Found ${sortedFiles.length} example files\n`);

const results = [];
let successCount = 0;
let failureCount = 0;

sortedFiles.forEach((file, index) => {
  const filePath = path.join(examplesDir, file);
  const label = `[${index + 1}/${sortedFiles.length}] ${file}`;
  
  try {
    process.stdout.write(`${label.padEnd(60)} ... `);
    
    const startTime = process.hrtime.bigint();
    const output = execSync(`node dist/main.js "${filePath}"`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const endTime = process.hrtime.bigint();
    
    const duration = Number(endTime - startTime) / 1_000_000; // ms
    console.log(`✓ ${duration.toFixed(2)}ms`);
    
    results.push({
      file,
      success: true,
      duration,
      output: output.substring(0, 200)
    });
    successCount++;
  } catch (error) {
    console.log(`✗ ERROR`);
    results.push({
      file,
      success: false,
      error: error.message.substring(0, 100)
    });
    failureCount++;
  }
});

// Write results
fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

// Summary
console.log(`\n${"=".repeat(70)}`);
console.log(`Total: ${results.length} | Success: ${successCount} | Failed: ${failureCount}`);

const successful = results.filter(r => r.success);
if (successful.length > 0) {
  const durations = successful.map(r => r.duration);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  console.log(`Execution times: min=${min.toFixed(2)}ms, avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
}
console.log(`Results saved to: ${resultsFile}\n`);
