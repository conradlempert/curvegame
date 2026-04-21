# curvegame

Multiplayer "snake" survival game written in TypeScript.

## Architecture
- **Frontend**: Vite + vanilla TS, served on port 5000 (host 0.0.0.0).
- **Backend**: Express + socket.io, served on port 3000 (localhost).
- In dev, the Vite dev server proxies `/socket.io` requests to the backend on `localhost:3000`.
- In production, `npm run prod` runs the Express server which serves the built frontend from `/dist` and handles socket.io on the same port.

## Commands
- `npm run dev` — starts both backend (tsx watch) and Vite frontend.
- `npm run build` — typechecks and builds the frontend into `/dist`.
- `npm run prod` — runs the production server.

## Replit setup notes
- Workflow `Start application` runs `npm run dev` and waits for port 5000.
- `vite.config.ts` sets `host: 0.0.0.0`, `port: 5000`, `allowedHosts: true`, HMR via 443, and a `/socket.io` proxy to the backend.
- Deployment is configured as `autoscale` with build `npm run build` and run `npm run prod`.
