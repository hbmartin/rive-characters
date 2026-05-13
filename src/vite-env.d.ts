/// <reference types="vite/client" />

declare module 'virtual:rive-manifest' {
  import type { StateMachineInputType } from '@rive-app/react-canvas'

  export type RiveManifestInput = {
    initialValue?: boolean | number
    name: string
    type: StateMachineInputType
  }

  export type RiveManifestStateMachine = {
    inputs: RiveManifestInput[]
    name: string
  }

  export type RiveManifestArtboard = {
    animations: string[]
    name: string
    stateMachines: RiveManifestStateMachine[]
  }

  export type RiveManifestEntry = {
    artboards: RiveManifestArtboard[]
    error?: string
    fileName: string
    src: string
    title: string
  }

  const manifest: RiveManifestEntry[]
  export default manifest
}
