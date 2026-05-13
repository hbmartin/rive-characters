import { useId, useMemo, useReducer, useState } from 'react'
import {
  Alignment,
  DrawOptimizationOptions,
  Fit,
  Layout,
  StateMachineInputType,
  useRive,
  useStateMachineInput,
  type Rive as RiveInstance,
} from '@rive-app/react-canvas'
import riveFiles, { type RiveManifestEntry } from 'virtual:rive-manifest'
import './App.css'

const numberInputStep = 1

type ArtboardMeta = RiveManifestEntry['artboards'][number]
type StateMachineMeta = ArtboardMeta['stateMachines'][number]
type StateMachineInputMeta = StateMachineMeta['inputs'][number]

type GalleryItem = {
  artboard: ArtboardMeta
  artboardIndex: number
  file: RiveManifestEntry
}

function inputTypeLabel(type: StateMachineInputType) {
  switch (type) {
    case StateMachineInputType.Boolean:
      return 'Boolean'
    case StateMachineInputType.Number:
      return 'Number'
    case StateMachineInputType.Trigger:
      return 'Trigger'
    default:
      return 'Input'
  }
}

function updateRuntimeInputValue(
  runtimeInput: ReturnType<typeof useStateMachineInput>,
  value: boolean | number,
) {
  if (runtimeInput) {
    runtimeInput.value = value
  }
}

function getGalleryItems(files: RiveManifestEntry[]) {
  return files.flatMap((file) =>
    file.artboards.map((artboard, artboardIndex) => ({
      artboard,
      artboardIndex,
      file,
    })),
  )
}

function App() {
  const galleryItems = useMemo(() => getGalleryItems(riveFiles), [])
  const failedFiles = riveFiles.filter((file) => file.error)
  const fileCount = riveFiles.length
  const artboardCount = galleryItems.length

  return (
    <main className="app-shell">
      <header className="gallery-header">
        <div>
          <p className="eyebrow">Public Rive files</p>
          <h1>Rive artboard gallery</h1>
        </div>
        <div className="gallery-counts" aria-label="Gallery totals">
          <span>{fileCount} files</span>
          <span>{artboardCount} artboards</span>
        </div>
      </header>

      {failedFiles.length > 0 && (
        <section className="load-errors" aria-label="Rive load errors">
          {failedFiles.map((file) => (
            <p key={file.fileName}>
              <strong>{file.fileName}</strong>: {file.error}
            </p>
          ))}
        </section>
      )}

      <section className="gallery-list" aria-label="Rive artboards">
        {galleryItems.map((item) => (
          <RiveArtboardCard
            key={`${item.file.fileName}-${item.artboardIndex}-${item.artboard.name}`}
            item={item}
          />
        ))}
      </section>
    </main>
  )
}

function RiveArtboardCard({ item }: { item: GalleryItem }) {
  const [isActivated, setIsActivated] = useState(false)
  const stateMachineNames = useMemo(
    () => item.artboard.stateMachines.map((stateMachine) => stateMachine.name),
    [item.artboard.stateMachines],
  )
  const layout = useMemo(
    () => new Layout({ alignment: Alignment.Center, fit: Fit.Contain }),
    [],
  )
  const fallbackAnimation =
    stateMachineNames.length === 0 ? item.artboard.animations[0] : undefined
  const { rive, RiveComponent } = useRive(
    isActivated
      ? {
          artboard: item.artboard.name,
          animations: fallbackAnimation,
          autoplay: true,
          drawingOptions: DrawOptimizationOptions.DrawOnChanged,
          layout,
          shouldDisableRiveListeners: true,
          src: item.file.src,
          stateMachines:
            stateMachineNames.length > 0 ? stateMachineNames : undefined,
        }
      : null,
    {
      shouldResizeCanvasToContainer: true,
      useOffscreenRenderer: false,
    },
  )

  return (
    <article className="animation-card">
      <div className="animation-stage">
        {isActivated ? (
          <RiveComponent
            aria-label={`${item.file.title}, ${item.artboard.name}`}
            className="rive-canvas"
          />
        ) : (
          <div className="stage-placeholder">
            <button
              className="stage-load-button"
              onClick={() => setIsActivated(true)}
              type="button"
            >
              Load animation
            </button>
          </div>
        )}
      </div>

      <div className="animation-details">
        <header className="card-header">
          <div>
            <p className="file-name">{item.file.fileName}</p>
            <h2>{item.artboard.name}</h2>
          </div>
          <span className="runtime-status">
            {isActivated ? (rive ? 'Loaded' : 'Loading') : 'Ready'}
          </span>
        </header>

        <StateMachineControls
          rive={rive}
          stateMachines={item.artboard.stateMachines}
        />
      </div>
    </article>
  )
}

