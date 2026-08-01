#!/usr/bin/env python3
"""In-memory mock of a chat engagement API.

Serves fake-but-plausible engagement data for a video: viewer chat, sentiment
points derived from that chat, category info and captions. Everything is
generated from the ids in the URL — no database, and the only mutable state
(posted captions) is a module-level dict that resets when the process restarts.

Chat is seeded from the video_id, so the same video always returns the same
messages and therefore the same sentiment curve.
"""

from __future__ import annotations

import hashlib
import random
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Query
from pydantic import BaseModel

DEFAULT_VIDEO_LENGTH_SECONDS = 600
MAX_VIDEO_LENGTH_SECONDS = 86_400

DEFAULT_POINTS = 20
MAX_POINTS = 500

# Seconds between consecutive messages — spaced enough that a 10 minute video
# lands around 60-150 messages rather than thousands.
MIN_GAP_SECONDS = 4
MAX_GAP_SECONDS = 10

EMOTES = {
    "hype": [
        "https://files.kick.com/emotes/37226/fullsize",   # KEKW
        "https://files.kick.com/emotes/37233/fullsize",   # PogU
        "https://files.kick.com/emotes/4148074/fullsize", # HYPERCLAP
        "https://files.kick.com/emotes/37232/fullsize",   # PeepoClap
        "https://files.kick.com/emotes/5756671/fullsize", # GIGACHAD
        "https://files.kick.com/emotes/5756668/fullsize", # EZ
        "https://files.kick.com/emotes/5380971/fullsize", # AURAPULSE
        "https://files.kick.com/emotes/37227/fullsize",   # LULW
    ],
    "dropping": [
        "https://files.kick.com/emotes/5756504/fullsize", # NODDERS
        "https://files.kick.com/emotes/4148081/fullsize", # Sadge
        "https://files.kick.com/emotes/4147902/fullsize", # KEKBye
        "https://files.kick.com/emotes/5756628/fullsize", # MuteD
        "https://files.kick.com/emotes/5273243/fullsize", # lowCortisol
    ],
    "funny": [
        "https://files.kick.com/emotes/4148076/fullsize", # HaHaa
        "https://files.kick.com/emotes/5756623/fullsize", # OuttaPocket
        "https://files.kick.com/emotes/5756632/fullsize", # SUSSY
        "https://files.kick.com/emotes/5756678/fullsize", # WeirdChamp
        "https://files.kick.com/emotes/37236/fullsize",   # ThisIsFine
    ],
    "vibe": [
        "https://files.kick.com/emotes/4148144/fullsize", # catblobDance
        "https://files.kick.com/emotes/4147884/fullsize", # vibePls
        "https://files.kick.com/emotes/5756644/fullsize", # ratJAM
        "https://files.kick.com/emotes/37245/fullsize",   # peepoDJ
        "https://files.kick.com/emotes/5756616/fullsize", # DanceDance
    ],
    "controversy": [
        "https://files.kick.com/emotes/5756675/fullsize", # peepoRiot
        "https://files.kick.com/emotes/4147892/fullsize", # PatrickBoo
        "https://files.kick.com/emotes/5273247/fullsize", # highCortisol
        "https://files.kick.com/emotes/5273241/fullsize", # MOGGED
    ],
}

CATEGORIES = {
    "category-1": "Just Chatting",
    "category-2": "Gaming",
    "category-3": "Music",
}

# Seeded users, one per category, so every flavour can be demoed without a
# setter endpoint. Any other user_id is auto-assigned a category on first use.
USERS: dict[str, dict] = {
    "user-123": {"user_id": "user-123", "username": "pixelpaladin", "category_id": "category-2"},
    "user-456": {"user_id": "user-456", "username": "lofilauren", "category_id": "category-3"},
    "user-789": {"user_id": "user-789", "username": "chattycharlie", "category_id": "category-1"},
}

# Captions added via POST, keyed by user_id. The generated defaults are not
# stored here — they're derived on read, so this only holds what callers added.
POSTED_CAPTIONS: dict[str, list[dict]] = {}

