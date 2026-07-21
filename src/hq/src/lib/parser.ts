import type { Symbol, Quote, MarketType, AssetType } from './types.js';

/** 字段定义：{key: 字段名，desc: 含义说明} */
interface FieldDef {
  key: string;
  desc: string;
}

/** A 股/基金字段定义 (sh/sz/bj) - 33 个字段，完全确认 */
const A_SHARE_FIELDS: FieldDef[] = [
  { key: 'name', desc: '名称' },
  { key: 'open', desc: '今开' },
  { key: 'prevClose', desc: '昨收' },
  { key: 'price', desc: '当前价' },
  { key: 'high', desc: '最高' },
  { key: 'low', desc: '最低' },
  { key: 'bid', desc: '竞买价' },
  { key: 'ask', desc: '竞卖价' },
  { key: 'volume', desc: '成交量（指数是手，个股是股）' },
  { key: 'amount', desc: '成交额（元）' },
  { key: 'bidVol1', desc: '委买一量' },
  { key: 'bidPrice1', desc: '委买一价' },
  { key: 'bidVol2', desc: '委买二量' },
  { key: 'bidPrice2', desc: '委买二价' },
  { key: 'bidVol3', desc: '委买三量' },
  { key: 'bidPrice3', desc: '委买三价' },
  { key: 'bidVol4', desc: '委买四量' },
  { key: 'bidPrice4', desc: '委买四价' },
  { key: 'bidVol5', desc: '委买五量' },
  { key: 'bidPrice5', desc: '委买五价' },
  { key: 'askVol1', desc: '委卖一量' },
  { key: 'askPrice1', desc: '委卖一价' },
  { key: 'askVol2', desc: '委卖二量' },
  { key: 'askPrice2', desc: '委卖二价' },
  { key: 'askVol3', desc: '委卖三量' },
  { key: 'askPrice3', desc: '委卖三价' },
  { key: 'askVol4', desc: '委卖四量' },
  { key: 'askPrice4', desc: '委卖四价' },
  { key: 'askVol5', desc: '委卖五量' },
  { key: 'askPrice5', desc: '委卖五价' },
  { key: 'date', desc: '日期' },
  { key: 'time', desc: '时间' },
  { key: 'status', desc: '状态（00：正常，-2：未上市，-3/03：退市）' },
];

/** 港股字段定义 (hk) - 19 个字段，已确认 */
const HK_FIELDS: FieldDef[] = [
  { key: 'nameEn', desc: '英文名' },
  { key: 'nameCn', desc: '中文名' },
  { key: 'open', desc: '今开' },
  { key: 'prevClose', desc: '昨收' },
  { key: 'high', desc: '最高' },
  { key: 'low', desc: '最低' },
  { key: 'price', desc: '当前价' },
  { key: 'change', desc: '涨跌额' },
  { key: 'changePercent', desc: '涨跌幅' },
  { key: 'bidPrice', desc: '买价' },
  { key: 'askPrice', desc: '卖价' },
  { key: 'volume', desc: '成交量' },
  { key: 'amount', desc: '成交额' },
  { key: 'turnover', desc: '换手率' },
  { key: 'pe', desc: '市盈率' },
  { key: 'high52w', desc: '52 周最高' },
  { key: 'low52w', desc: '52 周最低' },
  { key: 'date', desc: '日期' },
  { key: 'time', desc: '时间' },
];

/** 美股字段定义 (gb) - 36 个字段，部分待确认 */
const US_FIELDS: FieldDef[] = [
  { key: 'name', desc: '名称' },
  { key: 'prevClose', desc: '昨收' },
  { key: 'change', desc: '涨跌额' },
  { key: 'dateTime', desc: '时间戳' },
  { key: 'unknown1', desc: '未知（可能是昨收重复）' },
  { key: 'open', desc: '今开' },
  { key: 'high', desc: '最高' },
  { key: 'low', desc: '最低' },
  { key: 'unknown2', desc: '未知（可能是今开重复）' },
  { key: 'unknown3', desc: '未知（可能是昨收重复）' },
  { key: 'volume', desc: '成交量' },
  { key: 'regularVolume', desc: '常规交易量' },
  { key: 'marketCap', desc: '市值' },
  { key: 'dividendYield', desc: '股息率（待确认）' },
  { key: 'pe', desc: '市盈率' },
  { key: 'unknown4', desc: '未知（可能是盘口数据）' },
  { key: 'unknown5', desc: '未知' },
  { key: 'unknown6', desc: '未知' },
  { key: 'unknown7', desc: '未知' },
  { key: 'sharesOutstanding', desc: '流通股' },
  { key: 'unknown8', desc: '未知' },
  { key: 'high52w', desc: '52 周最高（待确认）' },
  { key: 'unknown9', desc: '未知（可能是昨收）' },
  { key: 'eps', desc: '每股收益' },
  { key: 'pe2', desc: '市盈率（重复？）' },
  { key: 'lastTradeTime', desc: '最近交易时间' },
  { key: 'price', desc: '当前价' },
  { key: 'afterHoursVolume', desc: '盘后成交量' },
  { key: 'tradingDays', desc: '交易天数（待确认）' },
  { key: 'year', desc: '年份' },
  { key: 'revenue', desc: '营收' },
  { key: 'high52w2', desc: '52 周最高（重复？）' },
  { key: 'low52w', desc: '52 周最低' },
  { key: 'marketCap2', desc: '市值（重复？）' },
  { key: 'bidPrice', desc: '买价' },
  { key: 'askPrice', desc: '卖价' },
];