function StateMachineControls({
  rive,
  stateMachines,
}: {
  rive: RiveInstance | null
  stateMachines: StateMachineMeta[]
}) {
  const controllableStateMachines = stateMachines.filter(
    (stateMachine) => stateMachine.inputs.length > 0,
  )

  if (controllableStateMachines.length === 0) {
    return <p className="empty-controls">No state-machine inputs</p>
  }

  return (
    <div className="control-groups">
      {controllableStateMachines.map((stateMachine) => (
        <section className="control-group" key={stateMachine.name}>
          <h3>{stateMachine.name}</h3>
          <div className="control-list">
            {stateMachine.inputs.map((input) => (
              <InputControl
                input={input}
                key={`${stateMachine.name}-${input.name}`}
                rive={rive}
                stateMachineName={stateMachine.name}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function InputControl({
  input,
  rive,
  stateMachineName,
}: {
  input: StateMachineInputMeta
  rive: RiveInstance | null
  stateMachineName: string
}) {
  const runtimeInput = useStateMachineInput(rive, stateMachineName, input.name)

  switch (input.type) {
    case StateMachineInputType.Trigger:
      return (
        <button
          className="control-button trigger-button"
          disabled={!runtimeInput}
          onClick={() => runtimeInput?.fire()}
          type="button"
        >
          {input.name}
        </button>
      )
    case StateMachineInputType.Boolean:
      return <BooleanInputControl input={input} runtimeInput={runtimeInput} />
    case StateMachineInputType.Number:
      return <NumberInputControl input={input} runtimeInput={runtimeInput} />
    default:
      return (
        <p className="unsupported-input">
          {input.name} ({inputTypeLabel(input.type)})
        </p>
      )
  }
}

function BooleanInputControl({
  input,
  runtimeInput,
}: {
  input: StateMachineInputMeta
  runtimeInput: ReturnType<typeof useStateMachineInput>
}) {
  const [, rerender] = useReducer((value: number) => value + 1, 0)
  const value = typeof runtimeInput?.value === 'boolean' ? runtimeInput.value : false

  const toggleValue = () => {
    const nextValue = !value
    updateRuntimeInputValue(runtimeInput, nextValue)
    rerender()
  }

  return (
    <button
      aria-checked={value}
      className={`control-button toggle-button ${value ? 'is-on' : ''}`}
      disabled={!runtimeInput}
      onClick={toggleValue}
      role="switch"
      type="button"
    >
      <span>{input.name}</span>
      <span>{value ? 'On' : 'Off'}</span>
    </button>
  )
}

function NumberInputControl({
  input,
  runtimeInput,
}: {
  input: StateMachineInputMeta
  runtimeInput: ReturnType<typeof useStateMachineInput>
}) {
  const inputId = useId()
  const [, rerender] = useReducer((value: number) => value + 1, 0)
  const value = typeof runtimeInput?.value === 'number' ? runtimeInput.value : 0

  const setRuntimeValue = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) {
      return
    }

    updateRuntimeInputValue(runtimeInput, nextValue)
    rerender()
  }

  return (
    <div className="number-control">
      <label htmlFor={inputId}>{input.name}</label>
      <div className="number-control-row">
        <button
          aria-label={`Decrease ${input.name}`}
          disabled={!runtimeInput}
          onClick={() => setRuntimeValue(value - numberInputStep)}
          type="button"
        >
          -
        </button>
        <input
          disabled={!runtimeInput}
          id={inputId}
          onChange={(event) => setRuntimeValue(Number(event.currentTarget.value))}
          step={numberInputStep}
          type="number"
          value={value}
        />
        <button
          aria-label={`Increase ${input.name}`}
          disabled={!runtimeInput}
          onClick={() => setRuntimeValue(value + numberInputStep)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default App
