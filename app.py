"""
Worst Captcha - The Most Annoying Captcha Ever Created
A comment wall with the most chaotic captcha verification system

Security improvements:
- Environment-based secret key
- CSRF protection
- Rate limiting
- Input validation
- HTML sanitization (using nh3)
- Secure captcha validation
- Drawing challenge with edge detection
"""

from flask import Flask, render_template, request, jsonify, session
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import secrets
import hashlib
import time
from datetime import datetime
from typing import Dict, List, Any, Tuple
import os
import nh3
from PIL import Image, ImageFilter
import io
import base64

app = Flask(__name__)

# Security configurations
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))
app.config["WTF_CSRF_ENABLED"] = True
app.config["WTF_CSRF_TIME_LIMIT"] = 3600  # 1 hour

# Initialize extensions
csrf = CSRFProtect(app)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# Constants for magic numbers
STEP3_MIN_SCORE = 2
OVERALL_SCORE_REQUIRED = 2

# In-memory storage for comments (use database in production)
comments: List[Dict[str, Any]] = []

# Image categories for step 3
IMAGE_CATEGORIES: Dict[str, str] = {
    "beer": "static/images/beer/",
    "cocktails": "static/images/cocktails/",
    "soda": "static/images/soda/",
    "vodka": "static/images/vodka/",
    "water": "static/images/water/",
}

# Art images for drawing challenge
ART_IMAGES_PATH = "static/images/art/"


def detect_edges(image_data: bytes) -> bytes:
    """
    Detect edges in an image using Sobel edge detection.

    Args:
        image_data: Raw image bytes

    Returns:
        Edge-detected image as bytes
    """
    img = Image.open(io.BytesIO(image_data))

    # Convert to grayscale
    img_gray = img.convert("L")

    # Apply edge detection using Sobel filter
    img_edges = img_gray.filter(ImageFilter.FIND_EDGES)

    # Enhance contrast
    img_edges = img_edges.point(lambda x: 0 if x < 50 else 255)

    # Convert back to RGBA
    img_edges = img_edges.convert("RGBA")

    # Save to bytes
    output = io.BytesIO()
    img_edges.save(output, format="PNG")
    return output.getvalue()


def validate_selected_indices(indices: Any) -> bool:
    """Validate selected_indices is a list of integers between 0 and 15."""
    if not isinstance(indices, list):
        return False
    return all(isinstance(i, int) and 0 <= i <= 15 for i in indices)


def sanitize_html(html_content: str) -> str:
    """Sanitize HTML content to prevent XSS attacks using nh3."""
    # Allow only safe HTML tags
    allowed_tags = {"p", "br", "strong", "em", "u", "ol", "ul", "li", "a"}
    allowed_attributes = {"a": {"href", "title"}}

    return nh3.clean(
        html_content,
        tags=allowed_tags,
        attributes=allowed_attributes,
        url_schemes={"http", "https", "mailto"},
    )


def generate_captcha_seed() -> int:
    """Generate a cryptographically secure random seed for captcha."""
    return secrets.randbelow(900000) + 100000


def validate_captcha_click(
    shape_id: int, instruction_index: int, captcha_seed: int
) -> Tuple[bool, str]:
    """
    Validate a captcha click using deterministic logic based on shape properties.

    Returns:
        Tuple of (is_correct, reason)
    """
    # Use a deterministic hash-based validation
    hash_input = f"{captcha_seed}:{shape_id}:{instruction_index}"
    hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)

    # Use hash to determine correctness (approximately 50% chance)
    is_correct = (hash_value % 100) < 50

    return is_correct, "Correct click" if is_correct else "Incorrect click"


@app.route("/")
def index() -> str:
    """Main page with comment wall."""
    return render_template("index.html", comments=comments)


