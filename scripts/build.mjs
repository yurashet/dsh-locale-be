#!/usr/bin/env node
/**
 * Build lib/client.js from src/client.template.js and translations.be.json.
 *
 *   node scripts/build.mjs           write the bundle
 *   node scripts/build.mjs --check   fail if the committed bundle is stale
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const templatePath = join(root, 'src', 'client.template.js')
const dictionaryPath = join(root, 'translations.be.json')
const outputPath = join(root, 'lib', 'client.js')
const check = process.argv.includes('--check')

const [template, rawDictionaries] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(dictionaryPath, 'utf8'),
])

const dictionaries = JSON.parse(rawDictionaries)
const placeholder = '__DICTIONARIES__'
if (!template.includes(placeholder)) {
  console.error(`Build failed: ${placeholder} is missing from ${templatePath}`)
  process.exit(1)
}

const generated = template.replace(placeholder, JSON.stringify(dictionaries, null, '\t'))

if (check) {
  const current = await readFile(outputPath, 'utf8').catch(() => null)
  if (current !== generated) {
    console.error('Bundled client is stale. Run: npm run build')
    process.exit(1)
  }
  console.log('lib/client.js is up to date')
} else {
  await writeFile(outputPath, generated, 'utf8')
  const namespaces = Object.keys(dictionaries).length
  const strings = Object.values(dictionaries).reduce((sum, dict) => sum + Object.keys(dict).length, 0)
  console.log(`Built lib/client.js: ${namespaces} namespaces, ${strings} strings`)
}
