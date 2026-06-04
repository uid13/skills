#!/usr/bin/env node
import { Command } from 'commander';
import { queryQuotes } from '../lib/sina.js';
import { printTable } from '../lib/parser.js';

const program = new Command()
  .name('hq')
  .description('查询股票、基金、期货、指数实时行情')
  .argument('<codes...>', '行情代码（如 600519 aapl 510050 AU0 sh000001 00700）')
  .action(async (codes: string[]) => {
    try {
      const results = await queryQuotes(codes);
      const total = results.stock.length + results.fund.length + results.futures.length + results.index.length;

      if (total === 0) {
        console.log('未获取到行情数据');
        process.exit(1);
      }

      printTable('📈 股票行情', results.stock);
      printTable('💰 基金行情', results.fund);
      printTable('📦 期货主力行情', results.futures);
      printTable('📊 指数行情', results.index);
    } catch (err: any) {
      console.error('查询失败:', err.message);
      process.exit(1);
    }
  });

program.parse();
