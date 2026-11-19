// Builds every app listed in apps.json into dist/<slug>/ (optionally only the slugs passed as args).
import { execSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const apps = JSON.parse(readFileSync(join(root, 'apps.json'), 'utf8'))
const only = process.argv.slice(2)
const dist = join(root, 'dist')

if (!only.length) rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

for (const app of apps) {
  if (only.length && !only.includes(app.slug)) continue
  const cwd = join(root, 'apps', app.slug)
  if (!existsSync(cwd)) throw new Error(`apps/${app.slug} missing — run: git submodule update --init`)
  const sub = (s) => s.replaceAll('{slug}', app.slug)
  console.log(`\n=== ${app.slug} ===`)
  // Per-app env (e.g. BASE_PATH for Next.js static export), with {slug} substituted
  const env = { ...process.env, ...Object.fromEntries(Object.entries(app.env ?? {}).map(([k, v]) => [k, sub(v)])) }
  if (app.install) execSync(sub(app.install), { cwd, stdio: 'inherit', env })
  execSync(sub(app.build), { cwd, stdio: 'inherit', env })
  const out = join(cwd, app.out)
  if (!existsSync(join(out, 'index.html'))) throw new Error(`${app.slug}: no index.html in ${app.out}`)
  const target = join(dist, app.slug)
  rmSync(target, { recursive: true, force: true })
  cpSync(out, target, { recursive: true })
  // Big generated files that can't live in the app repo (e.g. map data, chunked under 25 MiB) are copied in from labs/data/<slug>
  if (app.data) cpSync(join(root, sub(app.data)), target, { recursive: true })
}

// Shared design tokens, fonts and favicon: served at /_shared/ for the index and every app.
cpSync(join(root, 'shared'), join(dist, '_shared'), { recursive: true })

// Manifest for the portfolio CMS "import from labs" helper.
import { writeFileSync } from 'node:fs'
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(apps.map(({ slug }) => ({ slug })), null, 2))
console.log('\nBuilt:', apps.map((a) => a.slug).join(', '))