/** 期货主力字段定义 (futures) - 33 个核心字段，已确认 */
const FUTURES_FIELDS: FieldDef[] = [
  { key: 'name', desc: '名称' },
  { key: 'unknown1', desc: '未知' },
  { key: 'prevClose', desc: '昨结算' },
  { key: 'open', desc: '今开' },
  { key: 'high', desc: '最高' },
  { key: 'unknown2', desc: '未知' },
  { key: 'low', desc: '最低' },
  { key: 'price', desc: '当前价' },
  { key: 'unknown3', desc: '未知' },
  { key: 'unknown4', desc: '未知' },
  { key: 'unknown5', desc: '未知' },
  { key: 'volume', desc: '成交量' },
  { key: 'unknown6', desc: '未知' },
  { key: 'amount', desc: '成交额' },
  { key: 'openInterest', desc: '持仓量' },
  { key: 'limitUp', desc: '涨停价' },
  { key: 'limitDown', desc: '跌停价' },
  { key: 'date', desc: '日期' },
  { key: 'contractMonth', desc: '合约月份' },
  { key: 'bidVol1', desc: '委买一量' },
  { key: 'bidPrice1', desc: '委买一价' },
  { key: 'bidVol2', desc: '委买二量' },
  { key: 'bidPrice2', desc: '委买二价' },
  { key: 'bidVol3', desc: '委买三量' },
  { key: 'bidPrice3', desc: '委买三价' },
  { key: 'bidVol4', desc: '委买四量' },
  { key: 'bidPrice4', desc: '委买四价' },
  { key: 'bidVol5', desc: '委买五量' },
  { key: 'bidPrice5', desc: '委买五价' },
  { key: 'askVol1', desc: '委卖一量' },
  { key: 'askPrice1', desc: '委卖一价' },
  { key: 'askVol2', desc: '委卖二量' },
  { key: 'askPrice2', desc: '委卖二价' },
  { key: 'askVol3', desc: '委卖三量' },
  { key: 'askPrice3', desc: '委卖三价' },
  { key: 'askVol4', desc: '委卖四量' },
  { key: 'askPrice4', desc: '委卖四价' },
  { key: 'askVol5', desc: '委卖五量' },
  { key: 'askPrice5', desc: '委卖五价' },
];

/** 指数字段定义 (index) - 33 个字段 */
const INDEX_FIELDS: FieldDef[] = [
  { key: 'name', desc: '名称' },
  { key: 'open', desc: '今开' },
  { key: 'prevClose', desc: '昨收' },
  { key: 'price', desc: '当前价' },
  { key: 'high', desc: '最高' },
  { key: 'low', desc: '最低' },
  { key: 'bid', desc: '竞买价' },
  { key: 'ask', desc: '竞卖价' },
  { key: 'volume', desc: '成交量（手）' },
  { key: 'amount', desc: '成交额（元）' },
  { key: 'bidVol1', desc: '委买一量' },
  { key: 'bidPrice1', desc: '委买一价' },
  { key: 'bidVol2', desc: '委买二量' },
  { key: 'bidPrice2', desc: '委买二价' },
  { key: 'bidVol3', desc: '委买三量' },
  { key: 'bidPrice3', desc: '委买三价' },
  { key: 'bidVol4', desc: '委买四量' },
  { key: 'bidPrice4', desc: '委买四价' },
  { key: 'bidVol5', desc: '委买五量' },
  { key: 'bidPrice5', desc: '委买五价' },
  { key: 'askVol1', desc: '委卖一量' },
  { key: 'askPrice1', desc: '委卖一价' },
  { key: 'askVol2', desc: '委卖二量' },
  { key: 'askPrice2', desc: '委卖二价' },
  { key: 'askVol3', desc: '委卖三量' },
  { key: 'askPrice3', desc: '委卖三价' },
  { key: 'askVol4', desc: '委卖四量' },
  { key: 'askPrice4', desc: '委卖四价' },
  { key: 'askVol5', desc: '委卖五量' },
  { key: 'askPrice5', desc: '委卖五价' },
  { key: 'date', desc: '日期' },
  { key: 'time', desc: '时间' },
  { key: 'status', desc: '状态' },
];

/** 市场字段映射配置 */
const MARKET_FIELD_MAP: Record<string, FieldDef[]> = {
  sh: A_SHARE_FIELDS,
  sz: A_SHARE_FIELDS,
  bj: A_SHARE_FIELDS,
  hk: HK_FIELDS,
  gb: US_FIELDS,
  futures: FUTURES_FIELDS,
  index: INDEX_FIELDS,
};