VIEWER_NAMES = [
    "nova_kate",
    "pixel_pete",
    "sleepy_sam",
    "mango_mike",
    "quietstorm",
    "bitcrusher",
    "late_night_lena",
    "toast_enjoyer",
    "riverbend",
    "kiwi_on_toast",
    "dartboard_dan",
    "moth_to_flame",
    "sunny_d",
    "eleven_pm",
    "clover_kid",
    "wandering_wren",
    "grumpy_gus",
    "sushi_sundays",
    "vhs_static",
    "cactus_carl",
]

# (message, sentiment) pairs, sentiment in -1..1. Sentiment points average the
# scores of the messages that land in each time bucket, so the pools are mixed
# on purpose — an all-positive pool would make every bucket look identical.
# Keyed by category *name* so a new category id reusing a name needs no new pool.
CHAT_LINES: dict[str, list[tuple[str, float]]] = {
    "Gaming": [
        ("Nice play!", 0.9),
        ("absolute clutch", 1.0),
        ("GG!", 0.8),
        ("no way you dodged that", 0.8),
        ("your build is insane", 0.9),
        ("that loot is cracked", 0.7),
        ("W gameplay", 0.9),
        ("that was frame perfect", 0.8),
        ("one more run!", 0.6),
        ("is that a new PB?", 0.5),
        ("this soundtrack goes hard", 0.7),
        ("speedrun strats fr", 0.5),
        ("what difficulty is this on?", 0.0),
        ("what's your sensitivity?", 0.0),
        ("heal up before the fight", 0.0),
        ("second phase is the hard one", -0.1),
        ("he's low, finish him", 0.2),
        ("BEHIND YOU", -0.2),
        ("how many attempts is this now?", -0.3),
        ("that boss was brutal", -0.4),
        ("rip", -0.5),
        ("the hitboxes in this game are rough", -0.7),
        ("this patch ruined the game", -0.9),
        ("just craft the better sword lol", -0.3),
        ("chat backseating again", -0.4),
        ("that was so unfair", -0.8),
    ],
    "Music": [
        ("this beat is fire", 1.0),
        ("chills", 0.9),
        ("the mix sounds so clean", 0.9),
        ("that transition was smooth", 0.8),
        ("play the last one again!", 0.7),
        ("the vocals sit perfectly", 0.9),
        ("this would go crazy live", 0.8),
        ("KEY CHANGE", 0.7),
        ("encore!!", 0.9),
        ("instant addition to my study playlist", 0.8),
        ("melody is stuck in my head already", 0.6),
        ("I could listen to this all day", 1.0),
        ("what DAW are you using?", 0.0),
        ("is this an original?", 0.0),
        ("what BPM is this?", 0.0),
        ("who produced this one?", 0.0),
        ("spotify link?", 0.1),
        ("can you loop this part?", 0.1),
        ("acoustic version when?", 0.2),
        ("bass is a little loud imo", -0.3),
        ("needs more hi-hats", -0.2),
        ("the snare could use more punch", -0.3),
        ("turn the sub up a touch", -0.2),
        ("mic is peaking badly", -0.7),
        ("this one isn't it sorry", -0.8),
        ("audio keeps cutting out", -0.9),
    ],
    "Just Chatting": [
        ("good morning everyone", 0.6),
        ("first time here, love the vibe", 1.0),
        ("lol", 0.5),
        ("that's so relatable", 0.6),
        ("hard agree", 0.6),
        ("thanks for the advice earlier", 0.9),
        ("cat cam please", 0.7),
        ("chat is wild today", 0.4),
        ("on my lunch break, perfect timing", 0.7),
        ("hi from Germany", 0.5),
        ("we've all been there", 0.3),
        ("can you tell that story again?", 0.6),
        ("how was your day?", 0.0),
        ("what's for dinner?", 0.0),
        ("coffee or tea?", 0.0),
        ("did you see the news?", 0.0),
        ("how long have you been streaming?", 0.0),
        ("what's the plan for the weekend?", 0.1),
        ("same tbh", 0.1),
        ("I'm supposed to be working right now", -0.1),
        ("my commute was brutal", -0.6),
        ("the weather is insane today", -0.3),
        ("you should really get more sleep", -0.2),
        ("what happened to your voice?", -0.4),
        ("mic sounds muffled today", -0.7),
        ("this took a depressing turn", -0.8),
    ],
}

