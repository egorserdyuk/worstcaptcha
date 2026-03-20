"""
Worst Captcha - The Most Annoying Captcha Ever Created
A comment wall with the most chaotic captcha verification system
"""

from flask import Flask, render_template, request, jsonify, session
import random
import time
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = "worst-captcha-secret-key-2024"

# In-memory storage for comments (use database in production)
comments = []

# Image categories for step 3
IMAGE_CATEGORIES = {
    "beer": "static/images/beer/",
    "cocktails": "static/images/cocktails/",
    "soda": "static/images/soda/",
    "vodka": "static/images/vodka/",
    "water": "static/images/water/",
}

# Captcha instructions pool
CAPTCHA_INSTRUCTIONS = [
    "Click ALL green shapes that are moving LEFT",
    "Now click only those that are NOT squares (even if they look like squares)",
    "Ignore everything red, EXCEPT those reds that are in the top row",
    "Click the shapes that are currently changing color, but only if they are circular… no, wait, now only if they are NOT circular",
    "Urgently click everything left over from the previous instruction before it disappears",
    "If it's an even second - click triangles. If odd - pretend they don't exist",
    "Click shapes that are touching the border of the grid",
    "Only click shapes that have appeared in the last 0.5 seconds",
    "Click all shapes that are NOT moving",
    "Click shapes that are the same color as the instruction text",
    "Ignore all shapes except those that are blinking",
    "Click shapes that are in the same row as a circle",
    "Click all shapes that are moving faster than average",
    "Only click shapes that are changing size",
    "Click shapes that are in the exact center of the grid",
    "Ignore everything except shapes that are rotating",
    "Click all shapes that are NOT in the top half",
    "Click shapes that have been clicked before (if you can remember)",
    "Only click shapes that are moving in a circle pattern",
    "Click all shapes that are the same shape as the one in position (3,3)",
]


@app.route("/")
def index():
    """Main page with comment wall"""
    return render_template("index.html", comments=comments)


@app.route("/api/captcha/generate", methods=["POST"])
def generate_captcha():
    """Generate a new captcha session with seed and rules"""
    data = request.json or {}
    seed = data.get("seed", random.randint(100000, 999999))

    # Generate deterministic rules based on seed
    random.seed(seed)

    # Select 6 random instructions
    selected_instructions = random.sample(CAPTCHA_INSTRUCTIONS, 6)

    # Generate shape configurations for 6x6 grid
    shapes = []
    for i in range(36):
        shape_type = random.choice(["square", "circle", "triangle", "optical"])
        color = random.choice(
            [
                "#FF6B6B",
                "#4ECDC4",
                "#45B7D1",
                "#96CEB4",
                "#FFEAA7",
                "#DDA0DD",
                "#98D8C8",
                "#F7DC6F",
            ]
        )
        shapes.append(
            {
                "id": i,
                "type": shape_type,
                "color": color,
                "x": random.uniform(-10, 10),
                "y": random.uniform(-10, 10),
                "speed_x": random.uniform(-1, 1),
                "speed_y": random.uniform(-1, 1),
                "rotation": random.uniform(0, 360),
                "scale": random.uniform(0.8, 1.2),
                "opacity": random.uniform(0.7, 1.0),
            }
        )

    # Store session data
    session["captcha_seed"] = seed
    session["captcha_start"] = time.time()
    session["captcha_score"] = 0
    session["captcha_clicks"] = 0
    session["wrong_clicks"] = 0
    session["last_click_time"] = 0
    session["white_text_used"] = False
    session["overall_score"] = 0  # Track score across all steps
    session["step1_completed"] = False
    session["step2_completed"] = False
    session["step3_completed"] = False

    return jsonify(
        {
            "seed": seed,
            "instructions": selected_instructions,
            "shapes": shapes,
            "time_limit": 12,
            "target_score": 25,
            "instruction_interval": 1.8,
        }
    )


