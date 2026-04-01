import json
import math
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from typing import Any

import requests
from flask import Flask, g, jsonify, render_template, request

DB_PATH = os.path.join(os.path.dirname(__file__), "manecourse.db")
PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")
RESTAURANTS_PER_MEMBER = 3
MAX_DECK_SIZE = 30

app = Flask(__name__)

VALID_USERS = {f"gator{i}": "password" for i in range(1, 6)}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    db = getattr(g, "_db", None)
    if db is None:
        db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        g._db = db
    return db


@app.teardown_appcontext
def close_db(_exc: BaseException | None) -> None:
    db = getattr(g, "_db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    db = sqlite3.connect(DB_PATH)
    db.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS auth_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host_user_id INTEGER NOT NULL REFERENCES users(id),
            radius_miles REAL NOT NULL DEFAULT 5,
            price_min INTEGER NOT NULL DEFAULT 1,
            price_max INTEGER NOT NULL DEFAULT 3,
            cuisines_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            added_by_user_id INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL,
            PRIMARY KEY(group_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            round_number INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('active', 'resolved')),
            winner_place_id TEXT,
            stale_tie INTEGER NOT NULL DEFAULT 0,
            tie_signature TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            created_at TEXT NOT NULL,
            resolved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS round_restaurants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
            place_id TEXT NOT NULL,
            position INTEGER NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            price_level INTEGER,
            cuisine TEXT,
            photo_url TEXT,
            place_url TEXT,
            distance_miles REAL NOT NULL,
            UNIQUE(round_id, place_id),
            UNIQUE(round_id, position)
        );

        CREATE TABLE IF NOT EXISTS votes (
            round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            place_id TEXT NOT NULL,
            liked INTEGER NOT NULL CHECK(liked IN (0,1)),
            updated_at TEXT NOT NULL,
            PRIMARY KEY(round_id, user_id, place_id)
        );

        CREATE TABLE IF NOT EXISTS round_participants (
            round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
            completed_at TEXT,
            PRIMARY KEY(round_id, user_id)
        );
        """
    )
    db.commit()
    db.close()


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.8
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header.removeprefix("Bearer ").strip() if header else ""
        if not token:
            return jsonify({"error": "Missing auth token"}), 401

        db = get_db()
        row = db.execute(
            """
            SELECT u.*
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            return jsonify({"error": "Invalid auth token"}), 401
        g.current_user = row
        return fn(*args, **kwargs)

    return wrapper


def ensure_group_member(group_id: int) -> sqlite3.Row | None:
    db = get_db()
    return db.execute(
        """
        SELECT g.*
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE g.id = ? AND gm.user_id = ?
        """,
        (group_id, g.current_user["id"]),
    ).fetchone()


def group_to_json(row: sqlite3.Row) -> dict[str, Any]:
    db = get_db()
    member_count = db.execute(
        "SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?", (row["id"],)
    ).fetchone()["c"]
    return {
        "id": row["id"],
        "name": row["name"],
        "memberCount": member_count,
        "settings": {
            "radiusMiles": row["radius_miles"],
            "priceMin": row["price_min"],
            "priceMax": row["price_max"],
            "cuisines": json.loads(row["cuisines_json"] or "[]"),
        },
    }


def get_active_round(group_id: int) -> sqlite3.Row | None:
    db = get_db()
    return db.execute(
        """
        SELECT *
        FROM rounds
        WHERE group_id = ? AND status = 'active'
        ORDER BY round_number DESC
        LIMIT 1
        """,
        (group_id,),
    ).fetchone()