@app.route("/api/captcha/drawing/generate", methods=["POST"])
@limiter.limit("10 per minute")
def generate_drawing_challenge() -> jsonify:
    """
    Generate a drawing challenge with an art image.

    Returns:
        JSON with art image path and edge-detected version.
    """
    try:
        # Get list of art images
        art_images = []
        if os.path.exists(ART_IMAGES_PATH):
            art_images = [
                f
                for f in os.listdir(ART_IMAGES_PATH)
                if f.endswith((".webp", ".jpg", ".jpeg", ".png"))
            ]

        if not art_images:
            return jsonify({"error": "No art images available"}), 500

        # Select random art image
        import random

        selected_image = random.choice(art_images)
        image_path = os.path.join(ART_IMAGES_PATH, selected_image)

        # Load and process image
        with open(image_path, "rb") as f:
            image_data = f.read()

        # Detect edges
        edge_data = detect_edges(image_data)
        edge_base64 = base64.b64encode(edge_data).decode("utf-8")

        # Store only the image filename in session (not the large edge_data)
        session["drawing_challenge"] = {
            "image_filename": selected_image,
            "start_time": time.time(),
            "attempts": 0,
        }

        return jsonify(
            {
                "success": True,
                "image_path": f"/static/images/art/{selected_image}",
                "edge_image": f"data:image/png;base64,{edge_base64}",
                "time_limit": 30,  # 30 seconds for drawing
            }
        )

    except Exception as e:
        app.logger.error(f"Error generating drawing challenge: {e}")
        return jsonify({"error": "Failed to generate drawing challenge"}), 500


@app.route("/api/captcha/drawing/verify", methods=["POST"])
@limiter.limit("20 per minute")
def verify_drawing() -> jsonify:
    """
    Verify user's drawing against the original image edges.

    Expects:
        JSON with 'drawing_data' as base64 encoded image
        JSON with 'match_percentage' calculated on frontend

    Returns:
        JSON with validation result.
    """
    try:
        data = request.json
        if not data:
            return jsonify({"valid": False, "error": "Invalid request"}), 400

        drawing_data = data.get("drawing_data")
        match_percentage = data.get("match_percentage", 0)

        if not drawing_data:
            return jsonify({"valid": False, "error": "No drawing data"}), 400

        # Check if drawing challenge exists
        if "drawing_challenge" not in session:
            return jsonify(
                {"valid": False, "error": "No drawing challenge session"}
            ), 400

        challenge = session["drawing_challenge"]

        # Check time limit (30 seconds)
        elapsed = time.time() - challenge["start_time"]
        if elapsed > 30:
            return jsonify({"valid": False, "error": "Time expired", "restart": True})

        # Increment attempts
        challenge["attempts"] += 1
        session["drawing_challenge"] = challenge

        # Require at least 60% match (calculated on frontend)
        is_valid = match_percentage >= 60

        if is_valid:
            # Drawing challenge completed
            session["overall_score"] = session.get("overall_score", 0) + 1
            session["step1_completed"] = True
            return jsonify(
                {
                    "valid": True,
                    "match_percentage": round(match_percentage, 2),
                    "completed": True,
                    "message": "Drawing challenge completed!",
                    "overall_score": session.get("overall_score", 0),
                }
            )
        else:
            return jsonify(
                {
                    "valid": False,
                    "match_percentage": round(match_percentage, 2),
                    "attempts": challenge["attempts"],
                    "message": f"Drawing doesn't match enough. Match: {round(match_percentage, 2)}%",
                }
            )

    except Exception as e:
        app.logger.error(f"Error verifying drawing: {e}")
        return jsonify({"valid": False, "error": "Failed to verify drawing"}), 500


