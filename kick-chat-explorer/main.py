#!/usr/bin/env python3
"""Exploratory CLI: fetch a Kick.com channel's info and recent chat, print it
readably, and dump the raw JSON to output.json for inspection."""

import argparse
import base64
import json
import os
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests
import websocket
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

API_BASE = "https://api.kick.com/public/v1"
TOKEN_URL = "https://id.kick.com/oauth/token"
SUBSCRIPTIONS_URL = f"{API_BASE}/events/subscriptions"
PUBLIC_KEY_URL = f"{API_BASE}/public-key"
WEBHOOK_PATH = "/kick-webhook"
OUTPUT_PATH = Path(__file__).parent / "output.json"
REQUEST_TIMEOUT = 10

# Unofficial, undocumented-but-public endpoints used to reach live chat.
# Kick's public API has no GET endpoint for chat history (confirmed 404) —
# real-time chat is delivered over the same Pusher WebSocket kick.com's own
# frontend uses. This app key/cluster is publicly visible in kick.com's
# client-side JS and is the same mechanism most third-party Kick chat tools
# use; it is not part of the documented Public API.
CHATROOM_LOOKUP_URL = "https://kick.com/api/v2/channels/{slug}"
PUSHER_WS_URL = (
    "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679"
    "?protocol=7&client=js&version=7.6.0&flash=false"
)
CHAT_MESSAGE_EVENT = "App\\Events\\ChatMessageEvent"

# Fallback used only when no CLI argument is given.
DEFAULT_CHANNEL = "xqc"

# Space-separated scopes requested for the client_credentials token. Left
# unset by default — Kick's token endpoint rejected explicit values like
# "user:read channel:read" as invalid_scope, so we let the server assign
# whatever default scope it grants app-only tokens. Set KICK_SCOPES to
# experiment with an explicit value once you find the correct scope names.
DEFAULT_SCOPES = ""


def fetch_app_access_token(client_id: str, client_secret: str) -> str:
    """Exchange app credentials for a bearer token via the client_credentials
    grant — this is the flow Kick's developer portal issues client_id/secret
    pairs for (no user login involved, suitable for public read-only data)."""
    scopes = os.environ.get("KICK_SCOPES", DEFAULT_SCOPES)
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    if scopes:
        data["scope"] = scopes
    resp = requests.post(TOKEN_URL, data=data, timeout=REQUEST_TIMEOUT)
    if not resp.ok:
        print(
            f"DEBUG: token endpoint returned HTTP {resp.status_code}: {resp.text}",
            file=sys.stderr,
        )
    resp.raise_for_status()
    body = resp.json()
    token = body["access_token"]

    # Debug info only — never print the full token.
    print(
        f"DEBUG: obtained access token (prefix={token[:8]}..., "
        f"len={len(token)}, token_type={body.get('token_type')}, "
        f"expires_in={body.get('expires_in')}, requested_scope={scopes}, "
        f"granted_scope={body.get('scope')})",
        file=sys.stderr,
    )
    return token


def resolve_access_token() -> str:
    token = os.environ.get("KICK_ACCESS_TOKEN")
    if token:
        return token

    client_id = os.environ.get("KICK_CLIENT_ID")
    client_secret = os.environ.get("KICK_CLIENT_SECRET")
    if client_id and client_secret:
        try:
            return fetch_app_access_token(client_id, client_secret)
        except requests.exceptions.RequestException as e:
            print(
                f"ERROR: failed to exchange KICK_CLIENT_ID/KICK_CLIENT_SECRET "
                f"for an access token ({e}).",
                file=sys.stderr,
            )
            sys.exit(1)

    print(
        "ERROR: no credentials found. Set either:\n"
        "  export KICK_ACCESS_TOKEN=your_token_here\n"
        "or:\n"
        "  export KICK_CLIENT_ID=your_client_id\n"
        "  export KICK_CLIENT_SECRET=your_client_secret",
        file=sys.stderr,
    )
    sys.exit(1)