def get_round_deck(round_id: int) -> list[dict[str, Any]]:
    db = get_db()
    rows = db.execute(
        """
        SELECT *
        FROM round_restaurants
        WHERE round_id = ?
        ORDER BY position ASC
        """,
        (round_id,),
    ).fetchall()
    return [
        {
            "placeId": r["place_id"],
            "name": r["name"],
            "address": r["address"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "priceLevel": r["price_level"],
            "cuisine": r["cuisine"] or "Restaurant",
            "photoUrl": r["photo_url"],
            "placeUrl": r["place_url"],
            "distanceMiles": r["distance_miles"],
            "position": r["position"],
        }
        for r in rows
    ]


def search_nearby_places(
    latitude: float,
    longitude: float,
    radius_miles: float,
    price_min: int,
    price_max: int,
    cuisines: list[str],
) -> list[dict[str, Any]]:
    if not PLACES_API_KEY:
        raise RuntimeError(
            "GOOGLE_PLACES_API_KEY is not configured on the backend environment."
        )

    radius_meters = max(100, int(radius_miles * 1609.34))
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius_meters,
        "type": "restaurant",
        "key": PLACES_API_KEY,
        "minprice": max(0, price_min),
        "maxprice": min(4, price_max),
    }
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("status") not in {"OK", "ZERO_RESULTS"}:
        raise RuntimeError(payload.get("error_message") or payload.get("status"))

    cuisine_terms = {c.lower().strip() for c in cuisines if c.strip()}
    results: list[dict[str, Any]] = []
    for r in payload.get("results", []):
        place_id = r.get("place_id")
        geom = (r.get("geometry") or {}).get("location") or {}
        lat = geom.get("lat")
        lng = geom.get("lng")
        if not place_id or lat is None or lng is None:
            continue

        name = r.get("name") or "Unknown restaurant"
        types = [t.replace("_", " ") for t in r.get("types", [])]
        all_terms = {name.lower(), *[t.lower() for t in types]}
        if cuisine_terms and not any(
            any(ct in term for term in all_terms) for ct in cuisine_terms
        ):
            continue

        distance = haversine_miles(latitude, longitude, float(lat), float(lng))
        cuisine_guess = next(
            (t for t in types if "restaurant" in t and t != "restaurant"),
            "Restaurant",
        )
        photo_ref = ((r.get("photos") or [{}])[0]).get("photo_reference")
        photo_url = (
            f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_ref}&key={PLACES_API_KEY}"
            if photo_ref
            else None
        )
        results.append(
            {
                "placeId": place_id,
                "name": name,
                "address": r.get("vicinity"),
                "latitude": float(lat),
                "longitude": float(lng),
                "priceLevel": r.get("price_level"),
                "cuisine": cuisine_guess.title(),
                "photoUrl": photo_url,
                "placeUrl": f"https://www.google.com/maps/place/?q=place_id:{place_id}",
                "distanceMiles": round(distance, 2),
            }
        )

    # Deterministic order for fairness.
    results.sort(key=lambda x: (x["distanceMiles"], x["placeId"]))
    return results


