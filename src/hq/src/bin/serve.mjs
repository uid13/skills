#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, unlinkSync, statSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'cross-spawn'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_PORT = 3000
const PID_FILE = join(__dirname, '.serve.pid')

/** MIME 类型映射 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

/** 获取 MIME 类型 */
function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

/** 检查端口是否被占用 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port)
  })
}

/** 读取 PID 文件 */
function readPid() {
  if (!existsSync(PID_FILE)) return null
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim())
    try {
      process.kill(pid, 0)
      return pid
    } catch {
      return null
    }
  } catch {
    return null
  }
}

/** 写入 PID 文件 */
function writePid(pid) {
  writeFileSync(PID_FILE, String(pid))
}

/** 删除 PID 文件 */
function removePid() {
  try { unlinkSync(PID_FILE) } catch {}
}

/** 启动静态服务器 */
async function startServer(dir, port) {
  const inUse = await isPortInUse(port)
  if (inUse) {
    const pid = readPid()
    if (pid) {
      console.log(`端口 ${port} 已被占用（PID: ${pid}），服务已在运行`)
      return { port, pid }
    }
    console.error(`端口 ${port} 被其他进程占用，请指定其他端口：node serve.mjs start -p 3001`)
    process.exit(1)
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`)
    let filePath = join(dir, url.pathname === '/' ? 'index.html' : url.pathname)

    // 防止目录遍历
    if (!filePath.startsWith(dir)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    try {
      const stat = statSync(filePath)
      if (stat.isDirectory()) {
        filePath = join(filePath, 'index.html')
        statSync(filePath)
      }
      const mime = getMimeType(filePath)
      const content = readFileSync(filePath)
      res.writeHead(200, { 'Content-Type': mime })
      res.end(content)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
    }
  })

  server.listen(port, () => {
    writePid(process.pid)
    console.log(`✅ 静态服务器已启动: http://localhost:${port}/`)
    console.log(`   目录: ${dir}`)
    console.log(`   PID: ${process.pid}`)
    console.log(`   停止服务: node serve.mjs stop`)
  })

  process.on('SIGINT', () => { removePid(); server.close(); process.exit(0) })
  process.on('SIGTERM', () => { removePid(); server.close(); process.exit(0) })
}

/** 停止服务器 */
function stopServer() {
  const pid = readPid()
  if (!pid) {
    console.log('服务未运行')
    return
  }
  try {
    process.kill(pid)
    removePid()
    console.log(`✅ 服务已停止（PID: ${pid}）`)
  } catch {
    removePid()
    console.log('服务进程已不存在，已清理 PID 文件')
  }
}

/** 查看状态 */
function showStatus(port) {
  const pid = readPid()
  if (pid) {
    console.log(`🟢 服务运行中`)
    console.log(`   PID: ${pid}`)
    console.log(`   地址: http://localhost:${port}/`)
  } else {
    console.log(` 服务未运行`)
  }
}

/** 打开浏览器 */
function openBrowser(url) {
  const platform = process.platform
  let cmd, args
  if (platform === 'win32') {
    cmd = 'cmd'
    args = ['/c', 'start', url]
  } else if (platform === 'darwin') {
    cmd = 'open'
    args = [url]
  } else {
    cmd = 'xdg-open'
    args = [url]
  }
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

/** 解析命令行参数 */
function parseArgs(argv) {
  const args = argv.slice(2)
  const cmd = args[0] || 'help'
  const flags = {}
  let dir = null
  let openPath = null

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--port') {
      flags.port = parseInt(args[++i])
    } else if (args[i] === '-d' || args[i] === '--dir') {
      dir = args[++i]
    } else if (args[i] === '-h' || args[i] === '--help') {
      flags.help = true
    } else if (cmd === 'open' && !args[i].startsWith('-')) {
      openPath = args[i]
    }
  }

  return { cmd, flags, dir, openPath }
}

/** 主逻辑 */
async function main() {
  const { cmd, flags, dir, openPath } = parseArgs(process.argv)
  const port = flags.port || DEFAULT_PORT

  if (flags.help || cmd === 'help') {
    console.log(`
hq-serve - 静态文件服务器（零依赖）

用法:
  node serve.mjs start [-p 端口] [-d 目录]   启动服务器
  node serve.mjs stop                        停止服务器
  node serve.mjs status [-p 端口]            查看状态
  node serve.mjs open [-p 端口] [路径]       打开浏览器

选项:
  -p, --port <端口>    指定端口（默认 3000）
  -d, --dir <目录>     指定服务目录（默认当前目录）
  -h, --help           显示帮助
`)
    return
  }

  const serveDir = dir ? join(process.cwd(), dir) : process.cwd()

  switch (cmd) {
    case 'start':
      await startServer(serveDir, port)
      break

    case 'stop':
      stopServer()
      break

    case 'status':
      showStatus(port)
      break

    case 'open': {
      const pid = readPid()
      if (!pid) {
        console.error('服务未运行，请先执行: node serve.mjs start')
        process.exit(1)
      }
      const url = `http://localhost:${port}/${openPath || ''}`
      openBrowser(url)
      console.log(` 已打开: ${url}`)
      break
    }

    default:
      console.error(`未知命令: ${cmd}`)
      console.log('运行 node serve.mjs help 查看帮助')
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
