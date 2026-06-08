// Vite 开发服务器配置（API 代理）
// 用于解决浏览器 CORS 问题

export default {
  server: {
    port: 5168,
    open: false,
    proxy: {
      // 新浪财经行情接口
      '/hq': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        headers: {
          'Referer': 'https://finance.sina.com.cn',
        },
        rewrite: (path) => path.replace(/^\/hq/, ''),
      },
      // 新浪财经其他接口
      '/finance': {
        target: 'https://vip.stock.finance.sina.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/finance/, ''),
      },
    },
  },
};
