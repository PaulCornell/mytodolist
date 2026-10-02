# mytodolist

A simple to-do list app. It runs as a small local web server (Node.js + Express)
backed by a SQLite database file (`todos.db`), so your tasks persist across
restarts. Everything stays on your own machine — nothing is sent anywhere.

## Requirements

- **Node.js 22.18 or newer** (needed for the built-in `node:sqlite` module and
  for running TypeScript directly — no separate database software or C/C++
  build tools required).

## Setup

### macOS

1. Install Node.js 22.18+:
   - Easiest: install [Homebrew](https://brew.sh) if you don't have it, then run:
     ```
     brew install node
     ```
   - Or download the macOS installer from [nodejs.org](https://nodejs.org).
2. Verify the install:
   ```
   node -v
   ```
   (should print `v22.18.0` or higher)
3. Open Terminal, navigate into this project folder, then continue with
   [Run the app](#run-the-app) below.

### Windows

1. Install Node.js 22.18+:
   - Download the Windows installer (`.msi`) from [nodejs.org](https://nodejs.org)
     and run it, accepting the defaults.
   - Or, if you use [winget](https://learn.microsoft.com/windows/package-manager/winget/):
     ```
     winget install OpenJS.NodeJS.LTS
     ```
2. Open a new Command Prompt or PowerShell window (so it picks up the updated
   PATH) and verify the install:
   ```
   node -v
   ```
   (should print `v22.18.0` or higher)
3. Navigate into this project folder, then continue with
   [Run the app](#run-the-app) below.

### Linux

1. Install Node.js 22.18+. The version in your distro's package manager is
   often older than required, so use [nvm](https://github.com/nvm-sh/nvm)
   or [NodeSource](https://github.com/nodesource/distributions) instead:
   - Using nvm:
     ```
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
     # restart your shell, then:
     nvm install 22
     ```
2. Verify the install:
   ```
   node -v
   ```
   (should print `v22.18.0` or higher)
3. Navigate into this project folder, then continue with
   [Run the app](#run-the-app) below.

## Run the app

From inside the project folder, run:

```
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The app is written in TypeScript. Node runs the server code in `src/`
directly. The browser code in `client/` has to be compiled to
`public/script.js`, which `npm start` does automatically before launching (or
run `npm run build` to do just that step). To check the server code for type
errors, run `npm run typecheck`.

Your tasks are stored in a `todos.db` file created in this folder the first
time you run the app.

### Running again later

You only need to run `npm install` once (unless the project's dependencies
change). After that, just run:

```
npm start
```

and open http://localhost:3000 again. Your existing tasks will still be there.

## Stopping and restarting the server

### Stopping it

If the server is running in the same terminal window where you ran
`npm start`, click into that window and press `Ctrl+C`. This shuts it down
immediately.

### Restarting it

Run `npm start` again from the project folder:

```
npm start
```

Your tasks are saved in `todos.db`, so nothing is lost — anything you added
before stopping the server will still be there after it restarts.

### If you can't find the terminal, or the port is already in use

If you closed the terminal window instead of pressing `Ctrl+C`, the server
may still be running in the background. `npm start` will fail with an error
like `EADDRINUSE` (port 3000 already in use) in that case. To stop it:

- **macOS / Linux:**
  ```
  lsof -ti :3000 | xargs kill
  ```
- **Windows (Command Prompt):**
  ```
  netstat -ano | findstr :3000
  taskkill /PID <the PID from the previous command> /F
  ```

Then run `npm start` again.