def build_session() -> requests.Session:
    token = resolve_access_token()
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
    )
    return session


def perform_get(session: requests.Session, url: str, params: dict) -> dict:
    """GET a URL and return a self-describing result dict — this way every
    failure detail (status code, response body, connection error) ends up in
    output.json instead of only being printed to the terminal."""
    result = {"url": url, "params": params, "status_code": None, "ok": False, "data": None, "error": None}
    try:
        resp = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
        result["status_code"] = resp.status_code
        try:
            body = resp.json()
        except ValueError:
            body = resp.text
        if resp.ok:
            result["ok"] = True
            result["data"] = body
        else:
            result["error"] = f"HTTP {resp.status_code}"
            result["data"] = body
            print(f"WARNING: GET {url} failed with HTTP {resp.status_code}: {body}", file=sys.stderr)
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
        print(f"WARNING: GET {url} request error ({e}).", file=sys.stderr)
    return result


def fetch_channel(session: requests.Session, channel: str) -> dict:
    """GET channel/user info for the given slug.

    Kick's public API keys the /channels endpoint off a `slug` query param.
    """
    return perform_get(session, f"{API_BASE}/channels", {"slug": channel})


def fetch_chatroom_id(channel: str) -> dict:
    """Resolve a channel slug to its numeric chatroom id via kick.com's
    unofficial v2 API — the official public API's /channels response doesn't
    expose a chatroom id, and this is the standard lookup third-party Kick
    tools use."""
    url = CHATROOM_LOOKUP_URL.format(slug=channel)
    result = {"url": url, "status_code": None, "ok": False, "chatroom_id": None, "error": None}
    try:
        resp = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"},
        )
        result["status_code"] = resp.status_code
        if resp.ok:
            body = resp.json()
            chatroom_id = (body.get("chatroom") or {}).get("id")
            result["chatroom_id"] = chatroom_id
            result["ok"] = chatroom_id is not None
            if not result["ok"]:
                result["error"] = "response had no chatroom.id field"
        else:
            result["error"] = f"HTTP {resp.status_code}"
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
    return result


def listen_chat(chatroom_id: int, duration_seconds: int, limit: int) -> list[dict]:
    """Connect to Kick's Pusher WebSocket, subscribe to a chatroom, and
    collect messages as they arrive live until duration_seconds elapses or
    limit messages have been collected."""
    ws = websocket.create_connection(PUSHER_WS_URL, timeout=REQUEST_TIMEOUT)
    messages: list[dict] = []
    try:
        ws.recv()  # pusher:connection_established handshake frame — discard
        ws.send(
            json.dumps(
                {
                    "event": "pusher:subscribe",
                    "data": {"auth": "", "channel": f"chatrooms.{chatroom_id}.v2"},
                }
            )
        )

        deadline = time.time() + duration_seconds
        while time.time() < deadline and len(messages) < limit:
            ws.settimeout(max(deadline - time.time(), 0.1))
            try:
                raw = ws.recv()
            except websocket.WebSocketTimeoutException:
                break

            try:
                frame = json.loads(raw)
            except ValueError:
                continue
            if frame.get("event") != CHAT_MESSAGE_EVENT:
                continue

            try:
                payload = json.loads(frame.get("data", "{}"))
            except ValueError:
                continue
            sender = payload.get("sender") or {}
            messages.append(
                {
                    "username": sender.get("username", "unknown"),
                    "content": payload.get("content", ""),
                    "timestamp": payload.get("created_at") or datetime.now().isoformat(),
                }
            )
    finally:
        ws.close()
    return messages


