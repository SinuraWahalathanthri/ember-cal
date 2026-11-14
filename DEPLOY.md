# Local deployment

The downloadable project has no hosted Site ID or credentials. Its `.openai/hosting.json` is deliberately empty; the local builder only needs it as non-secret deployment metadata.

`npm run build` produces browser assets in `dist/client` and a self-contained Worker ES module at `dist/server/index.js`. `npm start` serves that build at 127.0.0.1:3000 and loads server-only configuration from an ignored `.env`. The build never reads the FIRMS key. Node 22/24 is supported.

The Node adapter binds to loopback by default. Docker explicitly binds inside its container and maps port 3000. For public hosting, add authentication and proper shared persistence before exposing refresh endpoints. The original hosted Site relied on an owner-private platform boundary; that boundary is not part of this local download.

API routes: GET /api/firms/status, GET /api/live?region=sri_lanka, POST /api/live/refresh?region=sri_lanka, POST /api/firms/verify. POST routes require a matching Origin header and application/json content type. Browsers send the Origin automatically; no browser request includes the secret. Reads use the process cache or packaged snapshots and never fetch NASA on behalf of a user-drawn area.

No unattended scheduler or durable archive is deployed. Worker/process memory resets on restart. The optional Python API is separate and not required for the main application.
