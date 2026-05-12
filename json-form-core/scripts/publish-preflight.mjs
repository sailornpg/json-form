import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const isWindows = process.platform === 'win32'
const nodeExecutable = process.execPath
const npmCliPath = isWindows
  ? path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  : null
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const smokeDir = path.join(rootDir, '.tmp-publish-smoke')
const tarballsDir = path.join(smokeDir, 'tarballs')
const consumerDir = path.join(smokeDir, 'consumer')
const cacheDir = path.join(smokeDir, '.npm-cache')

const profiles = {
  all: {
    name: 'all',
    buildDemo: true,
    consumerDirName: 'consumer',
    packageDirs: [
      'packages/engine-adapter',
      'packages/form-protocol',
      'packages/renderer-antdv',
      'packages/form-kit'
    ]
  },
  'low-level': {
    name: 'low-level',
    buildDemo: false,
    consumerDirName: 'consumer-low-level',
    packageDirs: [
      'packages/engine-adapter',
      'packages/form-protocol'
    ]
  },
  'business-path': {
    name: 'business-path',
    buildDemo: false,
    consumerDirName: 'consumer-business-path',
    packageDirs: [
      'packages/engine-adapter',
      'packages/form-protocol',
      'packages/renderer-antdv',
      'packages/form-kit'
    ]
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function logStep(message) {
  console.log(`\n[preflight] ${message}`)
}

function runNpm(args, options = {}) {
  const commandArgs = ['--cache', cacheDir, ...args]
  const spawnCommand = isWindows ? nodeExecutable : 'npm'
  const spawnArgs = isWindows ? [npmCliPath, ...commandArgs] : commandArgs
  const result = execFileSync(spawnCommand, spawnArgs, {
    cwd: options.cwd ?? rootDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })

  return typeof result === 'string' ? result.trim() : ''
}

function normalizePackagePath(value) {
  return value.replace(/^[.][/\\]/, '').replaceAll('\\', '/')
}

function collectExportTargets(value, targets = []) {
  if (!value) {
    return targets
  }

  if (typeof value === 'string') {
    targets.push(normalizePackagePath(value))
    return targets
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectExportTargets(item, targets))
    return targets
  }

  Object.values(value).forEach((item) => collectExportTargets(item, targets))
  return targets
}

function sanitizeTarballName(packageName) {
  return packageName.replace(/^@/, '').replaceAll('/', '-')
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true })
}

function resetOutputDirs(profile) {
  ensureDir(tarballsDir)
  ensureDir(cacheDir)
  const profileTarballsDir = path.join(tarballsDir, profile.name)
  const profileConsumerDir = path.join(smokeDir, profile.consumerDirName)
  rmSync(profileTarballsDir, { recursive: true, force: true })
  rmSync(profileConsumerDir, { recursive: true, force: true })
  ensureDir(profileTarballsDir)
  ensureDir(profileConsumerDir)

  return {
    profileTarballsDir,
    profileConsumerDir
  }
}

function loadReleasePackages(profile) {
  return profile.packageDirs.map((relativeDir) => {
    const packageJsonPath = path.join(rootDir, relativeDir, 'package.json')
    const packageJson = readJson(packageJsonPath)

    return {
      relativeDir,
      packageDir: path.join(rootDir, relativeDir),
      packageJson,
      packageJsonPath,
      packageName: packageJson.name,
      version: packageJson.version,
      tarballName: `${sanitizeTarballName(packageJson.name)}-${packageJson.version}.tgz`
    }
  })
}

function validatePackedFiles(releasePackage, packResult) {
  if (!Array.isArray(packResult.files) || packResult.files.length === 0) {
    throw new Error(`${releasePackage.packageName} did not report packed files`)
  }

  const packedPaths = new Set(packResult.files.map((file) => normalizePackagePath(file.path)))
  const requiredPaths = new Set([
    normalizePackagePath(releasePackage.packageJson.main),
    normalizePackagePath(releasePackage.packageJson.types),
    ...collectExportTargets(releasePackage.packageJson.exports)
  ])

  requiredPaths.forEach((requiredPath) => {
    if (!packedPaths.has(requiredPath)) {
      throw new Error(`${releasePackage.packageName} is missing packed entry ${requiredPath}`)
    }
  })

  const leakedSourceFiles = [...packedPaths].filter((packedPath) => packedPath.startsWith('src/'))
  if (leakedSourceFiles.length > 0) {
    throw new Error(`${releasePackage.packageName} leaked source files into tarball: ${leakedSourceFiles.join(', ')}`)
  }
}

