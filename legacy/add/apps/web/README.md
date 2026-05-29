# Web App

This is the web-first UI shell for AD&D.

Current responsibilities:

- host the SolidJS interface,
- communicate with the simulation worker,
- render management panels,
- and provide the first canvas-backed map surface.

Current limitation:

- the worker still contains a temporary scaffold runtime.
- the next step is to replace that runtime with the Rust WebAssembly bindings from `crates/web-bindings`.

Useful commands:

- `npm install`
- `npm run dev:web`
- `npm run build:web`
