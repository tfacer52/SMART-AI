from flask import Flask, render_template, request, jsonify, redirect, session, url_for
import sqlite3
from datetime import datetime
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import os

app = Flask(__name__)
app.secret_key = "super-secret-key-123"

DB = "database.db"

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            attempts INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            last_activity TEXT
        )
        """)
        # Таблица для помощи с мышью
        db.execute("""
        CREATE TABLE IF NOT EXISTS mouse_help_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            difficulty_level TEXT
        )
        """)
        db.commit()

init_db()

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

class User(UserMixin):
    def __init__(self, id, username):
        self.id = id
        self.username = username

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user:
        return User(user['id'], user['username'])
    return None

# --- КОНТЕКСТНЫЙ ПРОЦЕССОР ---
# Это позволяет НЕ писать dark_mode в каждом render_template
@app.context_processor
def inject_settings():
    return dict(
        dark_mode=session.get("dark_mode", False),
        large_mode=session.get("large_mode", False)
    )

# --- МАРШРУТЫ ---

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/save", methods=["POST"])
def save():
    # Если пользователь не вошел, используем ID 0 (гостевой режим)
    uid = current_user.id if current_user.is_authenticated else 0
    data = request.json
    now = datetime.now().isoformat()
    success_inc = 1 if data.get('success') else 0

    with get_db() as db:
        db.execute("""
            INSERT INTO progress (user_id, attempts, success_count, last_activity)
            VALUES (?, 1, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                attempts = attempts + 1,
                success_count = success_count + ?,
                last_activity = ?
        """, (uid, success_inc, now, success_inc, now))
        db.commit()
    return jsonify({"status": "saved"})

@app.route("/progress")
def progress():
    uid = current_user.id if current_user.is_authenticated else 0
    with get_db() as db:
        row = db.execute("SELECT * FROM progress WHERE user_id = ?", (uid,)).fetchone()

    attempts = row['attempts'] if row else 0
    success = row['success_count'] if row else 0
    
    return render_template("progress.html", attempts=attempts, success=success)

@app.route("/mouse_difficulty", methods=["GET", "POST"])
def mouse_difficulty():
    if request.method == "POST":
        name = request.form.get("name")
        difficulty = request.form.get("difficulty")
        with get_db() as db:
            db.execute("INSERT INTO mouse_help_requests (name, difficulty_level) VALUES (?, ?)", 
                       (name, difficulty))
            db.commit()
        return redirect(url_for("mouse_difficulty"))
    return render_template("mouse_difficulty.html")

@app.route("/settings", methods=["GET", "POST"])
def settings():
    if request.method == "POST":
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        # Сохраняем настройки в сессию
        session["large_mode"] = data.get("large_mode") in [True, 'true', 'on']
        session["dark_mode"] = data.get("dark_mode") in [True, 'true', 'on']
        
        if request.is_json:
            return jsonify({"status": "updated"})
        return redirect(url_for("index"))

    return render_template("settings.html")

# Игровые маршруты (теперь без лишних переменных)
@app.route("/game")
def game_click(): return render_template("game.html")

@app.route("/games")
def games_click(): return render_template("games.html")

@app.route("/math")
def math_click(): return render_template("math.html")

@app.route("/selection")
def selection_click(): return render_template("selection.html")

@app.route("/audio/<path:filename>")
def serve_audio(filename):
    from flask import send_from_directory
    return send_from_directory("static/audio", filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))