def create_round(
    group_id: int,
    latitude: float,
    longitude: float,
    restaurants: list[dict[str, Any]],
) -> sqlite3.Row:
    db = get_db()
    group = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    members = db.execute(
        "SELECT user_id FROM group_members WHERE group_id = ? ORDER BY user_id", (group_id,)
    ).fetchall()
    next_round_number = (
        db.execute(
            "SELECT COALESCE(MAX(round_number), 0) + 1 AS n FROM rounds WHERE group_id = ?",
            (group_id,),
        ).fetchone()["n"]
    )

    round_id = db.execute(
        """
        INSERT INTO rounds(group_id, round_number, status, latitude, longitude, created_at)
        VALUES (?, ?, 'active', ?, ?, ?)
        RETURNING id
        """,
        (group_id, next_round_number, latitude, longitude, now_iso()),
    ).fetchone()["id"]

    for idx, restaurant in enumerate(restaurants):
        db.execute(
            """
            INSERT INTO round_restaurants(
                round_id, place_id, position, name, address, latitude, longitude,
                price_level, cuisine, photo_url, place_url, distance_miles
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                round_id,
                restaurant["placeId"],
                idx,
                restaurant["name"],
                restaurant.get("address"),
                restaurant["latitude"],
                restaurant["longitude"],
                restaurant.get("priceLevel"),
                restaurant.get("cuisine"),
                restaurant.get("photoUrl"),
                restaurant.get("placeUrl"),
                restaurant.get("distanceMiles", 0),
            ),
        )

    for m in members:
        db.execute(
            "INSERT INTO round_participants(round_id, user_id, completed) VALUES (?, ?, 0)",
            (round_id, m["user_id"]),
        )

    db.commit()
    _ = group
    return db.execute("SELECT * FROM rounds WHERE id = ?", (round_id,)).fetchone()


def resolve_round_if_complete(round_id: int) -> dict[str, Any]:
    db = get_db()
    round_row = db.execute("SELECT * FROM rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        return {"status": "error", "error": "Round not found"}

    progress = db.execute(
        """
        SELECT
            SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_count,
            COUNT(*) AS total_count
        FROM round_participants
        WHERE round_id = ?
        """,
        (round_id,),
    ).fetchone()

    completed_count = progress["completed_count"] or 0
    total_count = progress["total_count"] or 0
    if completed_count < total_count:
        return {"status": "waiting", "completedCount": completed_count, "totalCount": total_count}

    vote_rows = db.execute(
        """
        SELECT place_id, SUM(CASE WHEN liked = 1 THEN 1 ELSE 0 END) AS likes
        FROM votes
        WHERE round_id = ?
        GROUP BY place_id
        """,
        (round_id,),
    ).fetchall()
    deck_rows = db.execute(
        "SELECT place_id, position FROM round_restaurants WHERE round_id = ? ORDER BY position",
        (round_id,),
    ).fetchall()
    likes_by_place = {v["place_id"]: int(v["likes"] or 0) for v in vote_rows}
    ordered_place_ids = [r["place_id"] for r in deck_rows]
    max_likes = max((likes_by_place.get(pid, 0) for pid in ordered_place_ids), default=0)
    tied = [pid for pid in ordered_place_ids if likes_by_place.get(pid, 0) == max_likes]
    if not tied and ordered_place_ids:
        tied = [ordered_place_ids[0]]

    group_id = round_row["group_id"]
    stale_tie = False
    winner_place = None
    next_round_id = None

    if len(tied) == 1:
        winner_place = tied[0]
    else:
        tie_signature = ",".join(sorted(tied))
        prev = db.execute(
            """
            SELECT tie_signature
            FROM rounds
            WHERE group_id = ? AND round_number = ? LIMIT 1
            """,
            (group_id, round_row["round_number"] - 1),
        ).fetchone()
        stale_tie = bool(prev and prev["tie_signature"] == tie_signature)
        if stale_tie:
            winner_place = tied[0]
        else:
            tied_rows = db.execute(
                """
                SELECT place_id, position, name, address, latitude, longitude, price_level, cuisine, photo_url, place_url, distance_miles
                FROM round_restaurants
                WHERE round_id = ? AND place_id IN ({})
                ORDER BY position ASC
                """.format(",".join(["?"] * len(tied))),
                (round_id, *tied),
            ).fetchall()
            tied_restaurants = [
                {
                    "placeId": r["place_id"],
                    "name": r["name"],
                    "address": r["address"],
                    "latitude": r["latitude"],
                    "longitude": r["longitude"],
                    "priceLevel": r["price_level"],
                    "cuisine": r["cuisine"],
                    "photoUrl": r["photo_url"],
                    "placeUrl": r["place_url"],
                    "distanceMiles": r["distance_miles"],
                }
                for r in tied_rows
            ]
            next_round = create_round(
                group_id,
                round_row["latitude"],
                round_row["longitude"],
                tied_restaurants,
            )
            next_round_id = next_round["id"]
        db.execute(
            "UPDATE rounds SET tie_signature = ? WHERE id = ?",
            (tie_signature, round_id),
        )

    db.execute(
        """
        UPDATE rounds
        SET status = 'resolved', winner_place_id = ?, stale_tie = ?, resolved_at = ?
        WHERE id = ?
        """,
        (winner_place, 1 if stale_tie else 0, now_iso(), round_id),
    )
    db.commit()

    payload: dict[str, Any] = {
        "status": "resolved",
        "winnerPlaceId": winner_place,
        "staleTie": stale_tie,
    }
    if next_round_id:
        payload["nextRoundId"] = next_round_id
        payload["status"] = "next_round"
    return payload


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")

    if VALID_USERS.get(username) == password:
        return jsonify({"success": True, "message": "Login successful"})
    return jsonify({"success": False, "message": "Invalid username or password"}), 401


@app.get("/home")
def home():
    return render_template("home.html")


@app.get("/group/<int:group_id>/settings")
def group_settings_page(group_id: int):
    return render_template("group-settings.html", group_id=group_id)


@app.get("/group/<int:group_id>/swipe")
def swipe_page(group_id: int):
    return render_template("swipe.html", group_id=group_id)


@app.get("/group/<int:group_id>/results")
def results_page(group_id: int):
    return render_template("results.html", group_id=group_id)


@app.get("/group/<int:group_id>/map")
def map_page(group_id: int):
    return render_template("map.html", group_id=group_id)


@app.get("/restaurant/<int:restaurant_id>")
def restaurant_detail_page(restaurant_id: int):
    return render_template("restaurant-detail.html", restaurant_id=restaurant_id)


@app.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    full_name = (data.get("fullName") or "").strip()
    password = data.get("password") or ""
    if not username or not email or not full_name or not password:
        return jsonify({"error": "username, email, fullName, and password are required"}), 400

    db = get_db()
    try:
        user_id = db.execute(
            """
            INSERT INTO users(username, email, full_name, password, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
            """,
            (username, email, full_name, password, now_iso()),
        ).fetchone()["id"]
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists"}), 409

    token = secrets.token_urlsafe(32)
    db.execute(
        "INSERT INTO auth_tokens(token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, now_iso()),
    )
    db.commit()
    return jsonify(
        {
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "email": email,
                "fullName": full_name,
            },
        }
    )


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    db = get_db()
    row = db.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?", (username, password)
    ).fetchone()
    if not row:
        return jsonify({"error": "Invalid username or password"}), 401

    token = secrets.token_urlsafe(32)
    db.execute(
        "INSERT INTO auth_tokens(token, user_id, created_at) VALUES (?, ?, ?)",
        (token, row["id"], now_iso()),
    )
    db.commit()
    return jsonify(
        {
            "token": token,
            "user": {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "fullName": row["full_name"],
            },
        }
    )


@app.get("/api/me")
@auth_required
def me():
    return jsonify(
        {
            "id": g.current_user["id"],
            "username": g.current_user["username"],
            "email": g.current_user["email"],
            "fullName": g.current_user["full_name"],
        }
    )


@app.get("/api/groups")
@auth_required
def list_groups():
    db = get_db()
    rows = db.execute(
        """
        SELECT g.*
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = ?
        ORDER BY g.id DESC
        """,
        (g.current_user["id"],),
    ).fetchall()
    return jsonify({"groups": [group_to_json(r) for r in rows]})


@app.post("/api/groups")
@auth_required
def create_group():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Group name is required"}), 400

    db = get_db()
    group_id = db.execute(
        """
        INSERT INTO groups(name, host_user_id, created_at)
        VALUES (?, ?, ?)
        RETURNING id
        """,
        (name, g.current_user["id"], now_iso()),
    ).fetchone()["id"]
    db.execute(
        """
        INSERT INTO group_members(group_id, user_id, added_by_user_id, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (group_id, g.current_user["id"], g.current_user["id"], now_iso()),
    )
    db.commit()
    row = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    return jsonify({"group": group_to_json(row)}), 201


@app.delete("/api/groups/<int:group_id>")
@auth_required
def delete_group(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if group["host_user_id"] != g.current_user["id"]:
        return jsonify({"error": "Only host can delete group"}), 403
    db = get_db()
    db.execute("DELETE FROM groups WHERE id = ?", (group_id,))
    db.commit()
    return jsonify({"ok": True})


@app.get("/api/groups/<int:group_id>/settings")
@auth_required
def get_group_settings(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    db = get_db()
    members = db.execute(
        """
        SELECT u.username
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY u.username
        """,
        (group_id,),
    ).fetchall()
    return jsonify(
        {
            "group": group_to_json(group),
            "members": [m["username"] for m in members],
        }
    )


@app.put("/api/groups/<int:group_id>/settings")
@auth_required
def update_group_settings(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or group["name"]).strip()
    radius = float(data.get("radiusMiles") or group["radius_miles"])
    price_min = int(data.get("priceMin") or group["price_min"])
    price_max = int(data.get("priceMax") or group["price_max"])
    cuisines = data.get("cuisines") or json.loads(group["cuisines_json"] or "[]")

    if radius <= 0:
        return jsonify({"error": "radiusMiles must be > 0"}), 400
    if price_min > price_max:
        return jsonify({"error": "priceMin cannot exceed priceMax"}), 400

    db = get_db()
    db.execute(
        """
        UPDATE groups
        SET name = ?, radius_miles = ?, price_min = ?, price_max = ?, cuisines_json = ?
        WHERE id = ?
        """,
        (name, radius, price_min, price_max, json.dumps(cuisines), group_id),
    )
    db.commit()
    updated = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    return jsonify({"group": group_to_json(updated)})


@app.post("/api/groups/<int:group_id>/members")
@auth_required
def add_group_member(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"error": "username is required"}), 400

    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404
    try:
        db.execute(
            """
            INSERT INTO group_members(group_id, user_id, added_by_user_id, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (group_id, user["id"], g.current_user["id"], now_iso()),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "User is already in the group"}), 409

    return jsonify({"ok": True})


@app.post("/api/groups/<int:group_id>/rounds/start")
@auth_required
def start_round(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    existing = get_active_round(group_id)
    if existing:
        return jsonify(
            {"round": {"id": existing["id"], "roundNumber": existing["round_number"]}, "deck": get_round_deck(existing["id"])}
        )

    data = request.get_json(silent=True) or {}
    latitude = float(data.get("latitude") or 29.6516)
    longitude = float(data.get("longitude") or -82.3248)
    settings = {
        "radius_miles": float(group["radius_miles"]),
        "price_min": int(group["price_min"]),
        "price_max": int(group["price_max"]),
        "cuisines": json.loads(group["cuisines_json"] or "[]"),
    }
    member_count = get_db().execute(
        "SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?", (group_id,)
    ).fetchone()["c"]
    wanted_count = max(1, min(MAX_DECK_SIZE, member_count * RESTAURANTS_PER_MEMBER))
    attempt_configs = [
        # 1) Strictly honor all user settings.
        {
            "radius_miles": settings["radius_miles"],
            "price_min": settings["price_min"],
            "price_max": settings["price_max"],
            "cuisines": settings["cuisines"],
            "reason": "strict_settings",
        },
        # 2) Keep radius/price, relax cuisine keyword matching.
        {
            "radius_miles": settings["radius_miles"],
            "price_min": settings["price_min"],
            "price_max": settings["price_max"],
            "cuisines": [],
            "reason": "relaxed_cuisine",
        },
        # 3) Expand price range fully.
        {
            "radius_miles": settings["radius_miles"],
            "price_min": 0,
            "price_max": 4,
            "cuisines": [],
            "reason": "relaxed_price_and_cuisine",
        },
        # 4) Expand radius to improve demo reliability.
        {
            "radius_miles": max(settings["radius_miles"], 25),
            "price_min": 0,
            "price_max": 4,
            "cuisines": [],
            "reason": "expanded_radius",
        },
    ]

    places: list[dict[str, Any]] = []
    attempt_errors: list[str] = []
    chosen_reason = "none"
    for cfg in attempt_configs:
        try:
            candidates = search_nearby_places(
                latitude,
                longitude,
                cfg["radius_miles"],
                cfg["price_min"],
                cfg["price_max"],
                cfg["cuisines"],
            )
            if candidates:
                places = candidates
                chosen_reason = cfg["reason"]
                break
        except Exception as exc:  # noqa: BLE001 - surface API issue to client
            attempt_errors.append(f'{cfg["reason"]}: {exc}')

    if not places:
        if attempt_errors:
            return (
                jsonify(
                    {
                        "error": "Failed to fetch nearby places",
                        "details": attempt_errors,
                    }
                ),
                502,
            )
        return (
            jsonify(
                {
                    "error": "No restaurants matched current settings",
                    "hint": "Try larger radius or broader price/cuisine filters",
                }
            ),
            400,
        )
    selected = places[:wanted_count]
    round_row = create_round(group_id, latitude, longitude, selected)
    return jsonify(
        {
            "round": {"id": round_row["id"], "roundNumber": round_row["round_number"]},
            "deck": get_round_deck(round_row["id"]),
            "selectionMode": chosen_reason,
        }
    )


@app.get("/api/groups/<int:group_id>/rounds/active")
@auth_required
def get_active_round_for_group(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    round_row = get_active_round(group_id)
    if not round_row:
        return jsonify({"round": None, "deck": []})
    return jsonify(
        {
            "round": {"id": round_row["id"], "roundNumber": round_row["round_number"]},
            "deck": get_round_deck(round_row["id"]),
        }
    )


@app.post("/api/rounds/<int:round_id>/votes")
@auth_required
def submit_vote(round_id: int):
    db = get_db()
    round_row = db.execute("SELECT * FROM rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        return jsonify({"error": "Round not found"}), 404
    if not ensure_group_member(round_row["group_id"]):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    place_id = data.get("placeId")
    liked = bool(data.get("liked"))
    if not place_id:
        return jsonify({"error": "placeId is required"}), 400

    exists = db.execute(
        "SELECT 1 FROM round_restaurants WHERE round_id = ? AND place_id = ?",
        (round_id, place_id),
    ).fetchone()
    if not exists:
        return jsonify({"error": "Restaurant not in this round deck"}), 400

    db.execute(
        """
        INSERT INTO votes(round_id, user_id, place_id, liked, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(round_id, user_id, place_id)
        DO UPDATE SET liked = excluded.liked, updated_at = excluded.updated_at
        """,
        (round_id, g.current_user["id"], place_id, 1 if liked else 0, now_iso()),
    )
    db.commit()
    return jsonify({"ok": True})


@app.post("/api/rounds/<int:round_id>/complete")
@auth_required
def complete_round(round_id: int):
    db = get_db()
    round_row = db.execute("SELECT * FROM rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        return jsonify({"error": "Round not found"}), 404
    if not ensure_group_member(round_row["group_id"]):
        return jsonify({"error": "Forbidden"}), 403
    db.execute(
        """
        UPDATE round_participants
        SET completed = 1, completed_at = ?
        WHERE round_id = ? AND user_id = ?
        """,
        (now_iso(), round_id, g.current_user["id"]),
    )
    db.commit()
    return jsonify(resolve_round_if_complete(round_id))


@app.get("/api/groups/<int:group_id>/result")
@auth_required
def get_group_result(group_id: int):
    group = ensure_group_member(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    db = get_db()
    resolved = db.execute(
        """
        SELECT *
        FROM rounds
        WHERE group_id = ? AND status = 'resolved' AND winner_place_id IS NOT NULL
        ORDER BY round_number DESC
        LIMIT 1
        """,
        (group_id,),
    ).fetchone()
    active = get_active_round(group_id)
    payload: dict[str, Any] = {"activeRound": None, "winner": None}
    if active:
        payload["activeRound"] = {"id": active["id"], "roundNumber": active["round_number"]}
    if resolved:
        winner = db.execute(
            """
            SELECT *
            FROM round_restaurants
            WHERE round_id = ? AND place_id = ?
            LIMIT 1
            """,
            (resolved["id"], resolved["winner_place_id"]),
        ).fetchone()
        if winner:
            payload["winner"] = {
                "placeId": winner["place_id"],
                "name": winner["name"],
                "address": winner["address"],
                "distanceMiles": winner["distance_miles"],
                "photoUrl": winner["photo_url"],
                "cuisine": winner["cuisine"],
                "priceLevel": winner["price_level"],
                "staleTie": bool(resolved["stale_tie"]),
            }
    return jsonify(payload)


@app.after_request
def apply_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return resp


@app.route("/api/<path:_path>", methods=["OPTIONS"])
def handle_options(_path: str):
    return ("", 204)


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
else:
    init_db()