CAPTION_LINES: dict[str, list[str]] = {
    "Gaming": [
        "Final boss, 47th attempt",
        "This build shouldn't be legal",
        "Chat called it before I did",
        "New personal best, barely",
    ],
    "Music": [
        "Late night studio session",
        "Built this one from a single sample",
        "Key change hits at 2:14",
        "Rough mix, be gentle",
    ],
    "Just Chatting": [
        "Coffee and chaos, morning stream",
        "Answering your questions for an hour",
        "The story you all keep asking about",
        "Just vibing, no agenda today",
    ],
}


def seeded_rng(*parts: str) -> random.Random:
    """A Random seeded from the given id parts, so the same ids always produce
    the same data — across requests and across restarts."""
    digest = hashlib.md5("|".join(parts).encode("utf-8")).hexdigest()
    return random.Random(int(digest, 16))


def category_for(value: str) -> str:
    """Deterministically assign a category id by hashing an id."""
    digest = hashlib.md5(value.encode("utf-8")).hexdigest()
    category_ids = sorted(CATEGORIES)
    return category_ids[int(digest, 16) % len(category_ids)]


def get_user(user_id: str) -> dict:
    """Look up a user, inventing one if we've never seen this id."""
    user = USERS.get(user_id)
    if user is None:
        user = {
            "user_id": user_id,
            "username": user_id,
            "category_id": category_for(user_id),
        }
        USERS[user_id] = user
    return user


def generate_chat(video_id: str, video_length_seconds: int) -> list[dict]:
    """Build the video's full chat log, deterministically from `video_id`.

    Messages ascend through the video a few seconds apart. Each carries the
    sentiment of its canned line, which is what the sentiment endpoint averages
    — both endpoints call this, so the two always agree.
    """
    rng = seeded_rng(video_id, str(video_length_seconds))
    pool = CHAT_LINES[CATEGORIES[category_for(video_id)]]

    messages: list[dict] = []
    offset = rng.randint(0, MIN_GAP_SECONDS)
    while offset <= video_length_seconds:
        message, sentiment = rng.choice(pool)
        username = rng.choice(VIEWER_NAMES)
        # Don't let the same viewer post twice in a row.
        while messages and username == messages[-1]["username"]:
            username = rng.choice(VIEWER_NAMES)

        messages.append(
            {
                "id": f"message-{len(messages) + 1}",
                "username": username,
                "message": message,
                "offset_seconds": offset,
                "sentiment_score": sentiment,
            }
        )
        offset += rng.randint(MIN_GAP_SECONDS, MAX_GAP_SECONDS)

    return messages


def bucket_index(offset_seconds: int, video_length_seconds: int, points: int) -> int:
    """Which sentiment bucket a message falls into. A message landing exactly on
    the final boundary belongs to the last bucket rather than one past the end."""
    index = offset_seconds * points // video_length_seconds
    return min(index, points - 1)


STARTUP_BANNER = """chat_engagement API starting up
  docs:         http://127.0.0.1:8001/docs
  endpoints:    GET  /videos/{video_id}/chat
                GET  /videos/{video_id}/sentiment
                GET  /users/{user_id}/category
                GET  /users/{user_id}/captions
                POST /users/{user_id}/captions"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # flush=True so the banner isn't stuck in a buffer behind uvicorn's own
    # log lines when stdout is redirected to a file.
    print(STARTUP_BANNER, flush=True)
    print(f"  seeded users: {', '.join(sorted(USERS))}", flush=True)
    yield
    print("chat_engagement API shutting down", flush=True)


app = FastAPI(
    title="chat_engagement API",
    description="Mock engagement data for a video: chat, sentiment, categories and captions.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/videos/{video_id}/chat")
def get_video_chat(
    video_id: str,
    video_length_seconds: int = Query(
        DEFAULT_VIDEO_LENGTH_SECONDS,
        ge=1,
        le=MAX_VIDEO_LENGTH_SECONDS,
        description="How long the video is; chat is spread across it.",
    ),
    limit: Optional[int] = Query(
        None,
        ge=1,
        description="Return only the first N messages. Omit for the whole log.",
    ),
) -> dict:
    """Return the video's chat, seeded from `video_id` so it never changes."""
    category_id = category_for(video_id)
    messages = generate_chat(video_id, video_length_seconds)
    if limit is not None:
        messages = messages[:limit]

    return {
        "video_id": video_id,
        "video_length_seconds": video_length_seconds,
        "category_id": category_id,
        "category_name": CATEGORIES[category_id],
        "message_count": len(messages),
        "messages": messages,
    }


