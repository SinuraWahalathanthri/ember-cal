# Open EmberCal in VS Code

1. Extract the ZIP and open the `embercal` folder in VS Code.
2. Install Node.js 22 or 24 LTS if it is not installed.
3. To run immediately, type `npm start` and open http://127.0.0.1:3000. No install is needed for the included prebuilt bundle.
4. To edit the source with hot reload, use the VS Code terminal:

```sh
npm ci
npm run dev
```

5. Open http://127.0.0.1:5173.
6. For live refresh, copy `.env.example` to `.env`, paste your FIRMS key after `FIRMS_MAP_KEY=`, then restart the dev command.

Your secret key is not included. Saved real observations are included; the historical calendar remains a labelled synthetic demo. Read README.md for tests, Python tools, Docker, and feature limits.