def collect_live_chat(channel: str, duration_seconds: int, limit: int) -> dict:
    """Best-effort recent-chat collector: resolve the chatroom id, then listen
    live over WebSocket for duration_seconds. See module-level comment on
    CHATROOM_LOOKUP_URL/PUSHER_WS_URL — this is an unofficial mechanism since
    the Public API has no chat-history GET endpoint."""
    result = {
        "method": "websocket (unofficial Pusher chat feed)",
        "chatroom_lookup": None,
        "chatroom_id": None,
        "duration_seconds": duration_seconds,
        "ok": False,
        "messages": [],
        "error": None,
    }

    lookup = fetch_chatroom_id(channel)
    result["chatroom_lookup"] = lookup
    if not lookup["ok"]:
        result["error"] = f"could not resolve chatroom id: {lookup['error']}"
        print(f"WARNING: {result['error']}", file=sys.stderr)
        return result

    chatroom_id = lookup["chatroom_id"]
    result["chatroom_id"] = chatroom_id
    print(
        f"Listening to live chat for {duration_seconds}s "
        f"(chatroom_id={chatroom_id})...",
        file=sys.stderr,
    )
    try:
        result["messages"] = listen_chat(chatroom_id, duration_seconds, limit)
        result["ok"] = True
    except (websocket.WebSocketException, OSError) as e:
        result["error"] = str(e)
        print(f"WARNING: websocket chat listen failed ({e}).", file=sys.stderr)
    return result


# --- Official webhook-based chat capture -----------------------------------
#
# This is the Kick-supported way to receive chat: subscribe to the
# chat.message.sent event, and Kick POSTs each message to a webhook URL.
# That URL is configured per-app in Kick's Developer Dashboard (Account
# Settings -> Developer -> your app -> Enable Webhooks), NOT passed in the
# subscribe API call — so you must point it at a public tunnel (ngrok, etc.)
# in front of the local server this script starts. See README.md.


class WebhookState:
    def __init__(self, limit: int, public_key_pem: str | None):
        self.limit = limit
        self.public_key_pem = public_key_pem
        self.messages: list[dict] = []
        self._lock = threading.Lock()

    def add_message(self, message: dict) -> None:
        with self._lock:
            if len(self.messages) < self.limit:
                self.messages.append(message)

    def snapshot(self) -> list[dict]:
        with self._lock:
            return list(self.messages)

    def is_full(self) -> bool:
        with self._lock:
            return len(self.messages) >= self.limit


def verify_webhook_signature(
    public_key_pem: str, message_id: str, timestamp: str, raw_body: bytes, signature_b64: str
) -> bool:
    """RSA PKCS#1v1.5 + SHA-256 verification per docs.kick.com/events/webhook-security.
    Best-effort: this is an exploratory tool, so verification failures are
    logged but never block capturing the message."""
    try:
        public_key = serialization.load_pem_public_key(public_key_pem.encode())
        message = f"{message_id}.{timestamp}.".encode() + raw_body
        signature = base64.b64decode(signature_b64)
        public_key.verify(signature, message, padding.PKCS1v15(), hashes.SHA256())
        return True
    except Exception:
        return False


class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        shared: WebhookState = self.server.shared  # type: ignore[attr-defined]
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw_body = self.rfile.read(length) if length else b""

        verified = None
        if shared.public_key_pem:
            verified = verify_webhook_signature(
                shared.public_key_pem,
                self.headers.get("Kick-Event-Message-Id", ""),
                self.headers.get("Kick-Event-Message-Timestamp", ""),
                raw_body,
                self.headers.get("Kick-Event-Signature", ""),
            )
            if not verified:
                print(
                    "WARNING: webhook signature verification failed for an "
                    "incoming event (capturing it anyway).",
                    file=sys.stderr,
                )

        if self.headers.get("Kick-Event-Type") == "chat.message.sent":
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                payload = None
            if isinstance(payload, dict):
                sender = payload.get("sender") or {}
                shared.add_message(
                    {
                        "username": sender.get("username", "unknown"),
                        "content": payload.get("content", ""),
                        "timestamp": payload.get("created_at") or datetime.now().isoformat(),
                        "signature_verified": verified,
                    }
                )

        self.send_response(200)
        self.end_headers()

    def log_message(self, format: str, *args) -> None:  # noqa: A002 - stdlib signature
        pass  # silence default per-request access logging


