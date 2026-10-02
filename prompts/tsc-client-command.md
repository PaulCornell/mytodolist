Me: What does tsc -p client do, and how does it know to do that?

---

Claude: tsc -p client compiles the browser code. It reads client/script.ts, checks its types, and writes plain JavaScript to public/script.js, which the browser loads. Everything it needs to know comes from a settings file, client/tsconfig.json.

The command

- tsc is the TypeScript compiler. It comes from the typescript package in node_modules/.bin, which npm makes available while scripts run.
- -p client is short for --project client. It tells tsc to use the settings file in the client folder, client/tsconfig.json.

Without -p, tsc uses the tsconfig.json in the current folder. That's how npm run typecheck (just tsc) gets the root config for the server code, while npm run build gets the client config. Two configs are needed because the server and the browser need different settings.

The settings file

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "es2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "rootDir": ".",
    "outDir": "../public",
    "strict": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["script.ts"]
}

Paths in this file are relative to the file's own location, client/, not to wherever you run the command from.

Which files to compile
- include: ["script.ts"] compiles only client/script.ts.

Where the output goes
- rootDir: "." says the source files live in client/.
- outDir: "../public" says to write the output to public/.
- tsc keeps each file's position relative to rootDir. So client/script.ts becomes public/script.js.