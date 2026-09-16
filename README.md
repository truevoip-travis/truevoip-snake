# TrueVoIP Snake

Snake, as a standalone **NetSapiens Horizon SDK** app. Built from
`horizon-app-starter`.

Adds one page to the portal: **Apps → Snake**. Arrow keys or WASD to steer,
Space to start / pause / restart, plus on-screen buttons for touch. The board
follows the portal's light/dark theme.

| | |
| ------------------ | ----------------------------------------------------------- |
| Module name        | `truevoipSnake` |
| `remote_entry_url` | `https://<your-github-user>.github.io/truevoip-snake/remoteEntry.js` |
| `webpack_module`   | `truevoipSnake` |
| `integrity_hash`   | leave blank — the platform computes it from the bytes it fetches, and the field is no longer accepted |

## First-time setup

1. Push this repo to GitHub as **`truevoip-snake`**, public.
2. **Actions** tab → enable workflows.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push to `main` and wait for the run to go green.
5. Confirm `https://<your-github-user>.github.io/truevoip-snake/remoteEntry.js`
   returns JavaScript (it starts with `var truevoipSnake`). A blank page in the
   browser is expected — it only renders inside the portal.
6. Register it in the portal's **Registered Apps** with the values above.

## The update loop (every change)

1. Edit the code.
2. **Bump `version` in `package.json`.**
3. Commit and push to `main`.
4. Wait for Actions to go green.
5. **Redeploy the app in Registered Apps** in the portal.
6. Hard-refresh the portal (Ctrl+Shift+R).

Skipping the version bump is genuinely unsafe: the platform pins a hash of the
bytes it verified, so new bytes under an already-verified version leave it
enforcing the old hash and the app silently stops loading. The workflow guards
against this by comparing your build to what is actually live on the CDN.
Skipping the portal redeploy just means the portal keeps serving the version it
last verified.

## Layout

```
src/
  App.tsx                  Registers the Snake route under /apps
  pages/
    SnakeGamePage.tsx      The whole game — canvas board + host-kit chrome
webpack.config.js          MODULE_FEDERATION_NAME = 'truevoipSnake'
```

## Ideas

- **Shared leaderboard** — needs a small backend plus the SDK's
  `auth.requestRemoteAuth()` handshake.
- **Persist the high score** per user through `horizonContext.api`.
- **Top-bar launcher** — a `topbar-actions` zone extension that opens a mini
  board in the side panel via `sdk.openSidePanel()`.
