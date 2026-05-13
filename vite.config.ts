import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import type { RiveFile as RiveFileInstance } from '@rive-app/react-webgl2'

const riveManifestModuleId = 'virtual:rive-manifest'
const resolvedRiveManifestModuleId = `\0${riveManifestModuleId}`

type RiveManifestInput = {
  name: string
  type: number
}

type RiveManifestStateMachine = {
  inputs: RiveManifestInput[]
  name: string
}

type RiveManifestArtboard = {
  animations: string[]
  name: string
  stateMachines: RiveManifestStateMachine[]
}

type RiveFileConstructor = new (params: {
  buffer: ArrayBuffer
}) => RiveFileInstance

type RuntimeStateMachineInput = {
  name: string
  type: number
}

type RuntimeStateMachineInstance = {
  delete(): void
  input(index: number): RuntimeStateMachineInput
  inputCount(): number
}

type RuntimeBackedRiveFile = {
  runtime?: {
    StateMachineInstance?: new (
      stateMachine: unknown,
      artboard: unknown,
    ) => RuntimeStateMachineInstance
  }
}

let riveFileConstructorPromise: Promise<RiveFileConstructor> | undefined

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.riv$/i, '')
    .replace(/^\d+-\d+-/, '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function getRiveFileConstructor() {
  if (!riveFileConstructorPromise) {
    riveFileConstructorPromise = import('@rive-app/react-webgl2').then(
      (riveModule) => {
        const moduleWithNamedExport = riveModule as unknown as {
          RiveFile?: RiveFileConstructor
        }
        const moduleDefault = riveModule.default as unknown as {
          RiveFile?: RiveFileConstructor
        }
        const RiveFile = moduleWithNamedExport.RiveFile ?? moduleDefault.RiveFile

        if (!RiveFile) {
          throw new Error('Unable to load RiveFile from @rive-app/react-webgl2')
        }

        return RiveFile
      },
    )
  }

  return riveFileConstructorPromise
}

async function readRiveArtboards(filePath: string) {
  const globalWithImage = globalThis as { Image?: unknown }

  if (!globalWithImage.Image) {
    globalWithImage.Image = class Image {}
  }

  const RiveFile = await getRiveFileConstructor()
  const bytes = await fs.promises.readFile(filePath)
  const riveFile = new RiveFile({ buffer: toArrayBuffer(bytes) })
  const runtimeBackedFile = riveFile as unknown as RuntimeBackedRiveFile

  try {
    await riveFile.init()

    const file = riveFile.getInstance()
    const StateMachineInstance =
      runtimeBackedFile.runtime?.StateMachineInstance
    const artboards: RiveManifestArtboard[] = []

    for (let artboardIndex = 0; artboardIndex < file.artboardCount(); artboardIndex += 1) {
      const artboard = file.artboardByIndex(artboardIndex)
      const animations: string[] = []
      const stateMachines: RiveManifestStateMachine[] = []

      for (
        let animationIndex = 0;
        animationIndex < artboard.animationCount();
        animationIndex += 1
      ) {
        animations.push(artboard.animationByIndex(animationIndex).name)
      }

      for (
        let stateMachineIndex = 0;
        stateMachineIndex < artboard.stateMachineCount();
        stateMachineIndex += 1
      ) {
        const stateMachine = artboard.stateMachineByIndex(stateMachineIndex)
        const inputs: RiveManifestInput[] = []

        if (StateMachineInstance) {
          const stateMachineInstance = new StateMachineInstance(
            stateMachine,
            artboard,
          )

          for (
            let inputIndex = 0;
            inputIndex < stateMachineInstance.inputCount();
            inputIndex += 1
          ) {
            const input = stateMachineInstance.input(inputIndex)
            inputs.push({ name: input.name, type: input.type })
          }

          stateMachineInstance.delete()
        }

        stateMachines.push({ inputs, name: stateMachine.name })
      }

      artboards.push({ animations, name: artboard.name, stateMachines })
    }

    return artboards
  } finally {
    riveFile.cleanup()
  }
}

function riveManifestPlugin(): Plugin {
  const publicDir = path.resolve(import.meta.dirname, 'public')

  return {
    name: 'rive-manifest',
    resolveId(id) {
      if (id === riveManifestModuleId) {
        return resolvedRiveManifestModuleId
      }
    },
    async load(id) {
      if (id !== resolvedRiveManifestModuleId) {
        return
      }

      const entries = fs.existsSync(publicDir)
        ? fs
            .readdirSync(publicDir)
            .filter((fileName) => fileName.toLowerCase().endsWith('.riv'))
            .sort((a, b) =>
              titleFromFileName(a).localeCompare(titleFromFileName(b)),
            )
            .map(async (fileName) => {
              const filePath = path.join(publicDir, fileName)

              try {
                return {
                  artboards: await readRiveArtboards(filePath),
                  fileName,
                  src: `/${fileName}`,
                  title: titleFromFileName(fileName),
                }
              } catch (error) {
                return {
                  artboards: [],
                  error:
                    error instanceof Error ? error.message : String(error),
                  fileName,
                  src: `/${fileName}`,
                  title: titleFromFileName(fileName),
                }
              }
            })
        : []
      const resolvedEntries = await Promise.all(entries)

      return `export default ${JSON.stringify(resolvedEntries, null, 2)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), riveManifestPlugin()],
})
