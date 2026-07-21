#!/usr/bin/env node
import { Command } from 'commander';
import { queryQuotes } from '../lib/sina.js';
import { printJson } from '../lib/parser.js';

const program = new Command()
  .name('hq')
  .description('查询股票、基金、期货、指数实时行情')
  .argument('<codes...>', '行情代码（如 600519 aapl 510050 AU0 sh000001 00700）')
  .action(async (codes: string[]) => {
    try {
      const results = await queryQuotes(codes);
      const total = results.stock.length + results.fund.length + results.futures.length + results.index.length;

      if (total === 0) {
        console.log(JSON.stringify({ error: '未获取到行情数据' }));
        process.exit(1);
      }

      printJson(results);
    } catch (err: any) {
      console.log(JSON.stringify({ error: '查询失败: ' + err.message }));
      process.exit(1);
    }
  });

program.parse();