function packReleasePackages(releasePackages, profileTarballsDir) {
  return releasePackages.map((releasePackage) => {
    logStep(`packing ${releasePackage.packageName}`)
    const packOutput = runNpm(
      [
        'pack',
        '--json',
        '--pack-destination',
        profileTarballsDir,
        '--workspace',
        releasePackage.packageName
      ],
      { capture: true }
    )
    const parsedOutput = JSON.parse(packOutput)
    const packResult = Array.isArray(parsedOutput) ? parsedOutput[0] : parsedOutput

    validatePackedFiles(releasePackage, packResult)

    return {
      ...releasePackage,
      packResult
    }
  })
}

function buildConsumerFixture(releasePackages, rootPackageJson, profile, profileConsumerDir) {
  const rendererPackage = releasePackages.find((pkg) => pkg.packageName === '@sailornpg/renderer-antdv')
  const basePackage = rendererPackage ?? releasePackages[0]
  const vueVersion = basePackage?.packageJson.peerDependencies?.vue ?? '^3'
  const typescriptVersion = rootPackageJson.devDependencies?.typescript ?? '~6'
  const pluginVueVersion = rootPackageJson.devDependencies?.['@vitejs/plugin-vue'] ?? '^6'
  const viteVersion = rootPackageJson.devDependencies?.vite ?? '^8'

  const dependencies = {
    ...Object.fromEntries(
      releasePackages.map((releasePackage) => [
        releasePackage.packageName,
        `file:../tarballs/${profile.name}/${releasePackage.tarballName}`
      ])
    ),
    typescript: typescriptVersion,
    vue: vueVersion
  }

  if (rendererPackage) {
    dependencies['ant-design-vue'] =
      rendererPackage.packageJson.peerDependencies?.['ant-design-vue'] ?? '^4'
  }

  const consumerPackageJson = {
    name: 'publish-smoke-consumer',
    private: true,
    type: 'module',
    scripts: buildConsumerScripts(profile.name),
    dependencies
  }

  if (profile.name === 'business-path') {
    consumerPackageJson.devDependencies = {
      '@vitejs/plugin-vue': pluginVueVersion,
      vite: viteVersion
    }
  }

  const consumerTsconfig = {
    ...buildConsumerTsconfig(profile.name)
  }

  const consumerFiles = buildConsumerFiles(profile.name)

  writeJson(path.join(profileConsumerDir, 'package.json'), consumerPackageJson)
  writeJson(path.join(profileConsumerDir, 'tsconfig.json'), consumerTsconfig)
  for (const [relativePath, content] of Object.entries(consumerFiles)) {
    const absolutePath = path.join(profileConsumerDir, relativePath)
    ensureDir(path.dirname(absolutePath))
    writeFileSync(absolutePath, content, 'utf8')
  }
}

function buildConsumerScripts(profileName) {
  if (profileName === 'business-path') {
    return {
      typecheck: 'vue-tsc --noEmit -p tsconfig.json',
      build: 'vite build'
    }
  }

  return {
    typecheck: 'tsc --noEmit -p tsconfig.json'
  }
}

function buildConsumerTsconfig(profileName) {
  if (profileName === 'business-path') {
    return {
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
        jsx: 'preserve',
        allowImportingTsExtensions: true,
        types: ['vite/client']
      },
      include: ['src/**/*.ts', 'src/**/*.vue', 'vite.config.ts']
    }
  }

  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
      jsx: 'preserve'
    },
    include: ['index.ts']
  }
}

function buildConsumerFiles(profileName) {
  if (profileName === 'business-path') {
    return {
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Business Path Smoke</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
      'vite.config.ts': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
`,
      'src/main.ts': `import 'ant-design-vue/dist/reset.css'

import { createApp } from 'vue'

import App from './App.vue'

createApp(App).mount('#app')
`,
      'src/App.vue': `<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@sailornpg/form-kit'
import { SchemaForm } from '@sailornpg/form-kit'
import { antdvPreset } from '@sailornpg/renderer-antdv'
import { ref } from 'vue'

const formData = ref({
  name: 'publish-smoke'
})

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string'
    }
  },
  required: ['name']
}

const uischema: UISchemaElement = {
  type: 'Control',
  scope: '#/properties/name'
}
</script>

<template>
  <main class="app-shell">
    <SchemaForm
      v-model:data="formData"
      :schema="schema"
      :uischema="uischema"
      :renderer-preset="antdvPreset"
    />
  </main>
</template>

<style scoped>
.app-shell {
  padding: 24px;
}
</style>
`
    }
  }

  return {
    'index.ts': buildConsumerEntry(profileName)
  }
}

function buildConsumerEntry(profileName) {
  if (profileName === 'low-level') {
    return `import type { JsonFormsChangeEvent, JsonSchema, UISchemaElement } from '@sailornpg/engine-adapter'
