# labs

Experiments served at https://labs.brendatama.dev/<slug>/. Each app is a git submodule in `apps/`
pointing at its own repo; `apps.json` says how to build it.

## Add an app
1. `git submodule add https://github.com/brendatamaar/<repo> apps/<slug>`
2. Add an entry to `apps.json` (build must honour base path `/<slug>/`).
3. Push. Register it in the portfolio admin (Labs → New).

Files the app needs but that are too big or not reproducible in CI (the Worker caps one file at 25 MiB) go in
`data/<slug>/` and are copied into the app's output via the entry's `"data"` field. Split anything over 25 MiB
into parts and list them in `chunks.json` (see gmaps-simulation: `fetchAsset` in the app joins them).

## Local
```
npm install
npm run build        # all apps, or: node scripts/build.mjs <slug>
npx wrangler dev
```

## Update flow
Push in an app repo → `notify-labs.yml` sends `repository_dispatch` → this repo pulls submodules, builds, deploys.
Also runs every 6h and on push.
