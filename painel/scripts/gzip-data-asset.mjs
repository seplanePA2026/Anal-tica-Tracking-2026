import { gzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distJson = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'data.json')
const raw = readFileSync(distJson)
const gz = gzipSync(raw, { level: 9 })
const limit = 25 * 1024 * 1024
if (gz.length >= limit) {
  throw new Error(`data.json.gz ainda passa de 25 MiB (${gz.length} bytes)`)
}
writeFileSync(`${distJson}.gz`, gz)
unlinkSync(distJson)
console.log(
  `data.json ${(raw.length / 1024 / 1024).toFixed(2)} MiB -> data.json.gz ${(gz.length / 1024 / 1024).toFixed(2)} MiB`,
)
