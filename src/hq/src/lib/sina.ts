import axios from 'axios';
import UserAgent from 'user-agents';
import iconv from 'iconv-lite';
import { formatSymbol, parseQuote } from './parser.js';
import type { Quote, QueryResults, Symbol } from './types.js';

const SINA_API = 'https://hq.sinajs.cn/list=';

// 生成随机 User-Agent
const USER_AGENT = new UserAgent().toString();

/**
 * 查询行情
 * 发起 HTTP 请求到新浪行情接口（GBK 编码，需转 UTF-8）
 */
export async function queryQuotes(codes: string[]): Promise<QueryResults> {
  const symbols = codes.map(formatSymbol);
  const queryStr = symbols.map(s => s.symbol).join(',');

  const response = await axios.get(SINA_API + queryStr, {
    headers: {
      'Referer': 'https://finance.sina.com.cn',
      'User-Agent': USER_AGENT
    },
    responseType: 'arraybuffer'
  });

  // 新浪接口返回 GBK 编码，转为 UTF-8
  const text = iconv.decode(Buffer.from(response.data), 'gbk');

  const results: QueryResults = { stock: [], fund: [], futures: [], index: [] };
  const lines = text.split('\n');

  // 每行对应一个合约
  for (let i = 0; i < lines.length && i < symbols.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const s = symbols[i];
    const parsed = parseQuote(s, line);
    if (parsed) {
      results[s.type].push(parsed);
    }
  }

  return results;
}