@app.route("/api/captcha/verify", methods=["POST"])
def verify_captcha_click():
    """Verify a captcha click"""
    data = request.json
    shape_id = data.get("shape_id")
    instruction_index = data.get("instruction_index")
    # click_time = data.get("click_time")  # Reserved for future use

    # Check if captcha session exists
    if "captcha_seed" not in session:
        return jsonify({"valid": False, "error": "No captcha session"}), 400

    # Check time limit
    elapsed = time.time() - session["captcha_start"]
    if elapsed > 12:
        return jsonify({"valid": False, "error": "Time expired", "restart": True})

    # Check for too-fast clicking (bot detection)
    current_time = time.time()
    if session["last_click_time"] > 0:
        time_between_clicks = current_time - session["last_click_time"]
        if time_between_clicks < 0.15:  # Less than 150ms between clicks = bot
            return jsonify(
                {
                    "valid": False,
                    "error": "YOU ARE BOT!",
                    "restart": True,
                    "bot_detected": True,
                }
            )

    session["last_click_time"] = current_time

    # Determine if click is correct based on instruction
    # This is simplified - real logic would be more complex
    random.seed(session["captcha_seed"] + instruction_index + shape_id)
    is_correct = random.random() > 0.5  # Simplified validation

    if is_correct:
        session["captcha_score"] += 1
        session["captcha_clicks"] += 1

        if session["captcha_score"] >= 25:
            # Step 1 completed successfully - add to overall score
            session["step1_completed"] = True
            session["overall_score"] = session.get("overall_score", 0) + 1
            return jsonify(
                {
                    "valid": True,
                    "score": session["captcha_score"],
                    "completed": True,
                    "message": "Captcha completed!",
                    "overall_score": session["overall_score"],
                }
            )
    else:
        session["wrong_clicks"] += 1
        session["captcha_score"] = max(0, session["captcha_score"] - 3)
        session["captcha_clicks"] += 1

        return jsonify(
            {
                "valid": False,
                "score": session["captcha_score"],
                "wrong_clicks": session["wrong_clicks"],
                "shake": True,
                "bot_sound": True,
            }
        )

    return jsonify(
        {
            "valid": is_correct,
            "score": session["captcha_score"],
            "clicks": session["captcha_clicks"],
        }
    )


@app.route("/api/captcha/status", methods=["GET"])
def captcha_status():
    """Get current captcha status"""
    if "captcha_seed" not in session:
        return jsonify({"active": False})

    elapsed = time.time() - session["captcha_start"]

    return jsonify(
        {
            "active": True,
            "score": session["captcha_score"],
            "clicks": session["captcha_clicks"],
            "wrong_clicks": session["wrong_clicks"],
            "elapsed": elapsed,
            "remaining": max(0, 12 - elapsed),
        }
    )


@app.route("/api/captcha/step3/generate", methods=["POST"])
def generate_step3():
    """Generate image grid for step 3"""
    data = request.json or {}
    is_18_plus = data.get("is_18_plus", False)

    if not is_18_plus:
        # User is under 18, skip this step
        session["step3_skipped"] = True
        session["step3_score"] = 0
        return jsonify(
            {"skipped": True, "message": "Step 3 skipped for users under 18"}
        )

    # User is 18+, generate image grid
    session["step3_skipped"] = False
    session["step3_score"] = 0
    session["step3_attempts"] = 0

    # Get all images from each category
    all_images = []
    for category, folder in IMAGE_CATEGORIES.items():
        if os.path.exists(folder):
            images = [
                f
                for f in os.listdir(folder)
                if f.endswith((".webp", ".jpg", ".jpeg", ".png"))
            ]
            for img in images:
                all_images.append(
                    {
                        "category": category,
                        "filename": img,
                        "path": f"/static/images/{category}/{img}",
                    }
                )

    # Shuffle and select 16 images for 4x4 grid
    random.shuffle(all_images)
    selected_images = all_images[:16]

    # Store in session for verification
    session["step3_images"] = selected_images

    # Select first category to find
    categories = list(IMAGE_CATEGORIES.keys())
    random.shuffle(categories)
    session["step3_current_category"] = categories[0]
    session["step3_categories_to_find"] = categories
    session["step3_category_index"] = 0

    return jsonify(
        {
            "skipped": False,
            "images": selected_images,
            "current_category": categories[0],
            "total_categories": len(categories),
        }
    )


