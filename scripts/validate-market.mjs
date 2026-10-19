#!/usr/bin/env node
/**
 * Validate the format-1 DSH plugin market index and its icon.
 *
 * Mirrors the rules that matter for this single-plugin market: localized
 * titles, a commit-pinned Git source, a valid SemVer version, and a local
 * icon that stays below the 32 KiB inline-icon budget.
 */
import { access, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (path) => readFile(join(root, path), 'utf8')
const failures = []
const fail = (message) => failures.push(message)
const packageName = 'dsh-client-locale-be'
const repositoryUrl = 'https://github.com/yurashet/dsh-locale-be'
const versionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const commitPattern = /^[0-9a-f]{40}$/

const [rawIndex, rawPackage, iconStat] = await Promise.all([
  read('market/index.json'),
  read('package.json'),
  stat(join(root, 'market/icons/dsh-locale-be.svg')).catch(() => null),
])

let index
let manifest
try {
  index = JSON.parse(rawIndex)
} catch (error) {
  fail(`market/index.json is not valid JSON: ${error.message}`)
}
try {
  manifest = JSON.parse(rawPackage)
} catch (error) {
  fail(`package.json is not valid JSON: ${error.message}`)
}

const localized = (value, path) => {
  if (typeof value === 'string' && value.trim()) return
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${path} must be a string or a localized object`)
    return
  }
  if (typeof value.en !== 'string' || !value.en.trim()) fail(`${path}.en is required`)
  for (const [language, text] of Object.entries(value)) {
    if (!/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/.test(language)) fail(`${path}.${language} is not a language id`)
    if (typeof text !== 'string' || !text.trim()) fail(`${path}.${language} must be a non-empty string`)
  }
}

if (index !== undefined) {
  if (index.format !== 1) fail('$.format must be 1')
  localized(index.title, '$.title')
  if (index.description !== undefined) localized(index.description, '$.description')
  if (!Array.isArray(index.plugins) || index.plugins.length === 0) {
    fail('$.plugins must be a non-empty array')
  } else {
    const plugin = index.plugins[0]
    if (plugin.name !== packageName) fail(`$.plugins[0].name must be ${packageName}`)
    localized(plugin.title, '$.plugins[0].title')
    localized(plugin.description, '$.plugins[0].description')
    if (typeof plugin.author !== 'string' || !plugin.author.trim()) fail('$.plugins[0].author is required')
    if (plugin.homepage !== `${repositoryUrl}#readme`) fail('$.plugins[0].homepage must point at the README')
    if (plugin.repository?.url !== repositoryUrl) fail('$.plugins[0].repository.url must match the repository')
    if (plugin.icon !== 'icons/dsh-locale-be.svg') fail('$.plugins[0].icon must be icons/dsh-locale-be.svg')
    if (plugin.icon.includes('..')) fail('$.plugins[0].icon must not escape the market directory')
    if (!Array.isArray(plugin.metadata?.keywords) || plugin.metadata.keywords.some((keyword) => typeof keyword !== 'string')) {
      fail('$.plugins[0].metadata.keywords must be an array of strings')
    }
    if (!Array.isArray(plugin.versions) || plugin.versions.length === 0) {
      fail('$.plugins[0].versions must be a non-empty array')
    } else {
      const version = plugin.versions[0]
      if (!versionPattern.test(version.version)) fail('$.plugins[0].versions[0].version must be exact SemVer')
      if (manifest !== undefined && version.version !== manifest.version) {
        fail('market version must match package.json version')
      }
      if (!Number.isInteger(version.publishTimestamp) || version.publishTimestamp < 0 || version.publishTimestamp >= 1e11) {
        fail('$.plugins[0].versions[0].publishTimestamp must be Unix seconds')
      }
      if (version.source?.type !== 'git') fail('$.plugins[0].versions[0].source.type must be git')
      if (version.source?.url !== repositoryUrl) fail('$.plugins[0].versions[0].source.url must match the repository')
      if (!commitPattern.test(version.source?.commit ?? '')) {
        fail('$.plugins[0].versions[0].source.commit must be a lowercase 40-hex SHA')
      }
      if (version.source?.path !== undefined && (typeof version.source.path !== 'string' || version.source.path.startsWith('/') || version.source.path.includes('..'))) {
        fail('$.plugins[0].versions[0].source.path must be a relative POSIX directory')
      }
      if (manifest !== undefined && version.engines?.dsh !== manifest.engines?.dsh) {
        fail('market engines.dsh must match package.json engines.dsh')
      }
    }
  }
}

if (iconStat === null) {
  fail('market/icons/dsh-locale-be.svg is missing')
} else if (iconStat.size > 32 * 1024) {
  fail('market/icons/dsh-locale-be.svg exceeds 32 KiB')
} else {
  const icon = await read('market/icons/dsh-locale-be.svg')
  if (!icon.trimStart().startsWith('<svg')) fail('market icon must be an SVG document')
}

if (failures.length > 0) {
  console.error('Market validation failed:')
  for (const message of failures) console.error(`  - ${message}`)
  process.exit(1)
}
console.log('Market index OK: 1 plugin, 1 commit-pinned version')