def start_webhook_server(port: int, shared: WebhookState) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("0.0.0.0", port), WebhookHandler)
    server.shared = shared  # type: ignore[attr-defined]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def fetch_public_key(session: requests.Session) -> dict:
    result = {"url": PUBLIC_KEY_URL, "status_code": None, "ok": False, "public_key": None, "error": None}
    try:
        resp = session.get(PUBLIC_KEY_URL, timeout=REQUEST_TIMEOUT)
        result["status_code"] = resp.status_code
        if resp.ok:
            body = resp.json()
            key = body.get("public_key") if isinstance(body, dict) else None
            if not key and isinstance(body, dict):
                key = (body.get("data") or {}).get("public_key")
            result["public_key"] = key
            result["ok"] = key is not None
            if not result["ok"]:
                result["error"] = "response had no recognizable public_key field"
        else:
            result["error"] = f"HTTP {resp.status_code}"
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
    return result


def extract_broadcaster_user_id(channel_result: dict) -> int | None:
    if not channel_result.get("ok"):
        return None
    body = channel_result.get("data") or {}
    data = body.get("data") if isinstance(body, dict) else None
    first = (data or [{}])[0] if data else {}
    return first.get("broadcaster_user_id")


def subscribe_chat_webhook(session: requests.Session, broadcaster_user_id: int) -> dict:
    result = {
        "url": SUBSCRIPTIONS_URL,
        "status_code": None,
        "ok": False,
        "subscription_ids": [],
        "data": None,
        "error": None,
    }
    body = {
        "broadcaster_user_id": broadcaster_user_id,
        "events": [{"name": "chat.message.sent", "version": 1}],
        "method": "webhook",
    }
    try:
        resp = session.post(SUBSCRIPTIONS_URL, json=body, timeout=REQUEST_TIMEOUT)
        result["status_code"] = resp.status_code
        try:
            payload = resp.json()
        except ValueError:
            payload = resp.text
        result["data"] = payload
        if resp.ok:
            items = payload.get("data") if isinstance(payload, dict) else None
            if isinstance(items, list):
                result["subscription_ids"] = [
                    item.get("subscription_id") or item.get("id")
                    for item in items
                    if isinstance(item, dict) and (item.get("subscription_id") or item.get("id"))
                ]
            result["ok"] = True
        else:
            result["error"] = f"HTTP {resp.status_code}"
            print(
                f"WARNING: chat webhook subscription failed with HTTP {resp.status_code}: {payload}",
                file=sys.stderr,
            )
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
        print(f"WARNING: chat webhook subscription request error ({e}).", file=sys.stderr)
    return result


def delete_subscriptions(session: requests.Session, subscription_ids: list[str]) -> dict:
    result = {"url": SUBSCRIPTIONS_URL, "ids": subscription_ids, "status_code": None, "ok": False, "error": None}
    try:
        resp = session.delete(SUBSCRIPTIONS_URL, params={"id": subscription_ids}, timeout=REQUEST_TIMEOUT)
        result["status_code"] = resp.status_code
        result["ok"] = resp.ok
        if not resp.ok:
            result["error"] = f"HTTP {resp.status_code}"
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
    return result


def list_subscriptions(session: requests.Session) -> dict:
    result = {"url": SUBSCRIPTIONS_URL, "status_code": None, "ok": False, "subscription_ids": [], "error": None}
    try:
        resp = session.get(SUBSCRIPTIONS_URL, timeout=REQUEST_TIMEOUT)
        result["status_code"] = resp.status_code
        if resp.ok:
            body = resp.json()
            items = body.get("data") if isinstance(body, dict) else None
            if isinstance(items, list):
                result["subscription_ids"] = [
                    item.get("subscription_id") or item.get("id")
                    for item in items
                    if isinstance(item, dict) and (item.get("subscription_id") or item.get("id"))
                ]
            result["ok"] = True
        else:
            result["error"] = f"HTTP {resp.status_code}"
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
    return result


