# Arc Cascade

Arc Cascade is a browser-based brick breaker inspired by Ballz. It is built with plain JavaScript and `canvas`, runs entirely on the client, and is structured so the gameplay logic, rendering, input, and persistence stay easy to reason about.

## Features

- Aim and fire a stream of balls from the launcher
- Blocks advance downward each round
- Destroyed bricks disappear immediately during a volley
- Optional `2x Speed` button appears during long volleys
- Local best score and settings are stored in browser storage
- Static-host friendly setup with no backend required

## Requirements

- Node.js 22+ recommended

## Getting Started

Install is not required because the project has no external dependencies.

Start the local server:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

## Controls

- Click and drag on the playfield to aim
- Release to fire
- Click `2x Speed` after it appears to speed up the current volley
- Click `Restart Run` to begin a new game

## Testing

Run the project test suite with:

```bash
npm test
```

The tests cover core gameplay logic including:

- launch direction clamping
- wall and block collision behavior
- hidden collision around visual brick gaps
- round resolution and pickup handling
- speed-up availability
- storage fallback behavior

## Project Structure

- [index.html](./index.html): app shell and DOM entrypoint
- [styles.css](./styles.css): layout and visual styling
- [server.js](./server.js): tiny local static server for development
- [src/main.js](./src/main.js): app bootstrap, HUD updates, and main loop wiring
- [src/gameState.js](./src/gameState.js): gameplay state machine and round flow
- [src/render.js](./src/render.js): canvas rendering for the board, balls, and overlays
- [src/physics.js](./src/physics.js): vector math and collision handling
- [src/board.js](./src/board.js): round generation and brick spawning
- [src/storage.js](./src/storage.js): local storage adapter
- [tests/run.js](./tests/run.js): lightweight test harness

## Notes

- Open the game through the local server, not via `file://`, because browser module loading will be blocked by CORS rules.
- The visible gap between bricks is decorative; collision still treats brick cells as solid so balls cannot pass through seams.
- Audio is currently implemented as hooks/events only, which makes it easy to connect sound effects later.

## License

This project includes a [LICENSE](./LICENSE) file in the repository root.
