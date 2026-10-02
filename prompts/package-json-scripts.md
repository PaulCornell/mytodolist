Me: Explain how package.json works and then explain how the "scripts" inside of it works.

---

Claude: package.json is the main settings file for a Node project. npm reads it to learn what the project is, which packages it needs, and which commands it supports. Node also reads a few fields from it when it runs your code.

How package.json works

Here is yours, field by field:

{
  "name": "mytodolist",
  "version": "1.0.0",
  "description": "A to-do list app with a local SQLite-backed server",
  "main": "src/server.ts",
  "type": "module",
  "engines": { "node": ">=22.18.0" },
  "scripts": { ... },
  "dependencies": { "express": "^4.21.2" },
  "devDependencies": {
    "@types/express": "^4.17.25",
    "@types/node": "^22.20.5",
    "typescript": "^7.0.2"
  }
}

Identity fields: name, version, description
- These matter mainly if you publish the package to the npm registry so other people can install it.
- For an app like this one they're just labels.

main
- This is the file someone gets when they import your package by name, for example import x from "mytodolist".
- Nobody imports this app, so main mostly serves as documentation of where the code starts.
- It doesn't control what runs when you start the app. The start script does that.

type: "module"
- Node reads this field to decide which module system your files use.
- With "module", files use modern ES modules: import/export and import.meta.dirname.
- Without it, Node would use the older CommonJS system: require/module.exports and __dirname.

engines
- This declares which Node versions the project supports.
- npm only warns when the version doesn't match. It won't refuse to install unless you turn on the engine-strict setting.
- Think of it as documentation that npm can check.

dependencies vs devDependencies
- dependencies are packages the app needs while it runs. Here that's just Express.
- devDependencies are packages you only need while developing or building:
  - typescript provides the tsc compiler.
  - The two @types/... packages describe the shapes of Express's and Node's code so TypeScript can check yours.
- Running npm install installs both groups into node_modules/.
- A production install (npm install --omit=dev) skips devDependencies.

Version ranges and the lockfile
- ^4.21.2 means "4.21.2 or any newer 4.x version". The ^ allows minor updates and fixes but never a jump to 5.0.
- package-lock.json records the exact versions that were actually installed, including every package those packages depend on.
- Because of the lockfile, a later npm install (on your machine or someone else's) gets the same versions. That's why it changed when I added TypeScript, and why it should be committed.

How "scripts" works

"scripts": {
  "start": "node src/server.ts",
  "build": "tsc -p client",
  "prestart": "npm run build",
  "typecheck": "tsc"
}

Each entry gives a name to a shell command. Running npm run <name> runs that command.

Running a script
- npm run build runs tsc -p client.
- npm run typecheck runs tsc.
- A few names have shortcuts. npm start is the same as npm run start, and npm test is the same as npm run test. Other names need the word run.

Where the commands come from
- tsc isn't installed globally on your machine. It's inside node_modules/.bin/, which the typescript package put there.
- While a script runs, npm temporarily adds node_modules/.bin to your PATH.
- That's why "tsc" works inside a script, but typing tsc straight into your terminal may say "command not found". (npx tsc is how you'd run it by hand.)
- This also means everyone uses the project's own TypeScript version, not whatever happens to be installed on their machine.

Where the commands run
- Scripts always run from the project's root folder, even if you call npm run from a subfolder.
- They run in the system shell (sh on macOS and Linux, cmd.exe on Windows), so shell syntax like && works.

Pre and post hooks
- If a script named pre<name> exists, npm runs it automatically before <name>.
- Likewise, post<name> runs automatically after <name>.
- If any step fails (exits with a non-zero code), npm stops and the rest doesn't run.

Here's what happens when you type npm start:

npm start
 ├─ prestart:  npm run build
 │    └─ build:  tsc -p client     → compiles client/script.ts into public/script.js
 └─ start:     node src/server.ts  → Node strips the types and runs the server

If tsc finds a type error in the browser code, the build fails and the server never starts. That's deliberate, so you don't serve a stale or broken public/script.js.

Note that typecheck is not part of npm start. Node runs the server code without checking its types, so you run npm run typecheck yourself when you want that check. I can add it to prestart if you'd like every start to check the server code too.

Passing extra arguments
- Anything after -- is added to the end of the command.
- For example, npm run typecheck -- --watch runs tsc --watch, which re-checks every time you save a file.

Values npm provides
- Scripts can read fields from package.json through environment variables. For example, $npm_package_version is 1.0.0.

Seeing what's available
- Running npm run with no name lists all the scripts in the project.