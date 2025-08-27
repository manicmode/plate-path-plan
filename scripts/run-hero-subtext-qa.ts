#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { runAllQAScenarios, generateMarkdownReport } from '../src/debug/heroSubtextQA';

async function main() {
  console.log('🚀 Running Hero Subtext QA harness...');
  
  const startTime = Date.now();
  
  try {
    // Run all QA scenarios
    const report = runAllQAScenarios();
    
    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate markdown report
    const markdown = generateMarkdownReport(report);
    
    // Create timestamped filename
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Save latest report
    const latestPath = path.join(reportsDir, 'hero-subtext-qa-latest.md');
    fs.writeFileSync(latestPath, markdown, 'utf8');
    
    // Save timestamped report
    const timestampedPath = path.join(reportsDir, `hero-subtext-qa-${timestamp}.md`);
    fs.writeFileSync(timestampedPath, markdown, 'utf8');
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Hero Subtext QA completed successfully!');
    console.log(`📊 Results: ${report.summary.passedTests}/${report.summary.totalTests} scenarios passed`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📁 Reports saved:`);
    console.log(`   - ${latestPath}`);
    console.log(`   - ${timestampedPath}`);
    
    if (!report.overallPass) {
      console.log('❌ Some scenarios failed. Check the report for details.');
      process.exit(1);
    }
    
    console.log('🎉 All scenarios passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Hero Subtext QA failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}