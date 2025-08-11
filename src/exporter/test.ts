import { readFileSync, writeFileSync } from 'fs';
import { parseFromSource } from '@/parser';
import { convertAstToJson } from './converter';

async function testExporter() {
  try {
    console.log('🧪 Testing exporter with lsp.ks...');
    
    // Read the input .ks file
    const inputPath = 'lsp.ks';
    const outputPath = 'lsp.json';
    
    console.log(`📖 Reading file: ${inputPath}`);
    const source = readFileSync(inputPath, 'utf-8');
    console.log(`📄 File size: ${source.length} characters`);

    // Parse the source code into AST
    console.log('🔍 Parsing source code...');
    const parseResult = parseFromSource(source);
    console.log(`✅ Parsed ${parseResult.program.sections.length} sections`);
    
    if (parseResult.issues.length > 0) {
      console.log(`⚠️  Found ${parseResult.issues.length} parsing issues:`);
      parseResult.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.kind}: ${issue.message}`);
        if (issue.position) {
          console.log(`     Position: line ${issue.position.line}, column ${issue.position.column}`);
        }
      });
    }

    // Convert AST to JSON format
    console.log('🔄 Converting AST to JSON...');
    const jsonData = convertAstToJson(parseResult.program, parseResult.issues);
    
    // Write the JSON output with pretty formatting
    console.log(`📝 Writing output to: ${outputPath}`);
    const jsonString = JSON.stringify(jsonData, null, 2);
    writeFileSync(outputPath, jsonString, 'utf-8');
    
    console.log('✅ Export completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Sections: ${jsonData.sections.length}`);
    console.log(`   - Total statements: ${jsonData.sections.reduce((sum, section) => sum + section.statements.length, 0)}`);
    console.log(`   - Parser issues: ${jsonData.metadata.parserIssues.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testExporter();
