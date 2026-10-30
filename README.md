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

## How to use the prototype

1. Open the website using the local URL.
2. Explore the available Mii customization categories.
3. Select appearance options and observe the character preview.
4. Try profile settings such as birthday and gender selection.
5. Test navigation and editing controls to evaluate the redesigned workflow.

Some features may be prototype-only; verify behavior in the running application before presenting it as implemented.

## Code structure

```text
448MiiProject/
├── public/             # Static assets, including the site icon
├── src/
│   ├── App.tsx         # Main React application and interface interactions
│   ├── index.css       # Global styles, layout, and visual design
│   ├── main.tsx        # React entry point; mounts the app
│   └── vite-env.d.ts   # Type declarations for Vite
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

Created by the project team for an educational UI/UX redesign assignment. Original Wii and Mii concepts belong to Nintendo. This project is an unofficial educational prototype.
