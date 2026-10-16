# Relay Isles

A compact strategy game for 2–4 humans and HTTP agents. [Play in a browser](https://relay-isles.forge-bot-media.workers.dev) without login, installation, payment or external AI APIs.

## Rules

Most points after eight rounds wins (ties share victory). Each turn choose one: claim a neutral island for 2 energy, capture an enemy island for 4 + its fort level, fortify your island for 2, charge for +4 energy, or signal for +1 point and +1 energy. Orthogonal adjacency to an island you own discounts a claim/capture by 1. Each captain starts with 5 energy; after everyone acts, each owned island earns 1 point, islands matching the tide forecast earn 2, and everyone gains 2 energy, capped at 12. Forecasts cycle harbors → reefs → relay → suns, repeated twice. Forts cap at level 2 and reset upon capture. The nine-minute match clock starts on Start; the next state read/action closes an expired match. Islands score only at completed round boundaries. Read the forecast, balance expansion against charging, defend valuable holdings, and steal before a tide scores.

## Play

Create a lobby with 2–4 seats. Share its invite URL or eight-character code. Friends enter the code on the home page; a shared URL opens spectator view and displays its code. The host clicks Start, automatically filling empty seats with deterministic bots. Quick Play starts a duel immediately. Click an island to inspect its claim/capture cost; disabled actions are illegal. A replay download contains every move, each tide’s income and final winners. Browser local storage remembers each seat token; do not share those tokens. Name strings are rendered as text, never HTML.

A match takes 16–32 actions, usually 2–5 minutes against bots, with a nine-minute server limit. A player who leaves may leave other players waiting until that limit; visit the state endpoint to finalize. There is no matchmaking queue, chat, wagering or account system.

## Run locally

Node 22 or later; no dependency installation needed.

```sh
npm test
npm run dev
# http://localhost:8787
```

The local adapter keeps matches in memory and loses them on restart. The public deployment uses one SQLite-backed Cloudflare Durable Object per match, with serialized mutation and durable state. The server never exposes seat tokens through public state. Eight-character random match codes permit shared spectating; use no private information. This demo is hosted on Workers Free: quota exhaustion can temporarily stop requests instead of charging usage. No paid subscription is enabled.

## HTTP/JSON API

All paths below are relative to the public URL or `http://localhost:8787`. Send `Content-Type: application/json`. `CODE` is the eight-character lobby code; site indices 0–10 refer to the public `sites` array. Client decisions must use `legalMoves` from a fresh state.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/matches` | `{"name":"Ada","seats":2}` | `{state, player, token}` |
| POST | `/api/matches/CODE/join` | `{"name":"Bot"}` | `{state, player, token}` |
| GET | `/api/matches/CODE` | — | Public state, legal moves, forecast, replay log |
| POST | `/api/matches/CODE/start` | `{"player":0,"fillBots":true}` | `{state}`; host token required |
| POST | `/api/matches/CODE/move` | `{"player":0,"version":3,"action":{"type":"claim","site":2}}` | `{state}`; matching seat token required |

Authenticated requests include `Authorization: Bearer TOKEN`. Keep each returned seat token private and store it before starting. `version` provides optimistic concurrency: two requests against one state cannot both move. A `409` requires refreshing state; `403` means a wrong token; `400` is an invalid action/lobby operation; `404` is an unknown match/path. No action spends money.

Actions: `{"type":"claim","site":2}`, `{"type":"fortify","site":2}`, `{"type":"charge"}`, `{"type":"signal"}`. State includes `phase` (`lobby`, `playing`, `finished`), `players` with public score/energy/bot flags, `sites` with owner/fort/coordinates, `turn`, `round`, `version`, `event`, `remainingSeconds`, `legalMoves`, `log` and `winner` (array of player IDs). The response after a human move includes any immediately following internal bot turns. Full state is public; no hidden information.

### Sample external bot

Create a two-seat browser lobby, then run this before starting:

```sh
node sample-bot.mjs https://relay-isles.forge-bot-media.workers.dev CODE "HTTP Captain"
```

Click Start in the host browser. The external bot joins as a real human-equivalent seat, polls every three seconds and chooses legal moves. The built-in bot uses a deterministic forecast/remaining-round heuristic; the sample external bot deliberately uses a simpler random expansion policy. Neither calls a model nor needs a key. A killed external bot is not automatically replaced; its match expires after nine minutes.

## Deployment

The application uses standard Worker modules, one Durable Object binding `MATCHES` to class `Match`, and a migration `new_sqlite_classes: ["Match"]`. Bundle `worker.mjs` as ESM with esbuild 0.28.2 (or upload the three modules), set compatibility date `2026-10-01`, and enable the workers.dev hostname. Use Workers Free only. No account credentials belong in this repository. The included `wrangler.jsonc` documents the binding and migration for a separate free account; deploying requires that account’s own credentials.

## Validation and limits

`npm test` exercises complete 2/3/4-player bot matches, replay score reconciliation, adjacency/capture/fortification, invalid actions, timeout completion, seat-token isolation, stale concurrent moves and host/internal-bot progression. Browser smoke checks cover an eight-round duel and narrow-screen overflow. Public HTTP smoke checks exercise actual durable storage, a separate joining agent, authorization and completed match readback. The free demo has no anti-abuse service or uptime guarantee; quotas apply. Host tokens grant only their own seat and lobby start, not control of other human seats. No claim of solved strategic balance is made: selection and human play-testing decide the bounty.

MIT licensed. AI-assisted original implementation for Taskmarket `TSK-V6J8MSSD` by shylock-earner.
