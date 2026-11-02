# Wii Mii Creator — UI Redesign

An interactive, browser-based redesign of the **Wii Mii Creator** created for a UI/UX course project. The prototype explores ways to make character customization clearer, easier to navigate, and more flexible while retaining the recognizable purpose of the original Mii Creator.

## Project goals

This project focuses on **usability and user-centered design**, rather than building a production application. Our team examined and interacted with the original Wii Mii Creator to identify usability issues and opportunities for improvement.

The redesign explores:

- **Clearer navigation:** Make customization categories and available actions easier to find.
- **Immediate feedback:** Show appearance changes in the character preview as users make selections.
- **More customization options:** Expand available appearance and profile choices, including additional hairstyles and gender options.
- **Easier profile entry:** Use month and day dropdowns for birthday selection.
- **User control:** Support editing choices and, where implemented, undoing and redoing changes.

> This is a class demonstration prototype, not an official Nintendo product or a commercial application.

## Technologies

- **React** — builds the interactive interface using components.
- **TypeScript** — adds types to the application code.
- **Vite** — runs the local development server and builds the website.
- **CSS** — styles the layout, controls, and character customization interface.
- **Node.js and npm** — install dependencies and run development commands.

The initial interface was developed in Figma Make and then exported as a code project for local testing and refinement.

## Requirements

- A recent **Node.js LTS** release (includes npm)
- A modern web browser such as Chrome, Edge, or Firefox
- Internet access for initial dependency installation

Git is optional if you download the repository as a ZIP.

## Download and run

### Option A: Download ZIP (no Git required)

1. On this GitHub repository page, select **Code → Download ZIP**.
2. Extract the ZIP file.
3. Open the extracted project folder in **Visual Studio Code** (or another editor).
4. Open a terminal in the project root, where `package.json` is located.
5. Install dependencies:

   ```bash
   npm install
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open the **Local** URL shown in the terminal (for example, `http://localhost:5173/`). The actual port may differ.

Keep the terminal running while using the website. Press **Ctrl+C** in the terminal to stop the server.

### Option B: Clone with Git

```bash
git clone https://github.com/YOUR_USERNAME/448MiiProject.git
cd 448MiiProject
npm install
npm run dev
```

Replace `YOUR_USERNAME` with the repository owner's GitHub username, or copy the exact clone URL from the repository's **Code** menu.

## Mii preview resource

The 3D FFL preview and feature thumbnails need `AFLResHigh_2_3.dat` at `public/ffl/asset/model/character/mii/AFLResHigh_2_3.dat`. This local resource is not included in the repository. Without it, the app uses an approximate fallback preview and FFL thumbnails are unavailable. See [credits and resource details](CREDITS.md).


The FFL head sits on a handmade body in `src/mii-body.ts`. Its proportions follow Mii Channel screenshots, but it is not Nintendo's Wii body model.

### Optional background music

The Music button plays and pauses a user-supplied local track. To enable it, place the audio file at `public/ffl/music/mii-channel-editing.mp3`. The `public/ffl/` directory is gitignored, so the track is not included in the repository. Music starts only when the button is pressed. Vite may copy the local music and 3D resource into `dist/` when building; check build contents before sharing or deploying.

### Optional sound effects

Interface sounds use local copies of Mii Channel samples (see [credits](CREDITS.md)). Copy `Sample_0000.wav`–`Sample_0026.wav` from the downloaded "Sound Effects" sheet into `public/ffl/sfx/samples/`. Like the music, they are gitignored, and the production build removes `ffl/sfx/` from `dist/` so they are not published. Without the files, the button next to Music reads **Sounds unavailable** and the app is silent.

| Action | Sample | Played by |
| --- | --- | --- |
| Select | `Sample_0014` | Categories, feature and color choices, pager, gender, redo, on-screen keys, Front view, music button |
| Move focus | `Sample_0016` | Mouse hover over a control, or keyboard focus moving to one (not focus caused by a click) |
| Back / cancel | `Sample_0015` | Back, Esc, undo, reset buttons, Backspace key, failed save or restore |
| Adjust a value | `Sample_0005` | ± buttons, birthday menus, sliders (one tick per key press; silent while dragging or holding a key, then one tick on release) |
| Save / confirm | `Sample_0025` | Save Mii, Restore saved Mii, Confirm name |