def cleanup_all_subscriptions(session: requests.Session) -> None:
    listing = list_subscriptions(session)
    if not listing["ok"]:
        print(f"ERROR: could not list subscriptions ({listing['error']}).", file=sys.stderr)
        sys.exit(1)

    ids = listing["subscription_ids"]
    if not ids:
        print("No existing subscriptions found — nothing to clean up.")
        return

    print(f"Found {len(ids)} subscription(s): {ids}")
    deletion = delete_subscriptions(session, ids)
    if deletion["ok"]:
        print(f"Deleted {len(ids)} subscription(s).")
    else:
        print(f"ERROR: delete failed ({deletion['error']}).", file=sys.stderr)
        sys.exit(1)


def collect_webhook_chat(
    session: requests.Session, broadcaster_user_id: int, duration_seconds: int, limit: int, port: int
) -> dict:
    """Subscribe to chat.message.sent and collect events delivered to a local
    webhook server for duration_seconds. Requires a tunnel (e.g. ngrok)
    forwarding a public URL to http://localhost:{port}{WEBHOOK_PATH}, with
    that public URL configured in Kick's Developer Dashboard webhook setting.
    """
    result = {
        "method": "webhook (official events API)",
        "local_webhook_url": f"http://localhost:{port}{WEBHOOK_PATH}",
        "public_key_fetch": None,
        "subscription": None,
        "cleanup": None,
        "duration_seconds": duration_seconds,
        "ok": False,
        "messages": [],
        "error": None,
    }

    pubkey_result = fetch_public_key(session)
    result["public_key_fetch"] = pubkey_result
    if not pubkey_result["ok"]:
        print(
            "WARNING: could not fetch Kick's public key — incoming webhook "
            "signatures will not be verified (messages are still captured).",
            file=sys.stderr,
        )

    shared = WebhookState(limit=limit, public_key_pem=pubkey_result.get("public_key"))
    server = start_webhook_server(port, shared)
    sub_result = None
    try:
        sub_result = subscribe_chat_webhook(session, broadcaster_user_id)
        result["subscription"] = sub_result
        if not sub_result["ok"]:
            result["error"] = f"subscription failed: {sub_result['error']}"
            return result

        print(
            f"Subscribed to chat.message.sent for broadcaster_user_id={broadcaster_user_id}. "
            f"Waiting up to {duration_seconds}s for events on "
            f"http://localhost:{port}{WEBHOOK_PATH} — make sure your tunnel "
            f"(e.g. ngrok) and Kick's dashboard webhook URL point here...",
            file=sys.stderr,
        )
        deadline = time.time() + duration_seconds
        try:
            while time.time() < deadline and not shared.is_full():
                time.sleep(0.5)
        except KeyboardInterrupt:
            print("Interrupted — stopping early and reporting what was captured.", file=sys.stderr)

        result["messages"] = shared.snapshot()
        result["ok"] = True
    finally:
        try:
            server.shutdown()
            server.server_close()
        except Exception:
            pass
        sub_ids = (sub_result or {}).get("subscription_ids") or []
        if sub_ids:
            result["cleanup"] = delete_subscriptions(session, sub_ids)

    return result


def extract_channel_summary(channel_result: dict) -> dict:
    if not channel_result.get("ok"):
        return {
            "slug": "unknown",
            "title": "",
            "viewers": None,
            "is_live": None,
            "error": channel_result.get("error"),
        }

    body = channel_result.get("data") or {}
    data = body.get("data") if isinstance(body, dict) else None
    first = (data or [{}])[0] if data else {}
    stream = first.get("stream") or {}
    return {
        "slug": first.get("slug") or first.get("broadcaster_user_id") or "unknown",
        "title": first.get("stream_title") or "",
        "viewers": stream.get("viewer_count"),
        "is_live": stream.get("is_live"),
        "error": None,
    }


