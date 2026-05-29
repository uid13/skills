import { copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dirname, 'SKILL.md')
const dest = resolve(__dirname, '../../skills/music/SKILL.md')

if (existsSync(src)) {
  copyFileSync(src, dest)
  console.log('📋 已拷贝 SKILL.md → skills/music/SKILL.md')
}
