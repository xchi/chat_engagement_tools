# Kick Chat Explorer

Quick exploratory script for the hackathon: fetches a Kick.com channel's info
via the Kick Public API, listens to that channel's live chat for a short
window, prints a readable summary, and saves the raw JSON to `output.json`
so you can inspect the actual data shape before building the real pipeline.

## Setup

```bash
cd kick-chat-explorer
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
```

## Auth

You need either a ready-made access token, or an app's client ID/secret
(the script will exchange those for a token automatically via the
`client_credentials` grant).

**Option A — already have an access token:**

```bash
export KICK_ACCESS_TOKEN="your_token_here"
```

**Option B — have a client ID/secret from the Kick developer portal:**

```bash
export KICK_CLIENT_ID="your_client_id"
export KICK_CLIENT_SECRET="your_client_secret"
```

`KICK_ACCESS_TOKEN` takes priority if both are set. Option B calls
`POST https://id.kick.com/oauth/token` with `grant_type=client_credentials`
to obtain a token before making any API requests. No explicit `scope` is
requested by default — per Kick's docs, app access tokens (client_credentials)
don't need a specific scope for event subscriptions; that requirement only
applies to user access tokens.

## Run

The target channel must be **live** — chat is captured in real time (there's
no history endpoint; see below), so there's nothing to capture on an offline
channel.

### Installing ngrok (one-time, per machine)

`--mode webhook` needs a public URL that forwards to your machine, since
Kick's servers POST events to it over the internet. [ngrok](https://ngrok.com)
is the simplest way to get one for local dev.

**Install:**

```bash
brew install ngrok
# or download the binary directly from https://ngrok.com/download
```

**Create a free account** at https://dashboard.ngrok.com/signup, then grab
your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
and register it locally (one-time):

```bash
ngrok config add-authtoken <your_authtoken>
```

(Skipping the account/authtoken step still mostly works but ngrok imposes
tighter limits on fully anonymous tunnels.)

### Per-session setup for `--mode webhook` (the default)

Kick delivers chat events by POSTing to a webhook URL you register **in your
app's Developer Dashboard settings** — not in the API call itself. On the
free ngrok plan, the public URL changes every time you restart the tunnel,
so this needs to be redone each session:

1. Start the tunnel first, on the same port you'll pass as `--port` (default `8000`):
   ```bash
   ngrok http 8000
   ```
   Copy the `https://<random>.ngrok-free.app` URL it prints, and **leave this
   terminal running** for the whole session — closing it kills the tunnel.
