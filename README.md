# Rive Artboard Gallery

This app displays every Rive artboard found in `public/*.riv` as a vertical gallery. Each card shows the source file, artboard name, state-machine controls, and a `Load animation` button that initializes that specific Rive canvas on demand.

All animations sourced from [Rive Marketplace](https://rive.app/marketplace) under their respective licenses.

## Requirements

- Node.js 24 or newer is recommended for this project.
- pnpm is recommended because the repo includes `pnpm-lock.yaml`.
- A modern browser with WebAssembly support.

## Use The Gallery

- The gallery lists one card for each artboard in every `.riv` file under `public/`.
- Click `Load animation` on a card to mount that animation.
- Trigger inputs render as buttons.
- Boolean inputs render as on/off switches.
- Number inputs render with decrement, numeric value, and increment controls.

Animations are loaded on demand so the page does not initialize every Rive runtime at once.

## Add Or Remove Rive Files

1. Add `.riv` files directly to `public/`.
2. Restart the dev server so Vite regenerates the virtual Rive manifest.
3. Reload the page.

The manifest is generated in `vite.config.ts` by scanning `public/*.riv`, extracting:

- artboard names
- animation names
- state-machine names
- state-machine input names and types

The app then renders those entries from `src/App.tsx`.

## Build And Preview

Create a production build:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Runtime Notes

- Visible animations use `@rive-app/react-canvas`.
- Build-time metadata extraction uses Rive runtime APIs from `@rive-app/react-webgl2` inside the Vite manifest plugin.
- Some very complex `.riv` files can be expensive to initialize. Keep the on-demand loading behavior unless you have tested that eager loading is stable for your asset set.
- If an animation does not expose state-machine inputs, its card shows `No state-machine inputs`.


## Troubleshooting

- If a newly added `.riv` file does not appear, restart the dev server.
- If controls are missing for a card, inspect the Rive file and confirm the selected artboard has state-machine inputs.
- If the browser slows down after loading an animation, refresh the page and load fewer animations at once.
- If the build fails while reading a `.riv` file, check that the file is valid and can be opened in Rive.

## See also

- https://github.com/rive-app/awesome-rive
- https://blog.duolingo.com/world-character-visemes/
- https://tympanus.net/codrops/2025/05/12/integrating-rive-into-a-react-project-behind-the-scenes-of-valley-adventures/
- https://marmelab.com/blog/2023/01/30/rive-animation-state-machine.html
- https://rive.app/docs/runtimes/react/playing-audio