/** 6 位 A 股/基金前缀映射表：前缀 → [交易所，类型] */
const CN_PREFIX_MAP: Record<string, [string, Symbol['type']]> = {
  // 上交所股票
  '60': ['sh', 'stock'], '68': ['sh', 'stock'],
  // 深交所股票
  '00': ['sz', 'stock'], '30': ['sz', 'stock'],
  // 北交所
  '43': ['bj', 'stock'], '82': ['bj', 'stock'],
  '83': ['bj', 'stock'], '87': ['bj', 'stock'], '88': ['bj', 'stock'],
  // 上交所基金
  '50': ['sh', 'fund'], '51': ['sh', 'fund'],
  '56': ['sh', 'fund'], '58': ['sh', 'fund'],
  // 深交所基金
  '15': ['sz', 'fund'], '16': ['sz', 'fund'],
  // 债券（归入股票类）
  '11': ['sh', 'stock'], '12': ['sz', 'stock'],
};

/**
 * 根据代码前缀添加市场标识，并分类为股票/基金/期货
 *
 * 使用查表法替代 if 链，更易维护
 */
export function formatSymbol(code: string): Symbol {
  code = code.trim();

  // 指数代码：sh/sz 开头 + 6位数字（如 sh000001 上证指数，sz399001 深证成指）
  if (/^(sh|sz)\d{6}$/i.test(code)) {
    const market = code.substring(0, 2).toLowerCase();
    return {
      symbol: code.toLowerCase(),
      market: 'index' as MarketType,
      type: 'index',
      code: code.toUpperCase(),
    };
  }

  // 深证指数：399 开头的 6 位数字（如 399001 深证成指，399006 创业板指）
  if (code.length === 6 && code.startsWith('399')) {
    return {
      symbol: `sz${code}`,
      market: 'index' as MarketType,
      type: 'index',
      code: code,
    };
  }

  // 期货主力合约：字母+数字组合（如 AU0、AP0、MA0），内部自动拼接 nf_ 前缀请求新浪接口
  if (/^[A-Z]{1,3}\d{1,2}$/.test(code.toUpperCase())) {
    const futuresCode = code.toUpperCase();
    return {
      symbol: `nf_${futuresCode}`,
      market: 'futures',
      type: 'futures',
      code: futuresCode,
    };
  }

  // 5 位纯数字 → 港股
  if (code.length === 5 && /^\d+$/.test(code)) {
    return { symbol: `hk${code}`, market: 'hk', type: 'stock', code };
  }

  // 6 位数字 → A 股/基金/债券
  if (code.length === 6 && /^\d+$/.test(code)) {
    const prefix = code.substring(0, 2);
    const mapping = CN_PREFIX_MAP[prefix];
    if (mapping) {
      const [exchange, type] = mapping;
      return { symbol: `${exchange}${code}`, market: exchange, type, code };
    }
  }

  // 兜底 → 美股
  return {
    symbol: `gb_${code.toLowerCase()}`,
    market: 'gb',
    type: 'stock',
    code: code.toUpperCase(),
  };
}

/**
 * 解析原始数据为行对象
 */
function parseToRow(market: string, fields: string[]): Record<string, string> {
  const fieldDefs = MARKET_FIELD_MAP[market] ?? [];
  return Object.fromEntries(
    fieldDefs.map((def, i) => [def.key, fields[i] ?? ''])
  );
}

/**
 * 解析行情数据
 * 使用字段映射表替代硬编码索引
 */
function parseQuote(symbol: Symbol, raw: string): Quote | null {
  const match = raw.match(/hq_str_\w+="(.+)"/);
  if (!match) return null;

  const fields = match[1].split(',');
  if (fields.length < 10) return null;

  // 解析为命名对象
  const row = parseToRow(symbol.market, fields);

  // 通过字段名访问
  const name = row.name || row.nameEn || row.nameCn || '未知';
  const price = parseFloat(row.price);
  const high = parseFloat(row.high);
  const low = parseFloat(row.low);
  const prevClose = parseFloat(row.prevClose);

  if (isNaN(price) || isNaN(prevClose)) return null;

  // 计算涨跌和涨跌幅
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    code: symbol.code,
    name,
    price: price.toFixed(2),
    change: (change >= 0 ? '+' : '') + change.toFixed(2),
    changePercent: (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%',
    high: high.toFixed(2),
    low: low.toFixed(2)
  };
}

/**
 * 输出 JSON 行情数据（由模型自行渲染展示）
 */
export function printJson(results: QueryResults): void {
  const groups: Record<string, { label: string; items: Quote[] }> = {
    stock:  { label: '📈 股票行情', items: results.stock },
    fund:   { label: '💰 基金行情', items: results.fund },
    futures: { label: '📦 期货主力行情', items: results.futures },
    index:  { label: '📊 指数行情', items: results.index },
  };

  const output: any[] = [];

  for (const [key, group] of Object.entries(groups)) {
    if (group.items.length === 0) continue;
    output.push({
      type: key,
      label: group.label,
      data: group.items,
    });
  }

  console.log(JSON.stringify(output, null, 2));
}

// 导出 parseQuote 供 sina.ts 使用
export { parseQuote };
