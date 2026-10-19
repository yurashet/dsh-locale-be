#!/usr/bin/env node
/**
 * Validate the language pack before publishing.
 *
 * Checks the dictionary shape, package manifest, patch layer, required files,
 * and a few accidental-secret patterns. No network access and no dependencies.
 */
import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (path) => readFile(join(root, path), 'utf8')
const exists = (path) => access(join(root, path)).then(() => true, () => false)

const failures = []
const fail = (message) => failures.push(message)

const [rawDictionaries, rawPackage, patch, client] = await Promise.all([
  read('translations.be.json'),
  read('package.json'),
  read('cordis.patch.yml'),
  read('lib/client.js'),
])

let dictionaries
try {
  dictionaries = JSON.parse(rawDictionaries)
} catch (error) {
  fail(`translations.be.json is not valid JSON: ${error.message}`)
}

if (dictionaries !== undefined) {
  if (dictionaries === null || typeof dictionaries !== 'object' || Array.isArray(dictionaries)) {
    fail('translations.be.json must contain an object keyed by namespace')
  } else {
    let namespaces = 0
    let strings = 0
    for (const [namespace, entries] of Object.entries(dictionaries)) {
      if (!namespace.trim()) {
        fail('a namespace id is empty')
        continue
      }
      if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
        fail(`namespace "${namespace}" must contain an object`)
        continue
      }
      namespaces += 1
      for (const [key, value] of Object.entries(entries)) {
        if (!key.trim()) fail(`namespace "${namespace}" has an empty key`)
        if (typeof value !== 'string') {
          fail(`"${namespace}.${key}" must be a string`)
          continue
        }
        if (!value.trim()) fail(`"${namespace}.${key}" is empty`)
        strings += 1
      }
    }

    for (const required of ['common', 'chat', 'conversation', 'settings']) {
      if (!(required in dictionaries)) fail(`required namespace "${required}" is missing`)
    }
    if (namespaces < 50) fail(`only ${namespaces} namespaces; the pack looks truncated`)
    if (strings < 2500) fail(`only ${strings} strings; the pack looks truncated`)

    console.log(`Dictionary: ${namespaces} namespaces, ${strings} strings`)
  }
}

let manifest
try {
  manifest = JSON.parse(rawPackage)
} catch (error) {
  fail(`package.json is not valid JSON: ${error.message}`)
}
if (manifest !== undefined) {
  if (manifest.name !== 'dsh-client-locale-be') fail('package.json name must be dsh-client-locale-be')
  if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') {
    fail('package.json dsh.bundle.patch must point at ./cordis.patch.yml')
  }
  if (manifest.dsh?.client?.platform !== 'web') {
    fail('package.json dsh.client.platform must be "web"')
  }
  if (manifest.exports?.['./client'] !== './lib/client.js') {
    fail('package.json must export ./client as ./lib/client.js')
  }
}

for (const file of [
  'lib/index.js',
  'lib/client.js',
  'cordis.patch.yml',
  'translations.be.json',
  'README.md',
  'README.be.md',
  'LICENSE',
]) {
  if (!(await exists(file))) fail(`required file is missing: ${file}`)
}

if (!patch.includes('dsh-client-locale-be')) fail('cordis.patch.yml does not insert the plugin')
if (!patch.includes('preference: be')) fail('cordis.patch.yml does not select Belarusian')
if (!client.includes('addLanguage') || !client.includes('id: "be"')) {
  fail('lib/client.js does not register the "be" language')
}
if (!client.includes('"common"')) fail('lib/client.js has no common namespace')

const scanned = [rawDictionaries, rawPackage, patch, client].join('\n')
for (const [label, pattern] of [
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['private key', /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],
]) {
  if (pattern.test(scanned)) fail(`possible ${label} found in repository files`)
}

if (failures.length > 0) {
  console.error('Validation failed:')
  for (const message of failures) console.error(`  - ${message}`)
  process.exit(1)
}

console.log('Validation OK')
