#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { exportKsToJson } from './exporter';

const KS_FILE_REGEX = /\.ks$/;

const program = new Command();

program
  .name('kstory-export')
  .description(
    'Export .ks files to JSON format (simple by default, optimized for game engines)'
  )
  .version('1.0.0');

program
  .argument('<input>', 'Input .ks file path')
  .option('-o, --output <path>', 'Output JSON file path (default: input.json)')
  .option('-p, --pretty', 'Pretty print JSON output')
  .option('-v, --verbose', 'Enable verbose logging')
  .option(
    '-f, --full',
    'Export full JSON with position information (for LSP/editors)'
  )
  .action(
    async (
      input: string,
      options: {
        output?: string;
        pretty?: boolean;
        verbose?: boolean;
        full?: boolean;
      }
    ) => {
      try {
        const outputPath =
          options.output || input.replace(KS_FILE_REGEX, '.json');

        if (options.verbose) {
          console.log(chalk.blue(`📖 Reading file: ${input}`));
          console.log(
            chalk.blue(`📝 Output will be written to: ${outputPath}`)
          );
        }

        await exportKsToJson(input, outputPath, {
          pretty: options.pretty,
          verbose: options.verbose,
          full: options.full,
        });

        console.log(
          chalk.green(`✅ Successfully exported ${input} to ${outputPath}`)
        );
      } catch (error) {
        console.error(
          chalk.red(
            `❌ Export failed: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    }
  );

program.parse();