import { JsonFormsRuntime, encode, getControlPath, getPropPath, resolveData, resolveSchema, toDataPath } from '@sailornpg/engine-adapter'
import type { SchemaFormRendererConfig, SchemaFormRendererPreset, SchemaFormWidgetMap } from '@sailornpg/form-protocol'
import { defineSchemaFormWidget, getSchemaFormWidgets, registerSchemaFormWidgets, unregisterSchemaFormWidgets } from '@sailornpg/form-protocol'
import { defineComponent, h } from 'vue'
import type { ErrorObject } from 'ajv'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  }
}

const uischema: UISchemaElement = {
  type: 'Control',
  scope: '#/properties/name'
}

const widgets: SchemaFormWidgetMap = {
  demo: defineSchemaFormWidget(
    defineComponent({
      name: 'DemoWidget',
      setup() {
        return () => h('div', 'demo')
      }
    })
  )
}

const preset: SchemaFormRendererPreset = {
  renderers: []
}

const config: SchemaFormRendererConfig = {
  widgetsId: 'demo'
}

registerSchemaFormWidgets('demo', widgets)
const resolvedWidgets = getSchemaFormWidgets('demo')
unregisterSchemaFormWidgets('demo')

const changeHandler = (_event: JsonFormsChangeEvent) => undefined
const error: ErrorObject = {
  keyword: 'required',
  instancePath: '/name',
  schemaPath: '#/required',
  params: {},
  message: 'required'
}

void JsonFormsRuntime
void encode('a.b')
void getControlPath(error)
void getPropPath('name')
void resolveData({}, '#/properties/name')
void resolveSchema(schema, '#/properties/name', schema)
void toDataPath('a.b')
void uischema
void preset
void config
void resolvedWidgets
void changeHandler
`
  }

  return `import type { JsonSchema, SchemaFormWidgetMap, UISchemaElement } from '@sailornpg/form-kit'
import { SchemaForm } from '@sailornpg/form-kit'
import { antdvPreset } from '@sailornpg/renderer-antdv'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  }
}

const uischema: UISchemaElement = {
  type: 'Control',
  scope: '#/properties/name'
}

const widgets: SchemaFormWidgetMap = {}

void SchemaForm
void antdvPreset
void schema
void uischema
void widgets
`
}

function runConsumerSmokeTest(profileConsumerDir) {
  logStep('installing consumer dependencies from local tarballs')
  runNpm(['install', '--no-audit', '--no-fund'], { cwd: profileConsumerDir })

  logStep('running consumer typecheck')
  runNpm(['run', 'typecheck'], { cwd: profileConsumerDir })

  const consumerPackageJson = readJson(path.join(profileConsumerDir, 'package.json'))
  if (consumerPackageJson.scripts?.build) {
    logStep('running consumer build')
    runNpm(['run', 'build'], { cwd: profileConsumerDir })
  }
}

function printSummary(releasePackages, profileConsumerDir, profileTarballsDir) {
  logStep('preflight passed')
  releasePackages.forEach((releasePackage) => {
    console.log(
      `- ${releasePackage.packageName}@${releasePackage.version}: ${releasePackage.packResult.filename}`
    )
  })
  console.log(`- consumer fixture: ${path.relative(rootDir, profileConsumerDir)}`)
  console.log(`- tarballs: ${path.relative(rootDir, profileTarballsDir)}`)
}

function parseProfile() {
  const profileFlagIndex = process.argv.indexOf('--profile')
  const profileName =
    profileFlagIndex >= 0 ? process.argv[profileFlagIndex + 1] : 'all'

  if (!profileName || !profiles[profileName]) {
    throw new Error(`Unsupported preflight profile: ${profileName ?? '<empty>'}`)
  }

  return profiles[profileName]
}

function buildWorkspace(profile) {
  if (profile.buildDemo) {
    logStep(`building ${profile.name} packages and demo`)
    runNpm(['run', 'build'])
    return
  }

  logStep(`building ${profile.name} packages`)
  for (const relativeDir of profile.packageDirs) {
    const packageJson = readJson(path.join(rootDir, relativeDir, 'package.json'))
    runNpm(['run', 'build', '--workspace', packageJson.name])
  }
}

function main() {
  const profile = parseProfile()
  const rootPackageJson = readJson(path.join(rootDir, 'package.json'))
  const releasePackages = loadReleasePackages(profile)
  const { profileTarballsDir, profileConsumerDir } = resetOutputDirs(profile)

  buildWorkspace(profile)

  const packedReleasePackages = packReleasePackages(releasePackages, profileTarballsDir)
  buildConsumerFixture(packedReleasePackages, rootPackageJson, profile, profileConsumerDir)
  runConsumerSmokeTest(profileConsumerDir)
  printSummary(packedReleasePackages, profileConsumerDir, profileTarballsDir)
}

main()
