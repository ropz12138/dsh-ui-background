/**
 * Mount this source-only package into the DeepSeek Harness checkout that
 * contains it, then install dependencies and build the Client artifacts.
 */
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-background'
const PLUGIN_RELATIVE_PATH = 'packages/client/ui-background'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const pluginDir = resolve(scriptDir, '..')

/** Find the enclosing Harness checkout. */
function harnessRoot() {
  let candidate = pluginDir
  while (dirname(candidate) !== candidate) {
    if (existsSync(join(candidate, 'pnpm-workspace.yaml'))) return candidate
    candidate = dirname(candidate)
  }
  throw new Error('dsh-ui-background: no enclosing DeepSeek Harness checkout found')
}

/** Write text only when the computed result changed. */
async function writeWhenChanged(path, source, next) {
  if (next !== source) await writeFile(path, next)
}

/** Read, mutate, and write one JSON file with the repository's normal formatting. */
async function updateJson(path, mutate) {
  const source = await readFile(path, 'utf8')
  const value = JSON.parse(source)
  mutate(value)
  await writeWhenChanged(path, source, `${JSON.stringify(value, null, 2)}\n`)
}

/** Run one required Harness command from its checkout root. */
function run(root, command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`dsh-ui-background: ${command} ${args.join(' ')} failed with exit status ${String(result.status)}`)
  }
}

const root = harnessRoot()
if (resolve(root, PLUGIN_RELATIVE_PATH) !== pluginDir) {
  throw new Error(
    `dsh-ui-background: clone this repository into ${PLUGIN_RELATIVE_PATH}; found ${pluginDir}`,
  )
}

await updateJson(join(root, 'tsconfig.client.json'), (config) => {
  if (!Array.isArray(config.references)) throw new Error('dsh-ui-background: tsconfig.client.json has no references array')
  if (!config.references.some((reference) => reference?.path === `./${PLUGIN_RELATIVE_PATH}`)) {
    config.references.push({ path: `./${PLUGIN_RELATIVE_PATH}` })
  }
})

await updateJson(join(root, 'packages/bundle/web-app/package.json'), (config) => {
  if (config.dependencies === null || typeof config.dependencies !== 'object') {
    throw new Error('dsh-ui-background: web-app package has no dependencies object')
  }
  config.dependencies[PACKAGE_NAME] = 'workspace:^'
})

const rosterPath = join(root, 'packages/bundle/web-app/cordis.patch.yml')
const roster = await readFile(rosterPath, 'utf8')
const row = `    - id: ui-background\n      name: '${PACKAGE_NAME}'\n`
if (!roster.includes(`name: '${PACKAGE_NAME}'`)) {
  const anchor = "    - id: ui-conversation\n      name: '@deepseek-ai/dsh-client-ui-conversation'\n"
  if (!roster.includes(anchor)) throw new Error('dsh-ui-background: cannot find the ui-conversation roster row')
  await writeWhenChanged(rosterPath, roster, roster.replace(anchor, `${anchor}\n${row}`))
}

const proxyPath = join(root, 'packages/host/apiproxy/src/api-proxy.ts')
const proxy = await readFile(proxyPath, 'utf8')
const settingsStart = proxy.indexOf('const WEB_SETTINGS_NAMESPACES = [')
const settingsEnd = proxy.indexOf('] as const', settingsStart)
if (settingsStart === -1 || settingsEnd === -1) {
  throw new Error('dsh-ui-background: cannot find WEB_SETTINGS_NAMESPACES')
}
const settings = proxy.slice(settingsStart, settingsEnd)
if (!settings.includes("'chat-background'")) {
  if (!settings.includes("'ui-theme',")) throw new Error('dsh-ui-background: cannot find the ui-theme settings namespace')
  const nextSettings = settings.replace("'ui-theme',", "'ui-theme', 'chat-background',")
  await writeWhenChanged(proxyPath, proxy, `${proxy.slice(0, settingsStart)}${nextSettings}${proxy.slice(settingsEnd)}`)
}

console.log('dsh-ui-background: Harness configuration updated')
run(root, 'pnpm', ['install'])
run(root, 'pnpm', ['run', 'build:lib:client'])
console.log('dsh-ui-background: ready; start the web profile with `pnpm dsh web`')
