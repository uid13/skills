#!/usr/bin/env node
import UserAgent from 'user-agents'

// 生成随机桌面端真实浏览器 UA 并输出到标准输出
// 注意：B站移动端 UA 会触发 412 风控，必须限定桌面端（deviceCategory: 'desktop'）
const ua = new UserAgent({ deviceCategory: 'desktop' }).toString()
console.log(ua)
