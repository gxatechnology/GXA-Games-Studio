# File manifest

Original export: `gxa_cricket_batting_challenge.tsx` (not modified in original upload)

- `src/App.jsx`: original game source, with no-fake-ad patch and QA claim corrections
- `src/main.jsx`: React mounting entry point
- `src/index.css`: Tailwind layers, full-screen/mobile-safe canvas styles
- `index.html`: HTML launch file
- `package.json`: npm scripts and dependencies
- `vite.config.js`: static build and relative asset base
- `tailwind.config.cjs`, `postcss.config.cjs`: styling build configuration
- `scripts/BUILD_ON_WINDOWS.bat`: build and zip helper
- `README.md`, `QA_CHECKLIST.md`: setup and acceptance steps

Do not overwrite or delete unrelated files from existing GXA Toolbox. Deploy contents of the generated `dist/` directory into a dedicated subfolder.