The mapping and per-sound levels are in `src/sfx.ts`. **Mute sounds** is separate from the music control and is remembered in this browser. The mapping was chosen from acoustic measurements (pitch, envelope, and onset analysis), not from Nintendo's original assignments, which are not recorded in the sample sheet. To audition all 27 samples and pick a different mapping, run the dev server and open `/tools/sfx-audition.html`.

## How to use the prototype

1. Open the website using the local URL.
2. Explore the available Mii customization categories.
3. Select appearance options and observe the character preview.
4. Try profile settings such as birthday and gender selection.
5. Test navigation and editing controls to evaluate the redesigned workflow.

Some features may be prototype-only; verify behavior in the running application before presenting it as implemented.

## Current limits

These are implementation limits, not results from a user test:

- **Save Mii** stores the appearance and profile in this browser on this device. Refresh the page and choose **Restore saved Mii**. Nothing is uploaded, and another browser or device will not have the save.
- **Navigation** uses an icon-and-label row for the customization categories. Sections can be visited in any order.
- **Keyboard:** The first Tab reveals **Skip to editor controls**. Tab moves to the next control. ArrowDown from the selected category or editor panel enters the selected choice or first control; arrows move between choices and adjust a focused slider. Smooth color sliders move by a visible 0.1 palette step per key press while pointer dragging stays smooth. On the focused 3D preview, arrows turn the Mii and Home returns to front. Esc leaves the current control for its category, or returns to Face from elsewhere. Enter selects. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo and redo; text fields keep normal text undo. Gamepad controls are not implemented.
- **Long lists** such as hair and eyes are shown 12 at a time, with previous/next controls and page-dot indicators (screen readers still hear the page and range). Color controls stay above the list.
- **Colors:** Skin, hair, eyes, mouth, and glasses frames offer preset swatches and a Custom color picker with hue, saturation, and brightness controls. The selected hex is saved with the Mii. The FFL preview tints its materials and face textures to approximate custom colors; shading and feature artwork affect the visible result. Some mouth styles do not have a colorable region. The fallback preview is approximate and does not reproduce every custom feature color.
- **3D preview** needs the local Miitomo resource described above. Without it, the page uses the approximate fallback preview.
- The head is drawn with FFL.js's Wii U shader port, not Nintendo's original Wii renderer.

## Code structure

```text
448MiiProject/
├── public/             # Static assets, including the site icon
├── src/
│   ├── App.tsx         # Main React application and interface interactions
│   ├── index.css       # Global styles, layout, and visual design
│   ├── main.tsx        # React entry point; mounts the app
│   ├── mii-body.ts     # Handmade Wii-inspired body under the 3D head
│   ├── sfx.ts          # Sound-effect mapping, playback, and mute state
│   └── vite-env.d.ts   # Type declarations for Vite
├── tools/
│   └── sfx-audition.html  # Dev-only page for auditioning the local sound samples
├── index.html          # HTML entry point
├── package.json        # Dependencies and npm scripts
├── package-lock.json   # npm dependency lockfile
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite configuration
```

Additional Figma-generated configuration and helper files may also be included in the repository.

### Main files explained

- **`src/App.tsx`** contains the main interface and much of the React logic that responds to user selections.
- **`src/index.css`** controls visual presentation, such as typography, spacing, colors, and layout.
- **`src/main.tsx`** initializes the React application in the page.
- **`package.json`** lists the dependencies and scripts needed to run the project.
- **`vite.config.ts`** configures the development and build tooling.

## Troubleshooting

**`node` or `npm` is not recognized**

Install Node.js LTS, close and reopen your terminal, then check:

```bash
node -v
npm -v
```

**The default localhost port is unavailable**

Use the exact **Local** address printed by `npm run dev`. Vite may choose a different port, or the project may configure one explicitly.

**The page shows a Vite error overlay**

Read the file path and line number in the error, correct the code, and save. Vite usually refreshes the page automatically.

**Dependencies fail to install**

Make sure you are in the folder containing `package.json` and use a supported Node.js version. If npm reports a dependency conflict, review the error rather than ignoring it.

## Credits

Created by the project team for an educational UI/UX redesign assignment. Original Wii and Mii concepts belong to Nintendo. This project is an unofficial educational prototype. See [asset and technology credits](CREDITS.md) for linked sources, contributors, and licenses. Class presentation notes and screenshots are kept locally for the course handoff and are not part of this repository.