def extract_messages(chat_result: dict) -> list[dict]:
    return chat_result.get("messages") or []


def format_timestamp(raw_ts) -> str:
    if not raw_ts:
        return "--:--:--"
    try:
        dt = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
        return dt.strftime("%H:%M:%S")
    except (ValueError, TypeError):
        return str(raw_ts)


DIVIDER = "─" * 28


def print_channel_summary(channel_summary: dict) -> None:
    print(DIVIDER)
    print(f"📺 Channel: {channel_summary['slug']}")
    if channel_summary["title"]:
        print(f"🎬 Title: {channel_summary['title']}")
    viewers = channel_summary["viewers"]
    print(f"👥 Viewers: {viewers:,}" if isinstance(viewers, int) else "👥 Viewers: n/a")
    if channel_summary["is_live"] is not None:
        print(f"🔴 Live: {'yes' if channel_summary['is_live'] else 'no'}")
    if channel_summary.get("error"):
        print(f"⚠️  Channel lookup error: {channel_summary['error']}")
    print(DIVIDER)


def print_chat_log(messages: list[dict]) -> None:
    print(f"💬 Recent Chat ({len(messages)} messages)\n")
    if not messages:
        print("  (no messages captured — see output.json for details)")
    for msg in messages:
        ts = format_timestamp(msg["timestamp"])
        print(f"[{ts}] {msg['username']}: {msg['content']}")
    print(DIVIDER)


def save_raw_json(channel_result: dict, messages_result: dict) -> None:
    combined = {
        "fetched_at": datetime.now().isoformat(),
        "channel": channel_result,
        "messages": messages_result,
    }
    OUTPUT_PATH.write_text(json.dumps(combined, indent=2))
    print(f"\n📝 Raw JSON saved to {OUTPUT_PATH}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Explore a Kick.com channel's info and chat.")
    parser.add_argument(
        "channel",
        nargs="?",
        default=DEFAULT_CHANNEL,
        help=f"Kick username/channel slug (default: {DEFAULT_CHANNEL})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Max number of recent chat messages to capture (default: 50)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=20,
        help="Seconds to listen to live chat before stopping (default: 20)",
    )
    parser.add_argument(
        "--mode",
        choices=["webhook", "websocket"],
        default="webhook",
        help=(
            "How to capture chat: 'webhook' uses Kick's official events API "
            "(requires a public tunnel like ngrok pointed at --port, "
            "configured in Kick's Developer Dashboard — see README). "
            "'websocket' uses an unofficial live feed and is currently "
            "blocked by kick.com's security policy for the chatroom lookup. "
            "Default: webhook."
        ),
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("KICK_WEBHOOK_PORT", 8000)),
        help="Local port for the webhook receiver in --mode webhook (default: 8000)",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="List and delete ALL existing event subscriptions for this app, then exit (no channel/chat fetch).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    session = build_session()

    if args.cleanup:
        cleanup_all_subscriptions(session)
        return

    channel_result = fetch_channel(session, args.channel)
    channel_summary = extract_channel_summary(channel_result)
    print_channel_summary(channel_summary)

    if args.mode == "webhook":
        broadcaster_user_id = extract_broadcaster_user_id(channel_result)
        if broadcaster_user_id is None:
            chat_result = {
                "method": "webhook (official events API)",
                "ok": False,
                "messages": [],
                "error": "no broadcaster_user_id available (channel lookup failed)",
            }
            print(f"WARNING: {chat_result['error']}", file=sys.stderr)
        else:
            chat_result = collect_webhook_chat(
                session, broadcaster_user_id, args.duration, args.limit, args.port
            )
    else:
        chat_result = collect_live_chat(args.channel, args.duration, args.limit)

    messages = extract_messages(chat_result)

    print_chat_log(messages)
    save_raw_json(channel_result, chat_result)


if __name__ == "__main__":
    main()