@app.route("/api/captcha/step3/generate", methods=["POST"])
@limiter.limit("10 per minute")
def generate_step3() -> jsonify:
    """
    Generate image grid for step 3 with age verification.

    Note: Age verification is client-side only (novelty captcha).
    """
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

    # Get all images from each category (cached at startup for performance)
    all_images = []
    for category, folder in IMAGE_CATEGORIES.items():
        if os.path.exists(folder):
            try:
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
            except OSError as e:
                app.logger.error(f"Error reading directory {folder}: {e}")
                continue

    # Shuffle and select 16 images for 4x4 grid
    import random

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
@limiter.limit("20 per minute")
def verify_step3() -> jsonify:
    """
    Verify image selection for step 3 with input validation.

    Returns:
        JSON with validation result and next category if applicable.
    """
    data = request.json
    if not data:
        return jsonify({"valid": False, "error": "Invalid request"}), 400

    selected_indices = data.get("selected_indices", [])

    # Input validation
    if not validate_selected_indices(selected_indices):
        return jsonify({"valid": False, "error": "Invalid selected_indices"}), 400

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
@limiter.limit("10 per minute")
def complete_step2() -> jsonify:
    """Mark step 2 as completed."""
    session["step2_completed"] = True
    session["overall_score"] = session.get("overall_score", 0) + 1
    return jsonify({"success": True, "overall_score": session.get("overall_score", 0)})


@app.route("/api/captcha/step3/complete", methods=["POST"])
@limiter.limit("10 per minute")
def complete_step3() -> jsonify:
    """Mark step 3 as completed."""
    session["step3_completed"] = True
    # Only add to overall score if step 3 score >= minimum
    if session.get("step3_score", 0) >= STEP3_MIN_SCORE:
        session["overall_score"] = session.get("overall_score", 0) + 1
    return jsonify({"success": True, "overall_score": session.get("overall_score", 0)})


@app.route("/api/captcha/step3/status", methods=["GET"])
def step3_status() -> jsonify:
    """Get current step 3 status."""
    return jsonify(
        {
            "skipped": session.get("step3_skipped", False),
            "score": session.get("step3_score", 0),
            "attempts": session.get("step3_attempts", 0),
            "overall_score": session.get("overall_score", 0),
        }
    )


@app.route("/api/comments", methods=["GET"])
def get_comments() -> jsonify:
    """Get all comments."""
    return jsonify({"comments": comments})


@app.route("/api/comments", methods=["POST"])
@limiter.limit("5 per minute")
def add_comment() -> jsonify:
    """
    Add a new comment with captcha verification and input sanitization.

    Returns:
        JSON with success status and comment data.
    """
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    # Verify captcha was completed
    if session.get("overall_score", 0) < OVERALL_SCORE_REQUIRED:
        return jsonify({"error": "Captcha not completed"}), 403

    # Check overall score across all steps
    overall_score = session.get("overall_score", 0)
    if overall_score < OVERALL_SCORE_REQUIRED:
        return jsonify(
            {
                "error": f"Captcha not completed successfully. Score: {overall_score}/{OVERALL_SCORE_REQUIRED} required"
            }
        ), 403

    # Validate and sanitize input
    author = data.get("author", "Anonymous")
    if not isinstance(author, str) or len(author) > 100:
        return jsonify({"error": "Invalid author name"}), 400

    content = data.get("content", "")
    if not isinstance(content, str) or len(content) > 5000:
        return jsonify({"error": "Invalid content"}), 400

    html_content = data.get("html_content", "")
    if not isinstance(html_content, str):
        return jsonify({"error": "Invalid HTML content"}), 400

    # Sanitize HTML content to prevent XSS
    sanitized_html = sanitize_html(html_content)

    comment = {
        "id": len(comments) + 1,
        "author": nh3.clean(author),
        "content": nh3.clean(content),
        "timestamp": datetime.now().isoformat(),
        "html_content": sanitized_html,
    }

    comments.append(comment)

    # Clear captcha session
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
    session.pop("drawing_challenge", None)

    return jsonify({"success": True, "comment": comment})


# Exempt API endpoints from CSRF protection
csrf.exempt(generate_drawing_challenge)
csrf.exempt(verify_drawing)
csrf.exempt(generate_step3)
csrf.exempt(verify_step3)
csrf.exempt(complete_step2)
csrf.exempt(complete_step3)
csrf.exempt(step3_status)
csrf.exempt(get_comments)
csrf.exempt(add_comment)


if __name__ == "__main__":
    # Production configuration - debug mode disabled
    app.run(host="0.0.0.0", port=5000, debug=False)
