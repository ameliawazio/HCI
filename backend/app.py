from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

VALID_USERS = {f"gator{i}": "password" for i in range(1, 6)}


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
def group_settings(group_id):
    return render_template("group-settings.html", group_id=group_id)


@app.get("/group/<int:group_id>/swipe")
def swipe(group_id):
    return render_template("swipe.html", group_id=group_id)


@app.get("/group/<int:group_id>/results")
def results(group_id):
    return render_template("results.html", group_id=group_id)


@app.get("/group/<int:group_id>/map")
def map_page(group_id):
    return render_template("map.html", group_id=group_id)


@app.get("/restaurant/<int:restaurant_id>")
def restaurant_detail(restaurant_id):
    return render_template("restaurant-detail.html", restaurant_id=restaurant_id)


if __name__ == "__main__":
    app.run(debug=True)
