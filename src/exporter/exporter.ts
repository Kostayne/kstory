import { readFileSync, writeFileSync } from 'node:fs';
import { parseFromSource } from '@/parser';
import { convertAstToJson } from './converter';
import { convertAstToSimpleJson } from './converter-simple';

export interface ExportOptions {
  pretty?: boolean;
  verbose?: boolean;
  full?: boolean;
}

export function exportKsToJson(
  inputPath: string,
  outputPath: string,
  options: ExportOptions = {}
): void {
  // Read the input .ks file
  const source = readFileSync(inputPath, 'utf-8');

  if (options.verbose) {
    console.log(`📄 File size: ${source.length} characters`);
  }

  // Parse the source code into AST
  const parseResult = parseFromSource(source);

  if (options.verbose) {
    console.log(`🔍 Parsed ${parseResult.program.sections.length} sections`);
    if (parseResult.issues.length > 0) {
      console.log(`⚠️  Found ${parseResult.issues.length} parsing issues`);
    }
  }

  // Convert AST to JSON format
  const jsonData = options.full
    ? convertAstToJson(parseResult.program, parseResult.issues)
    : convertAstToSimpleJson(parseResult.program, parseResult.issues);

  if (options.verbose) {
    console.log(
      `📊 Converting to JSON (${options.full ? 'full' : 'simple'} format)...`
    );
  }

  // Write the JSON output
  const jsonString = options.pretty
    ? JSON.stringify(jsonData, null, 2)
    : JSON.stringify(jsonData);

  writeFileSync(outputPath, jsonString, 'utf-8');
}
