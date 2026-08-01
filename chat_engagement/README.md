# chat_engagement API

A tiny in-memory mock of an engagement API for a video: viewer chat, sentiment
points derived from that chat, category info and captions. Hack Day prototype —
no auth, no API keys, no database. The only mutable state is posted captions,
which live in a module-level dict and reset when you restart.

Everything is seeded from the ids in the URL, so **the same `video_id` always
returns the same chat and the same sentiment curve**.

## Run

```bash
cd chat_engagement
python3 -m venv venv && source venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

Interactive docs: http://127.0.0.1:8001/docs

Port 8001 keeps it clear of `kick-chat-explorer`'s webhook receiver on 8000.

On startup it prints:

```
chat_engagement API starting up
  docs:         http://127.0.0.1:8001/docs
  endpoints:    GET  /videos/{video_id}/chat
                GET  /videos/{video_id}/sentiment
                GET  /users/{user_id}/category
                GET  /users/{user_id}/captions
                POST /users/{user_id}/captions
  seeded users: user-123, user-456, user-789
```

## Endpoints

| Method | Path                             | Returns                              |
| ------ | -------------------------------- | ------------------------------------ |
| GET    | `/videos/{video_id}/chat`        | the video's full chat log            |
| GET    | `/videos/{video_id}/sentiment`   | N sentiment points across the video  |
| GET    | `/users/{user_id}/category`      | the category the user streams under  |
| GET    | `/users/{user_id}/captions`      | the user's captions                  |
| POST   | `/users/{user_id}/captions`      | adds a caption                       |

### `GET /videos/{video_id}/chat?video_length_seconds=600&limit=10`

Chat spread across the video, 4–10 seconds apart (a 600s video lands around
60–150 messages). `video_length_seconds` defaults to 600; `limit` is optional
and just truncates the response.

```bash
curl "http://127.0.0.1:8001/videos/video-1/chat?video_length_seconds=600&limit=2"
```

```json
{
  "video_id": "video-1",
  "video_length_seconds": 600,
  "category_id": "category-3",
  "category_name": "Music",
  "message_count": 2,
  "messages": [
    {
      "id": "message-1",
      "username": "kiwi_on_toast",
      "message": "what DAW are you using?",
      "offset_seconds": 4,
      "sentiment_score": 0.0
    },
    {
      "id": "message-2",
      "username": "nova_kate",
      "message": "audio keeps cutting out",
      "offset_seconds": 12,
      "sentiment_score": -0.9
    }
  ]
}
```

- **Usernames** are drawn from a pool of 20 viewers; the same viewer never posts
  twice in a row.
- **Messages** are picked from a pool matching the video's category, which is
  itself derived from the `video_id`.
- **`offset_seconds`** is the position in the video, ascending.

### `GET /videos/{video_id}/sentiment?video_length_seconds=600&points=20`

Chops the video into `points` equal time buckets and scores each one by
averaging the sentiment of the chat messages inside it:

```
-1 = negative    0 = neutral    1 = positive
```

Always returns **exactly** `points` points (default 20, max 500). A bucket with
no chat scores `0.0` with an empty `chat_message_ids`.

```bash
curl "http://127.0.0.1:8001/videos/video-1/sentiment?video_length_seconds=600&points=20"
```

```json
{
  "video_id": "video-1",
  "video_length_seconds": 600,
  "points": [
    {
      "point": 1,
      "timestamp_seconds": 0,
      "bucket_start_seconds": 0,
      "bucket_end_seconds": 30,
      "sentiment_score": 0.65,
      "chat_message_count": 12,
      "chat_message_ids": ["message-1", "message-2"]
    }
  ]
}
```

The `chat_message_ids` are the ids from `GET /videos/{video_id}/chat` for the
same `video_id` and `video_length_seconds` — both endpoints generate the same
chat, so every message lands in exactly one bucket.

### `GET /users/{user_id}/category`

```bash
curl "http://127.0.0.1:8001/users/user-123/category"
```

```json
{ "user_id": "user-123", "category_id": "category-2", "category_name": "Gaming" }
```

### `GET /users/{user_id}/captions`

Four generated captions matching the user's category, plus anything POSTed
since the last restart (`"source"` tells them apart).

```bash
curl "http://127.0.0.1:8001/users/user-456/captions"
```

```json
{
  "user_id": "user-456",
  "category_id": "category-3",
  "category_name": "Music",
  "caption_count": 4,
  "captions": [
    { "caption_id": "caption-1", "text": "Key change hits at 2:14", "source": "generated" },
    { "caption_id": "caption-2", "text": "Late night studio session", "source": "generated" },
    { "caption_id": "caption-3", "text": "Rough mix, be gentle", "source": "generated" },
    { "caption_id": "caption-4", "text": "Built this one from a single sample", "source": "generated" }
  ]
}
```

### `POST /users/{user_id}/captions`

```bash
curl -X POST "http://127.0.0.1:8001/users/user-456/captions" \
  -H "Content-Type: application/json" \
  -d '{"text":"Second take, much cleaner"}'
```

Returns `201`:

```json
{
  "user_id": "user-456",
  "caption": {
    "caption_id": "caption-posted-1",
    "text": "Second take, much cleaner",
    "source": "posted"
  }
}
```

## Categories and seeded users

| Category id  | Name          | Seeded user | Chat flavour        |
| ------------ | ------------- | ----------- | ------------------- |
| `category-1` | Just Chatting | `user-789`  | casual conversation |
| `category-2` | Gaming        | `user-123`  | game-related chat   |
| `category-3` | Music         | `user-456`  | music/production    |

Any other `user_id` or `video_id` works too — the category is derived by hashing
the id, so it's stable across requests and restarts. Change a seeded user's
`category_id` in `USERS` (`app.py`) to re-point them.

## Notes

- No Dockerfile — run it with uvicorn as above.
- Validation errors (e.g. `points=0`) return FastAPI's default `422`. There are
  no custom error codes; unknown ids are never an error, they just generate data.
