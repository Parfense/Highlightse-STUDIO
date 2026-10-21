import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for

app = Flask(__name__)
app.secret_key = "webgl_emerald_word_studio_2026_key"

DB_FILE = os.path.join(os.path.dirname(__file__), "studio_database.json")

TEACHER_ACCOUNTS = [
    {"username": f"teacher{i}", "first_name": name.split()[0], "last_name": name.split()[1], "dob": "1985-04-10"}
    for i, name in enumerate([
        "Александр Волков", "Елена Соколова", "Михаил Морозов", "Ольга Новикова", "Дмитрий Лебедев",
        "Анна Козлова", "Сергей Павлов", "Наталья Семенова", "Андрей Голубев", "Татьяна Виноградова"
    ], 1)
]


def init_db():
    if not os.path.exists(DB_FILE):
        seed = {
            "users": TEACHER_ACCOUNTS + [
                {"username": "alex_student", "first_name": "Алексей", "last_name": "Вернадский", "dob": "2007-11-23"}
            ],
            "documents": [
                {
                    "id": 101,
                    "owner": "alex_student",
                    "author": "Пышняк Парфён",
                    "title": "Архитектура бионических городов 2030",
                    "font": "Montserrat",
                    "updated": "Сегодня",
                    "content": (
                        "<h1 style='text-align: center;'><span style='font-size: 32px;'><b>Экологический урбанизм и 3D-среда</b></span></h1>"
                        "<p style='text-align: justify;'>В этом редакторе работает <span class='hl-marker hl-yellow'>настоящий 3D-движок Three.js (WebGL)</span> на заднем фоне, "
                        "а сам лист поддерживает все функции современного Word: выравнивание по ширине, выбор цвета маркера, экспорт в <b>.DOC</b> и зум страницы.</p>"
                        "<div class='task-row done' contenteditable='false'>"
                        "<button class='task-check' onclick='toggleTask(this)'><svg viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12'></polyline></svg></button>"
                        "<span class='task-text' contenteditable='true'>Подключить Three.js WebGL-сцену с изумрудными 3D-кристаллами</span></div>"
                        "<div class='task-row' contenteditable='false'>"
                        "<button class='task-check' onclick='toggleTask(this)'><svg viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12'></polyline></svg></button>"
                        "<span class='task-text' contenteditable='true'>Проверить шрифты Helvetica, Futura, Roboto, Montserrat, Garamond, Times New Roman</span></div>"
                    )
                }
            ]
        }
        write_db(seed)
        return seed
    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route("/")
def index():
    if "user" in session:
        return redirect(url_for("main"))
    return render_template("index.html", teachers=TEACHER_ACCOUNTS)


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    db = init_db()
    user = next((u for u in db["users"] if u["username"].lower() == username.lower()), None)
    if not user:
        return jsonify({"ok": False, "error": "Логин не найден! Выберите из списка или зарегистрируйтесь."}), 404
    session["user"] = user
    return jsonify({"ok": True, "redirect": url_for("main")})


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    fn = (data.get("first_name") or "").strip()
    ln = (data.get("last_name") or "").strip()
    dob = (data.get("dob") or "").strip()
    un = (data.get("username") or "").strip()

    if not all([fn, ln, dob, un]):
        return jsonify({"ok": False, "error": "Заполните Имя, Фамилию, Дату рождения и Логин!"}), 400

    db = init_db()
    if any(u["username"].lower() == un.lower() for u in db["users"]):
        return jsonify({"ok": False, "error": "Такой логин уже существует!"}), 400

    new_user = {"username": un, "first_name": fn, "last_name": ln, "dob": dob}
    db["users"].append(new_user)

    new_id = max([d["id"] for d in db["documents"]] or [100]) + 1
    db["documents"].append({
        "id": new_id,
        "owner": un,
        "author": f"{fn} {ln}",
        "title": f"Документ — {fn} {ln}",
        "font": "Montserrat",
        "updated": datetime.now().strftime("%H:%M"),
        "content": (
            f"<h2>Привет, {fn}! Это твой персональный Word-процессор.</h2>"
            "<p>Выделяй текст и пробуй <span class='hl-marker hl-yellow'>плавный маркер</span>, меняй шрифты и масштаб листа внизу экрана.</p>"
        )
    })
    write_db(db)
    session["user"] = new_user
    return jsonify({"ok": True, "redirect": url_for("main")})


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/main")
def main():
    if "user" not in session:
        return redirect(url_for("index"))
    user = session["user"]
    db = init_db()
    docs = db["documents"]
    if not docs:
        docs = [{
            "id": 1,
            "owner": user["username"],
            "author": f"{user['first_name']} {user['last_name']}",
            "title": "Новый документ",
            "font": "Montserrat",
            "updated": "Сейчас",
            "content": "<p>Начните печатать...</p>"
        }]
        db["documents"] = docs
        write_db(db)
    return render_template("main.html", user=user, documents=docs)


@app.route("/api/docs/<int:doc_id>", methods=["GET"])
def get_doc(doc_id):
    db = init_db()
    doc = next((d for d in db["documents"] if d["id"] == doc_id), None)
    return jsonify(doc) if doc else (jsonify({"error": "Not found"}), 404)


@app.route("/api/docs/save", methods=["POST"])
def save_doc():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    user = session["user"]
    data = request.get_json()
    doc_id = int(data.get("id", 0))
    title = (data.get("title") or "Без названия").strip()
    content = data.get("content") or ""
    font = data.get("font") or "Montserrat"

    db = init_db()
    stamp = datetime.now().strftime("%H:%M:%S")

    for d in db["documents"]:
        if d["id"] == doc_id:
            d["title"] = title
            d["content"] = content
            d["font"] = font
            d["updated"] = stamp
            write_db(db)
            return jsonify({"ok": True, "id": doc_id, "time": stamp, "doc": d})

    new_id = max([d["id"] for d in db["documents"]] or [100]) + 1
    new_doc = {
        "id": new_id,
        "owner": user["username"],
        "author": f"{user['first_name']} {user['last_name']}",
        "title": title,
        "font": font,
        "updated": stamp,
        "content": content
    }
    db["documents"].insert(0, new_doc)
    write_db(db)
    return jsonify({"ok": True, "id": new_id, "time": stamp, "doc": new_doc})


@app.route("/api/docs/delete/<int:doc_id>", methods=["POST"])
def delete_doc(doc_id):
    db = init_db()
    if len(db["documents"]) <= 1:
        return jsonify({"ok": False, "error": "Нельзя удалить последний документ в библиотеке!"}), 400
    db["documents"] = [d for d in db["documents"] if d["id"] != doc_id]
    write_db(db)
    return jsonify({"ok": True, "next_id": db["documents"][0]["id"]})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
