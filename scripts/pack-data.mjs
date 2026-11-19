// Packs the big generated binaries of gmaps-simulation for the web (lossless, ~2x smaller):
//   1. rearranges the bytes of each array so gzip finds more to squeeze (byte-plane shuffle, delta for sorted ints),
//   2. gzips the whole thing, and splits it into parts (the Worker caps one file at 25 MiB),
//   3. names every part by content hash (so it can be cached forever) and writes chunks.json.
// The browser reverses this in web/src/fetch-asset.ts (inflate with DecompressionStream, then unshuffle).
//
//   node scripts/pack-data.mjs <dir with graph.bin, ch.bin, alt.bin> [out dir]
//
// Source files come from the app's offline pipeline (pnpm export:graph / export:ch / export:alt), which needs the
// 850 MB OSM extract, so this is run by hand when the data changes; CI only serves the result.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const src = resolve(process.argv[2] ?? '')
const out = resolve(process.argv[3] ?? 'data/gmaps-simulation')
const PART = 8 * 1024 * 1024
mkdirSync(out, { recursive: true })

// op = [from, len, width, delta]: shuffle `len` bytes at `from` into `width` byte planes; delta first for int32 arrays.
function shuffle(seg, w) {
  const n = seg.length / w
  const o = Buffer.alloc(seg.length)
  for (let k = 0; k < w; k++) for (let i = 0; i < n; i++) o[k * n + i] = seg[i * w + k]
  return o
}
function forward(buf, ops) {
  const o = Buffer.from(buf)
  for (const [from, len, w, delta] of ops) {
    let seg = Buffer.from(buf.subarray(from, from + len))
    if (delta) {
      const a = new Int32Array(seg.buffer, seg.byteOffset, len / 4)
      const d = new Int32Array(a.length)
      d[0] = a[0]
      for (let i = 1; i < a.length; i++) d[i] = (a[i] - a[i - 1]) | 0
      seg = Buffer.from(d.buffer)
    }
    shuffle(seg, w).copy(o, from)
  }
  return o
}

// graph.bin layout: see web/src/graph.ts. Only the arrays that gain from it are rearranged.
function graphOps(b) {
  const [, n, e] = new Int32Array(b.buffer, b.byteOffset, 4)
  const offT = 16 + 4 * (n + 1)
  const intsEnd = offT + 4 * e
  const offD = Math.ceil(intsEnd / 8) * 8
  const offLa = offD + 8 * e
  const offLo = offLa + 8 * n
  return [
    [16, 4 * (n + 1), 4, 1], // offsets: sorted -> delta
    [offT, 4 * e, 4, 0], // targets
    [offLa, 8 * n, 8, 0], // lats
    [offLo, 8 * n, 8, 0], // lons
  ] // distances (f64) compress better untouched
}
const wholeFile4 = (b) => [[0, Math.floor(b.length / 4) * 4, 4, 0]]

// remove parts of a previous run
for (const f of readdirSync(out)) if (/\.[0-9a-f]{8}\.\d\d$/.test(f)) rmSync(join(out, f))

const manifest = {}
for (const [name, plan] of [['graph.bin', graphOps], ['alt.bin', wholeFile4], ['ch.bin', wholeFile4]]) {
  const raw = readFileSync(join(src, name))
  const ops = plan(raw)
  const packed = gzipSync(forward(raw, ops), { level: 9 })
  const hash = createHash('sha1').update(packed).digest('hex').slice(0, 8)
  const base = name.replace(/\.bin$/, '')
  const parts = []
  for (let i = 0, k = 0; i < packed.length; i += PART, k++) {
    const p = `${base}.${hash}.${String(k).padStart(2, '0')}`
    const piece = packed.subarray(i, i + PART)
    writeFileSync(join(out, p), piece)
    parts.push({ name: p, size: piece.length })
  }
  manifest[name] = { size: raw.length, codec: 'gzip', transform: ops, parts }
  console.log(name, (raw.length / 1e6).toFixed(1) + ' MB ->', (packed.length / 1e6).toFixed(1) + ' MB in', parts.length, 'parts')
}
writeFileSync(join(out, 'chunks.json'), JSON.stringify(manifest))