@app.route("/api/captcha/step3/verify", methods=["POST"])
def verify_step3():
    """Verify image selection for step 3"""
    data = request.json
    selected_indices = data.get("selected_indices", [])

    if session.get("step3_skipped", False):
        return jsonify(
            {"valid": True, "skipped": True, "message": "Step 3 was skipped"}
        )

    # Get current category and images
    current_category = session.get("step3_current_category")
    images = session.get("step3_images", [])

    if not current_category or not images:
        return jsonify({"valid": False, "error": "No step 3 session"}), 400

    # Find all indices that belong to the current category
    correct_indices = [
        i for i, img in enumerate(images) if img["category"] == current_category
    ]

    # Check if user selected all correct images and no wrong ones
    selected_set = set(selected_indices)
    correct_set = set(correct_indices)

    is_correct = selected_set == correct_set

    if is_correct:
        session["step3_score"] = session.get("step3_score", 0) + 1

    session["step3_attempts"] = session.get("step3_attempts", 0) + 1

    # Move to next category
    session["step3_category_index"] = session.get("step3_category_index", 0) + 1
    category_index = session["step3_category_index"]
    categories = session.get("step3_categories_to_find", [])

    if category_index < len(categories):
        # More categories to find
        session["step3_current_category"] = categories[category_index]
        return jsonify(
            {
                "valid": is_correct,
                "correct_indices": correct_indices,
                "next_category": categories[category_index],
                "completed": False,
                "score": session["step3_score"],
            }
        )
    else:
        # All categories completed
        return jsonify(
            {
                "valid": is_correct,
                "correct_indices": correct_indices,
                "completed": True,
                "score": session["step3_score"],
                "total_categories": len(categories),
            }
        )


@app.route("/api/captcha/step2/complete", methods=["POST"])
def complete_step2():
    """Mark step 2 as completed"""
    session["step2_completed"] = True
    session["overall_score"] = session.get("overall_score", 0) + 1
    return jsonify({"success": True, "overall_score": session.get("overall_score", 0)})


@app.route("/api/captcha/step3/complete", methods=["POST"])
def complete_step3():
    """Mark step 3 as completed"""
    session["step3_completed"] = True
    # Only add to overall score if step 3 score >= 2
    if session.get("step3_score", 0) >= 2:
        session["overall_score"] = session.get("overall_score", 0) + 1
    return jsonify({"success": True, "overall_score": session.get("overall_score", 0)})


@app.route("/api/captcha/step3/status", methods=["GET"])
def step3_status():
    """Get current step 3 status"""
    return jsonify(
        {
            "skipped": session.get("step3_skipped", False),
            "score": session.get("step3_score", 0),
            "attempts": session.get("step3_attempts", 0),
            "overall_score": session.get("overall_score", 0),
        }
    )


@app.route("/api/comments", methods=["GET"])
def get_comments():
    """Get all comments"""
    return jsonify({"comments": comments})


@app.route("/api/comments", methods=["POST"])
def add_comment():
    """Add a new comment (requires captcha verification)"""
    data = request.json

    # Verify captcha was completed
    if "captcha_seed" not in session or session.get("captcha_score", 0) < 25:
        return jsonify({"error": "Captcha not completed"}), 403

    # Check overall score across all steps (needs to be >= 2)
    overall_score = session.get("overall_score", 0)
    if overall_score < 2:
        return jsonify(
            {
                "error": f"Captcha not completed successfully. Score: {overall_score}/2 required"
            }
        ), 403

    comment = {
        "id": len(comments) + 1,
        "author": data.get("author", "Anonymous"),
        "content": data.get("content", ""),
        "timestamp": datetime.now().isoformat(),
        "html_content": data.get("html_content", ""),
    }

    comments.append(comment)

    # Clear captcha session
    session.pop("captcha_seed", None)
    session.pop("captcha_score", None)
    session.pop("overall_score", None)
    session.pop("step1_completed", None)
    session.pop("step2_completed", None)
    session.pop("step3_completed", None)
    session.pop("step3_skipped", None)
    session.pop("step3_score", None)
    session.pop("step3_attempts", None)
    session.pop("step3_images", None)
    session.pop("step3_current_category", None)
    session.pop("step3_categories_to_find", None)
    session.pop("step3_category_index", None)

    return jsonify({"success": True, "comment": comment})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
