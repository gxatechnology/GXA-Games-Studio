# GXA Cricket Challenge — React + Three.js Source Project

This project has been reconstructed from the original exported `gxa_cricket_batting_challenge.tsx` (an untyped React/JSX file) and minimally patched for honest ad behavior. **The game is not yet certified production-ready.**

## Windows local development

Requirements: Node.js 20.19+ or 22.12+, npm, and an internet connection for the first `npm install`.

```powershell
cd "C:\path\to\GXA_Cricket_Challenge_Project"
npm install
npm run dev
```

Open the localhost URL shown by Vite (usually http://localhost:5173/). Click **Quick Match (2 Overs) > PLAY NOW**. Keyboard: arrows/WASD to aim, Space to bat, Z or Shift to loft, X to defend. Mobile: swipe the field or use the on-screen buttons.

## Production build for Hostinger

```powershell
npm run build
```

Upload the **contents of `dist/`** to the chosen deployment folder, e.g. `/public_html/games/cricket/`. The Vite relative `base: './'` ensures assets work from a subdirectory. Alternatively double-click `scripts/BUILD_ON_WINDOWS.bat` to create `GXA_Cricket_Hostinger_Deploy.zip` after installing dependencies.

**Do not replace the GXA Toolbox root `index.html`**. Use a separate games/cricket directory until integration is verified. Back up existing Hostinger files before deployment.

## HTML5 portal submissions

Lagged and GamePix require reviewing their current SDK, hosting, ad placements, metadata and submission rules. The GXAPlatformBridge is an abstraction, **not a working portal SDK**. For production, have the portal's real ad SDK integrate with `window.GXAAdAdapter`, before bootstrapping the app, and implement:

```js
window.GXAAdAdapter = {
  async showInterstitial() { /* invoke official SDK; resolve true only if shown */ return false; },
  async showRewarded() { /* invoke official SDK; true only after verified completion */ return false; }
};
```

No actual ads are supplied. No reward is granted without a verified ad completion. In the standalone build, replay functions normally without showing advertisements and optional rewarded ads are disabled.

## What was changed

- Wrapped the exported component in a Vite+React project, preserving all original core UI/gameplay.
- Renamed exported `.tsx` to `src/App.jsx`, because the export uses JavaScript JSX without TypeScript types.
- Added project bootstrapping, Tailwind setup, responsive CSS, and relative-path Vite build.
- Removed simulated ad success: ads now require a real verified host adapter; reward button is disabled otherwise.
- Replaced unverified in-game “QA Verified” wording with factual implementation/testing status.

## Testing status and limitations

- Source transpilation and static checks are run in this preparation environment, but **npm dependencies could not be fetched here due to blocked access to the npm registry**, so full `npm run build` and interactive gameplay verification could not be performed here.
- Local browser gameplay, mobile performance, complete match flow, loading behavior, and portal review **must** be tested after installing dependencies.
- Gameplay physics/scoring from the AI export have not been independently validated. Complete a playable 2-over match before publishing.
- The provided `ONLINE_PREVIEW` package is optional and uses public CDNs for runtime dependencies: it is *not* a self-contained production portal package.

See `QA_CHECKLIST.md` and `PATCH_NOTES.md` for the handoff.