2. In the [Kick Developer Dashboard](https://kick.com/settings/developer) →
   your app → **Edit** → **Enable Webhooks**, turn the toggle **on** and
   paste (then make sure to **save**):
   ```
   https://<random>.ngrok-free.app/kick-webhook
   ```
   (`/kick-webhook` is the fixed path this script listens on — see
   `WEBHOOK_PATH` in `main.py`.)
3. Now run the script:
   ```bash
   python main.py alexis --duration 30
   ```

The script subscribes to `chat.message.sent` (plus `livestream.status.updated`
and `livestream.metadata.updated` unless you pass `--no-brb`), waits for
events to arrive on `http://localhost:8000/kick-webhook`, and unsubscribes
when done (so you don't accumulate stale subscriptions against Kick's
per-app limits).

**Debugging tip:** ngrok ships a local web inspector at
`http://127.0.0.1:4040` that shows every request hitting your tunnel in real
time. If chat isn't showing up, open that while the script is running:

- **Nothing shows up at all** → Kick isn't reaching your tunnel. Usually
  means the URL saved in the Developer Dashboard doesn't match your *current*
  ngrok session (easy to hit after restarting ngrok — the URL changes every
  time on the free plan).
- **Requests show up but return `502 Bad Gateway`** → ngrok reached your
  machine but nothing was listening on `--port` — almost always means the
  script wasn't actually running (or had already finished/shut down) when
  the event arrived, often from a leftover subscription created by a
  previous run. Run `python main.py --cleanup` to list and delete all
  existing subscriptions for your app, then start clean.
- **Requests show up as `200 OK`** → it's working; check `output.json` for
  the captured messages.

```bash
# listen longer / cap how many messages to capture
python main.py xqc --duration 60 --limit 100

# if your local server needs a different port (must match `ngrok http <port>`)
python main.py xqc --port 8080
```

### Alternative: `--mode websocket` (currently broken)

An earlier version of this script tried Kick's unofficial Pusher WebSocket
feed instead (no ngrok/dashboard setup needed). It's kept in the code as
`--mode websocket`, but **the chatroom-id lookup it depends on
(`kick.com/api/v2/channels/{slug}`) is now blocked by kick.com's WAF**
(`403 Request blocked by security policy`) — confirmed both from this
machine and from a plain `curl`. Left in for reference; don't expect it to
work without finding another way to resolve the chatroom id.

## BRB detection

**Kick has no BRB event.** The documented event list is `chat.message.sent`,
`channel.followed`, `channel.subscription.{new,renewal,gifts}`,
`channel.reward.redemption.updated`, `livestream.status.updated`,
`livestream.metadata.updated`, `moderation.banned` and `kicks.gifted` — nothing
that says "the streamer stepped away". So this script *infers* it from three
signals and keeps a `live` / `brb` / `offline` / `unknown` state machine:

| Signal | Event | Reads as BRB when |
| --- | --- | --- |
| Title / category change | `livestream.metadata.updated` | title or category matches `brb`, `be right back`, `afk`, `back in 5`, `quick break`, … |
| Live status flip | `livestream.status.updated` | *not* a BRB — `is_live=false` is tracked as `offline` (the stream ended) |
| Chat | `chat.message.sent` | the broadcaster types a BRB phrase; cleared by "i'm back" / "we're live" / "back now" |

It also seeds the starting state from the initial channel lookup, so a stream
that is *already* sitting on a BRB screen when you start is reported as `brb`
rather than `unknown`.

Transitions print to the terminal as they happen:

```
🟡 [14:02:11] live → brb (chat.message.sent: alexis said "brb food, 5 min" (matched "brb"))
🟢 [14:07:48] brb → live (livestream.metadata.updated: BRB marker gone from title: "Ranked grind")
```

and a summary prints at the end (episode count + total time away).

Flags:

```bash
# default: broadcaster's own chat counts as a signal
python main.py alexis --duration 300

# also trust moderators ("streamer is afk for a bit")
python main.py alexis --brb-chat mods

# ignore chat entirely; trust only the stream title and live status
python main.py alexis --brb-chat off

# turn it off, and don't subscribe to the livestream.* events at all
python main.py alexis --no-brb
```

`--brb-chat any` exists but is noisy — viewers say "brb" constantly.

**Accuracy caveats.** These are heuristics, not ground truth:

- A streamer who never changes their title and never types anything won't be
  detected as away at all.
- A title change unrelated to the break only clears a BRB that the *title* set,
  so a chat-signalled break isn't cancelled by an unrelated title edit.
- Phrases like "back to the grind" or "welcome back everyone" deliberately do
  not count as returning.
- When BRB detection is on, `--limit` no longer ends the run early — it caps
  stored messages, but the script keeps watching for state changes until
  `--duration` is up.

Every matched signal (including ones that didn't change the state) is recorded
under `messages.brb.signals` in `output.json`, so you can see what the detector
saw and tune `BRB_PATTERNS` / `BACK_PATTERNS` in `main.py` for a given channel.

## Output

- Terminal: channel info printed immediately; in webhook mode, a "Subscribed
  to ..." message while it waits up to `--duration` seconds (default 20) for
  events, live BRB state changes as they happen, then the captured chat and a
  stream-state summary.
- `output.json`: full details of every step — channel lookup, public-key
  fetch, the webhook subscription (and its cleanup/delete call), every
  captured message, a bounded log of every raw event received
  (`messages.events`, capped at 500 so a busy channel doesn't balloon the
  file), and the BRB state machine's transitions and signals
  (`messages.brb`) — for inspection.

## How chat capture works (and its limitations)

Kick's public API (`api.kick.com/public/v1`) does not document a GET
endpoint for chat history — confirmed by this script's earlier attempts
returning `404 Not Found`. The only ways to get chat data from Kick are live
feeds, not a history query:

1. **Official webhooks (what this script uses by default)** — subscribe to
   `chat.message.sent` via `POST /public/v1/events/subscriptions`; Kick
   pushes each event to your app's dashboard-configured webhook URL. Fully
   supported, but requires a public tunnel for local development.
2. **Unofficial Pusher WebSocket feed (`--mode websocket`)** — the same
   connection kick.com's own web client uses. No tunnel needed, but as of
   this writing the chatroom-id lookup it relies on is blocked by kick.com's
   security policy (see above). Not part of the documented Public API even
   when working, so treat it as unsupported.

Either way, because it's a live feed, `output.json` will only ever contain
messages sent *while the script was running* — there's no way to fetch
messages from before you started listening.

Webhook payloads are signed by Kick; this script verifies the signature
(RSA PKCS#1v1.5 + SHA-256, per `docs.kick.com/events/webhook-security`) when
it can fetch Kick's public key, but treats a failed/unavailable verification
as a warning rather than dropping the message — good enough for exploration,
not for a production trust boundary.