@app.get("/videos/{video_id}/sentiment")
def get_video_sentiment(
    video_id: str,
    video_length_seconds: int = Query(
        DEFAULT_VIDEO_LENGTH_SECONDS,
        ge=1,
        le=MAX_VIDEO_LENGTH_SECONDS,
        description="How long the video is; buckets divide this evenly.",
    ),
    points: int = Query(
        DEFAULT_POINTS,
        ge=1,
        le=MAX_POINTS,
        description="How many sentiment points to return.",
    ),
) -> dict:
    """Chop the video into `points` equal buckets and score each one from the
    chat messages inside it: -1 negative, 0 neutral, 1 positive.

    Always returns exactly `points` points — a bucket with no chat scores 0.
    """
    messages = generate_chat(video_id, video_length_seconds)

    buckets: list[list[dict]] = [[] for _ in range(points)]
    for message in messages:
        buckets[bucket_index(message["offset_seconds"], video_length_seconds, points)].append(
            message
        )

    results = []
    for index, bucket in enumerate(buckets):
        start = round(index * video_length_seconds / points)
        end = round((index + 1) * video_length_seconds / points)
        score = (
            round(sum(m["sentiment_score"] for m in bucket) / len(bucket), 2) if bucket else 0.0
        )

        results.append(
            {
                "point": index + 1,
                "timestamp_seconds": start,
                "bucket_start_seconds": start,
                "bucket_end_seconds": end,
                "sentiment_score": score,
                "chat_message_count": len(bucket),
                "chat_message_ids": [m["id"] for m in bucket],
            }
        )

    return {
        "video_id": video_id,
        "video_length_seconds": video_length_seconds,
        "points": results,
    }


@app.get("/users/{user_id}/category")
def get_user_category(user_id: str) -> dict:
    """The category a user streams under — what flavours their chat and captions."""
    user = get_user(user_id)
    return {
        "user_id": user_id,
        "category_id": user["category_id"],
        "category_name": CATEGORIES[user["category_id"]],
    }


@app.get("/users/{user_id}/captions")
def get_user_captions(user_id: str) -> dict:
    """Generated captions for the user's category, plus anything POSTed since
    the process started."""
    user = get_user(user_id)
    category_id = user["category_id"]

    rng = seeded_rng(user_id, "captions")
    pool = CAPTION_LINES[CATEGORIES[category_id]]
    generated = [
        {"caption_id": f"caption-{index}", "text": text, "source": "generated"}
        for index, text in enumerate(rng.sample(pool, len(pool)), start=1)
    ]
    captions = generated + POSTED_CAPTIONS.get(user_id, [])

    return {
        "user_id": user_id,
        "category_id": category_id,
        "category_name": CATEGORIES[category_id],
        "caption_count": len(captions),
        "captions": captions,
    }


class CaptionCreate(BaseModel):
    text: str


@app.post("/users/{user_id}/captions", status_code=201)
def create_user_caption(user_id: str, caption: CaptionCreate) -> dict:
    """Add a caption for a user. In-memory only — it's gone on restart."""
    get_user(user_id)
    stored = POSTED_CAPTIONS.setdefault(user_id, [])
    created = {
        "caption_id": f"caption-posted-{len(stored) + 1}",
        "text": caption.text,
        "source": "posted",
    }
    stored.append(created)

    return {"user_id": user_id, "caption": created}
