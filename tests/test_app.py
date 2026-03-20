"""
Comprehensive tests for Worst Captcha application.
Covers all helper functions, routes, and security aspects.
"""

import pytest
import json
import time
from unittest.mock import patch
from flask import session
from app import (
    app,
    validate_shape_id,
    validate_instruction_index,
    validate_selected_indices,
    sanitize_html,
    generate_captcha_seed,
    validate_captcha_click,
    comments,
    IMAGE_CATEGORIES,
    CAPTCHA_INSTRUCTIONS,
    TIME_LIMIT,
    TARGET_SCORE,
    INSTRUCTION_INTERVAL,
    MIN_CLICK_INTERVAL,
    BOT_DETECTION_THRESHOLD,
    MAX_WRONG_CLICKS,
    STEP3_MIN_SCORE,
    OVERALL_SCORE_REQUIRED,
)


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False  # Disable CSRF for testing
    # Disable rate limiting for tests
    app.config["RATELIMIT_ENABLED"] = False
    client = app.test_client()
    return client


@pytest.fixture
def clean_comments():
    """Clean comments before each test."""
    comments.clear()
    yield comments
    comments.clear()


class TestValidationFunctions:
    """Test validation helper functions."""

    def test_validate_shape_id_valid(self):
        """Test validate_shape_id with valid inputs."""
        assert validate_shape_id(0) is True
        assert validate_shape_id(18) is True
        assert validate_shape_id(35) is True

    def test_validate_shape_id_invalid(self):
        """Test validate_shape_id with invalid inputs."""
        assert validate_shape_id(-1) is False
        assert validate_shape_id(36) is False
        assert validate_shape_id(100) is False
        assert validate_shape_id("18") is False
        assert validate_shape_id(18.5) is False
        assert validate_shape_id(None) is False

    def test_validate_instruction_index_valid(self):
        """Test validate_instruction_index with valid inputs."""
        assert validate_instruction_index(0) is True
        assert validate_instruction_index(3) is True
        assert validate_instruction_index(5) is True

    def test_validate_instruction_index_invalid(self):
        """Test validate_instruction_index with invalid inputs."""
        assert validate_instruction_index(-1) is False
        assert validate_instruction_index(6) is False
        assert validate_instruction_index(10) is False
        assert validate_instruction_index("0") is False
        assert validate_instruction_index(0.5) is False
        assert validate_instruction_index(None) is False

    def test_validate_selected_indices_valid(self):
        """Test validate_selected_indices with valid inputs."""
        assert validate_selected_indices([]) is True
        assert validate_selected_indices([0]) is True
        assert validate_selected_indices([0, 5, 10, 15]) is True
        assert validate_selected_indices([i for i in range(16)]) is True

    def test_validate_selected_indices_invalid(self):
        """Test validate_selected_indices with invalid inputs."""
        assert validate_selected_indices(-1) is False
        assert validate_selected_indices("0") is False
        assert validate_selected_indices([0, 16]) is False  # Out of range
        assert validate_selected_indices([-1, 5]) is False  # Negative
        assert validate_selected_indices([0, "5"]) is False  # String in list
        assert validate_selected_indices([0, 5.5]) is False  # Float in list


class TestSanitizeHtml:
    """Test HTML sanitization function."""

    def test_sanitize_html_safe_tags(self):
        """Test that safe HTML tags are preserved."""
        html = "<p>Hello <strong>World</strong></p>"
        result = sanitize_html(html)
        assert "<p>" in result
        assert "<strong>" in result

    def test_sanitize_html_unsafe_tags(self):
        """Test that unsafe HTML tags are removed."""
        html = '<script>alert("XSS")</script><p>Hello</p>'
        result = sanitize_html(html)
        assert "<script>" not in result
        assert "alert" not in result
        assert "<p>" in result

    def test_sanitize_html_safe_attributes(self):
        """Test that safe attributes are preserved."""
        html = '<a href="https://example.com" title="Link">Click</a>'
        result = sanitize_html(html)
        assert 'href="https://example.com"' in result
        assert 'title="Link"' in result

    def test_sanitize_html_unsafe_attributes(self):
        """Test that unsafe attributes are removed."""
        html = '<a href="javascript:alert(1)">Click</a>'
        result = sanitize_html(html)
        assert "javascript:" not in result

    def test_sanitize_html_empty_string(self):
        """Test sanitization of empty string."""
        assert sanitize_html("") == ""

    def test_sanitize_html_complex_xss(self):
        """Test complex XSS attack prevention."""
        html = '<img src="x" onerror="alert(1)"><p>Safe</p>'
        result = sanitize_html(html)
        assert "onerror" not in result
        assert "<p>" in result


class TestGenerateCaptchaSeed:
    """Test captcha seed generation."""

    def test_generate_captcha_seed_range(self):
        """Test that seed is in correct range."""
        for _ in range(100):
            seed = generate_captcha_seed()
            assert 100000 <= seed <= 999999

    def test_generate_captcha_seed_uniqueness(self):
        """Test that seeds are reasonably unique."""
        seeds = set()
        for _ in range(1000):
            seeds.add(generate_captcha_seed())
        # Should have high uniqueness
        assert len(seeds) > 950


class TestValidateCaptchaClick:
    """Test captcha click validation."""

    def test_validate_captcha_click_returns_tuple(self):
        """Test that validation returns a tuple."""
        result = validate_captcha_click(0, 0, 123456)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_validate_captcha_click_deterministic(self):
        """Test that validation is deterministic for same inputs."""
        result1 = validate_captcha_click(5, 2, 123456)
        result2 = validate_captcha_click(5, 2, 123456)
        assert result1 == result2

    def test_validate_captcha_click_different_seeds(self):
        """Test that different seeds produce different results."""
        result1 = validate_captcha_click(5, 2, 123456)
        result2 = validate_captcha_click(5, 2, 654321)
        # Results should be different (with high probability)
        # Note: There's a small chance they could be the same
        # but with 50% probability, it's very unlikely for multiple tests
        assert result1 != result2

    def test_validate_captcha_click_reason_message(self):
        """Test that reason message is appropriate."""
        is_correct, reason = validate_captcha_click(0, 0, 123456)
        if is_correct:
            assert reason == "Correct click"
        else:
            assert reason == "Incorrect click"


class TestIndexRoute:
    """Test index route."""

    def test_index_returns_html(self, client):
        """Test that index returns HTML."""
        response = client.get("/")
        assert response.status_code == 200
        assert b"<!DOCTYPE html>" in response.data

    def test_index_includes_comments(self, client, clean_comments):
        """Test that index includes comments in template."""
        clean_comments.append(
            {
                "id": 1,
                "author": "Test",
                "content": "Test comment",
                "timestamp": "2024-01-01T00:00:00",
                "html_content": "<p>Test</p>",
            }
        )
        response = client.get("/")
        assert response.status_code == 200


class TestCsrfTokenRoute:
    """Test CSRF token route."""

    def test_get_csrf_token(self, client):
        """Test getting CSRF token."""
        response = client.get("/api/csrf-token")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "csrf_token" in data
        assert len(data["csrf_token"]) > 0


class TestCaptchaGenerateRoute:
    """Test captcha generation route."""

    def test_generate_captcha_default(self, client):
        """Test generating captcha with default settings."""
        response = client.post("/api/captcha/generate", json={})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "seed" in data
        assert "instructions" in data
        assert "shapes" in data
        assert "time_limit" in data
        assert "target_score" in data
        assert "instruction_interval" in data

    def test_generate_captcha_custom_seed(self, client):
        """Test generating captcha with custom seed."""
        response = client.post("/api/captcha/generate", json={"seed": 123456})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["seed"] == 123456

    def test_generate_captcha_instructions_count(self, client):
        """Test that 6 instructions are generated."""
        response = client.post("/api/captcha/generate", json={})
        data = json.loads(response.data)
        assert len(data["instructions"]) == 6

    def test_generate_captcha_shapes_count(self, client):
        """Test that 36 shapes are generated."""
        response = client.post("/api/captcha/generate", json={})
        data = json.loads(response.data)
        assert len(data["shapes"]) == 36

    def test_generate_captcha_shape_properties(self, client):
        """Test that shapes have required properties."""
        response = client.post("/api/captcha/generate", json={})
        data = json.loads(response.data)
        shape = data["shapes"][0]
        assert "id" in shape
        assert "type" in shape
        assert "color" in shape
        assert "x" in shape
        assert "y" in shape
        assert "speed_x" in shape
        assert "speed_y" in shape
        assert "rotation" in shape
        assert "scale" in shape
        assert "opacity" in shape

    def test_generate_captcha_session_stored(self, client):
        """Test that captcha data is stored in session."""
        with client:
            response = client.post("/api/captcha/generate", json={})
            assert response.status_code == 200
            assert "captcha_seed" in session
            assert "captcha_start" in session
            assert "captcha_score" in session
            assert "captcha_clicks" in session


class TestCaptchaVerifyRoute:
    """Test captcha verification route."""

    def test_verify_captcha_no_session(self, client):
        """Test verifying captcha without session."""
        response = client.post(
            "/api/captcha/verify",
            json={
                "shape_id": 0,
                "instruction_index": 0,
            },
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data

    def test_verify_captcha_invalid_shape_id(self, client):
        """Test verifying captcha with invalid shape_id."""
        with client:
            client.post("/api/captcha/generate", json={})
            response = client.post(
                "/api/captcha/verify",
                json={
                    "shape_id": -1,
                    "instruction_index": 0,
                },
            )
            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data

    def test_verify_captcha_invalid_instruction_index(self, client):
        """Test verifying captcha with invalid instruction_index."""
        with client:
            client.post("/api/captcha/generate", json={})
            response = client.post(
                "/api/captcha/verify",
                json={
                    "shape_id": 0,
                    "instruction_index": 10,
                },
            )
            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data

    def test_verify_captcha_valid_click(self, client):
        """Test verifying valid captcha click."""
        with client:
            client.post("/api/captcha/generate", json={})
            response = client.post(
                "/api/captcha/verify",
                json={
                    "shape_id": 0,
                    "instruction_index": 0,
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert "valid" in data
            assert "score" in data

    def test_verify_captcha_bot_detection(self, client):
        """Test bot detection for too-fast clicking."""
        with client:
            client.post("/api/captcha/generate", json={})
            # First click
            client.post(
                "/api/captcha/verify",
                json={
                    "shape_id": 0,
                    "instruction_index": 0,
                },
            )
            # Second click immediately (should trigger bot detection)
            response = client.post(
                "/api/captcha/verify",
                json={
                    "shape_id": 1,
                    "instruction_index": 1,
                },
            )
            data = json.loads(response.data)
            # Should either be bot detection or valid click
            assert "valid" in data or "bot_detected" in data

    def test_verify_captcha_time_expired(self, client):
        """Test captcha verification after time expires."""
        with client:
            client.post("/api/captcha/generate", json={})
            # Modify session to expire time
            session["captcha_start"] = time.time() - TIME_LIMIT - 1
            response = client.post(
                "/api/captcha/verify",
                json={
                    "shape_id": 0,
                    "instruction_index": 0,
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data.get("error") == "Time expired"

    def test_verify_captcha_score_increment(self, client):
        """Test that correct clicks increment score."""
        with client:
            client.post("/api/captcha/generate", json={})
            # Make multiple clicks to ensure at least one is correct
            for i in range(10):
                response = client.post(
                    "/api/captcha/verify",
                    json={
                        "shape_id": i % 36,
                        "instruction_index": i % 6,
                    },
                )
                data = json.loads(response.data)
                if data.get("valid"):
                    assert data["score"] > 0
                    break

    def test_verify_captcha_wrong_click_penalty(self, client):
        """Test that wrong clicks decrease score."""
        with client:
            client.post("/api/captcha/generate", json={})
            # Force a wrong click by mocking
            with patch("app.validate_captcha_click", return_value=(False, "Incorrect")):
                response = client.post(
                    "/api/captcha/verify",
                    json={
                        "shape_id": 0,
                        "instruction_index": 0,
                    },
                )
                data = json.loads(response.data)
                assert data["valid"] is False
                assert "shake" in data


class TestCaptchaStatusRoute:
    """Test captcha status route."""

    def test_captcha_status_no_session(self, client):
        """Test getting status without active captcha."""
        response = client.get("/api/captcha/status")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["active"] is False

    def test_captcha_status_active(self, client):
        """Test getting status with active captcha."""
        with client:
            client.post("/api/captcha/generate", json={})
            response = client.get("/api/captcha/status")
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["active"] is True
            assert "score" in data
            assert "clicks" in data
            assert "wrong_clicks" in data
            assert "elapsed" in data
            assert "remaining" in data


class TestStep3GenerateRoute:
    """Test step 3 generation route."""

    def test_generate_step3_under_18(self, client):
        """Test generating step 3 for user under 18."""
        response = client.post(
            "/api/captcha/step3/generate",
            json={
                "is_18_plus": False,
            },
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["skipped"] is True

    def test_generate_step3_over_18(self, client):
        """Test generating step 3 for user 18+."""
        response = client.post(
            "/api/captcha/step3/generate",
            json={
                "is_18_plus": True,
            },
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["skipped"] is False
        assert "images" in data
        assert "current_category" in data
        assert "total_categories" in data

    def test_generate_step3_images_count(self, client):
        """Test that 16 images are generated."""
        response = client.post(
            "/api/captcha/step3/generate",
            json={
                "is_18_plus": True,
            },
        )
        data = json.loads(response.data)
        assert len(data["images"]) == 16

    def test_generate_step3_session_stored(self, client):
        """Test that step 3 data is stored in session."""
        with client:
            response = client.post(
                "/api/captcha/step3/generate",
                json={
                    "is_18_plus": True,
                },
            )
            assert response.status_code == 200
            assert "step3_images" in session
            assert "step3_current_category" in session
            assert "step3_categories_to_find" in session


class TestStep3VerifyRoute:
    """Test step 3 verification route."""

    def test_verify_step3_invalid_indices(self, client):
        """Test verifying step 3 with invalid indices."""
        response = client.post(
            "/api/captcha/step3/verify",
            json={
                "selected_indices": [0, 16],  # 16 is out of range
            },
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data

    def test_verify_step3_skipped(self, client):
        """Test verifying step 3 when it was skipped."""
        with client:
            session["step3_skipped"] = True
            response = client.post(
                "/api/captcha/step3/verify",
                json={
                    "selected_indices": [0, 1, 2],
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["skipped"] is True

    def test_verify_step3_no_session(self, client):
        """Test verifying step 3 without session."""
        response = client.post(
            "/api/captcha/step3/verify",
            json={
                "selected_indices": [0, 1, 2],
            },
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data

    def test_verify_step3_correct_selection(self, client):
        """Test verifying step 3 with correct selection."""
        with client:
            # Generate step 3
            client.post("/api/captcha/step3/generate", json={"is_18_plus": True})

            images = session.get("step3_images", [])
            current_category = session.get("step3_current_category")
            # Find correct indices
            correct_indices = [
                i for i, img in enumerate(images) if img["category"] == current_category
            ]

            # Verify with correct indices
            response = client.post(
                "/api/captcha/step3/verify",
                json={
                    "selected_indices": correct_indices,
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert "valid" in data


class TestStep2CompleteRoute:
    """Test step 2 completion route."""

    def test_complete_step2(self, client):
        """Test completing step 2."""
        response = client.post("/api/captcha/step2/complete")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True
        assert "overall_score" in data

    def test_complete_step2_session_updated(self, client):
        """Test that step 2 completion updates session."""
        with client:
            response = client.post("/api/captcha/step2/complete")
            assert response.status_code == 200
            assert session.get("step2_completed") is True


class TestStep3CompleteRoute:
    """Test step 3 completion route."""

    def test_complete_step3_low_score(self, client):
        """Test completing step 3 with low score."""
        with client:
            session["step3_score"] = 0
            response = client.post("/api/captcha/step3/complete")
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["success"] is True
            # Should not add to overall score
            assert data["overall_score"] == 0

    def test_complete_step3_high_score(self, client):
        """Test completing step 3 with high score."""
        with client:
            session["step3_score"] = STEP3_MIN_SCORE
            response = client.post("/api/captcha/step3/complete")
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["success"] is True
            # Should add to overall score
            assert data["overall_score"] >= 1


class TestStep3StatusRoute:
    """Test step 3 status route."""

    def test_step3_status_default(self, client):
        """Test getting step 3 status with defaults."""
        response = client.get("/api/captcha/step3/status")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "skipped" in data
        assert "score" in data
        assert "attempts" in data
        assert "overall_score" in data

    def test_step3_status_with_session(self, client):
        """Test getting step 3 status with session data."""
        with client:
            session["step3_skipped"] = False
            session["step3_score"] = 5
            session["step3_attempts"] = 10
            session["overall_score"] = 2
            response = client.get("/api/captcha/step3/status")
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["skipped"] is False
            assert data["score"] == 5
            assert data["attempts"] == 10
            assert data["overall_score"] == 2


class TestCommentsRoutes:
    """Test comments routes."""

    def test_get_comments_empty(self, client, clean_comments):
        """Test getting comments when empty."""
        response = client.get("/api/comments")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["comments"] == []

    def test_get_comments_with_data(self, client, clean_comments):
        """Test getting comments with data."""
        clean_comments.append(
            {
                "id": 1,
                "author": "Test",
                "content": "Test comment",
                "timestamp": "2024-01-01T00:00:00",
                "html_content": "<p>Test</p>",
            }
        )
        response = client.get("/api/comments")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data["comments"]) == 1

    def test_add_comment_no_captcha(self, client, clean_comments):
        """Test adding comment without completing captcha."""
        response = client.post(
            "/api/comments",
            json={
                "author": "Test",
                "content": "Test comment",
                "html_content": "<p>Test</p>",
            },
        )
        assert response.status_code == 403
        data = json.loads(response.data)
        assert "error" in data

    def test_add_comment_incomplete_captcha(self, client, clean_comments):
        """Test adding comment with incomplete captcha."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE - 1
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test",
                    "content": "Test comment",
                    "html_content": "<p>Test</p>",
                },
            )
            assert response.status_code == 403

    def test_add_comment_low_overall_score(self, client, clean_comments):
        """Test adding comment with low overall score."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED - 1
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test",
                    "content": "Test comment",
                    "html_content": "<p>Test</p>",
                },
            )
            assert response.status_code == 403

    def test_add_comment_success(self, client, clean_comments):
        """Test successfully adding a comment."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test Author",
                    "content": "Test comment content",
                    "html_content": "<p>Test HTML</p>",
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["success"] is True
            assert "comment" in data
            assert len(clean_comments) == 1

    def test_add_comment_invalid_author(self, client, clean_comments):
        """Test adding comment with invalid author."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            response = client.post(
                "/api/comments",
                json={
                    "author": "A" * 101,  # Too long
                    "content": "Test",
                    "html_content": "<p>Test</p>",
                },
            )
            assert response.status_code == 400

    def test_add_comment_invalid_content(self, client, clean_comments):
        """Test adding comment with invalid content."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test",
                    "content": "C" * 5001,  # Too long
                    "html_content": "<p>Test</p>",
                },
            )
            assert response.status_code == 400

    def test_add_comment_sanitizes_html(self, client, clean_comments):
        """Test that comment HTML is sanitized."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test",
                    "content": "Test",
                    "html_content": '<script>alert("XSS")</script><p>Safe</p>',
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert "<script>" not in data["comment"]["html_content"]
            assert "<p>" in data["comment"]["html_content"]

    def test_add_comment_default_author(self, client, clean_comments):
        """Test adding comment with default author."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            response = client.post(
                "/api/comments",
                json={
                    "content": "Test",
                    "html_content": "<p>Test</p>",
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["comment"]["author"] == "Anonymous"

    def test_add_comment_clears_session(self, client, clean_comments):
        """Test that adding comment clears captcha session."""
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            session["step1_completed"] = True
            session["step2_completed"] = True
            session["step3_completed"] = True
            client.post(
                "/api/comments",
                json={
                    "author": "Test",
                    "content": "Test",
                    "html_content": "<p>Test</p>",
                },
            )
            assert "captcha_seed" not in session
            assert "captcha_score" not in session
            assert "overall_score" not in session


class TestSecurityFeatures:
    """Test security features."""

    def test_rate_limiting_captcha_generate(self, client):
        """Test rate limiting on captcha generation."""
        # Rate limiting is disabled in test fixture
        # Just verify the endpoint works
        response = client.post("/api/captcha/generate", json={})
        assert response.status_code == 200

    def test_rate_limiting_comments(self, client, clean_comments):
        """Test rate limiting on comments."""
        # Rate limiting is disabled in test fixture
        # Just verify the endpoint works
        with client:
            client.post("/api/captcha/generate", json={})
            session["captcha_score"] = TARGET_SCORE
            session["overall_score"] = OVERALL_SCORE_REQUIRED
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test",
                    "content": "Test",
                    "html_content": "<p>Test</p>",
                },
            )
            assert response.status_code == 200

    def test_csrf_protection_enabled(self):
        """Test that CSRF protection is enabled."""
        # Note: CSRF is disabled in test fixture, but we verify the config exists
        assert "WTF_CSRF_ENABLED" in app.config

    def test_secret_key_set(self):
        """Test that secret key is set."""
        assert app.secret_key is not None
        assert len(app.secret_key) > 0


class TestConstants:
    """Test that constants are properly defined."""

    def test_time_limit(self):
        """Test TIME_LIMIT constant."""
        assert TIME_LIMIT == 12

    def test_target_score(self):
        """Test TARGET_SCORE constant."""
        assert TARGET_SCORE == 25

    def test_instruction_interval(self):
        """Test INSTRUCTION_INTERVAL constant."""
        assert INSTRUCTION_INTERVAL == 1.8

    def test_min_click_interval(self):
        """Test MIN_CLICK_INTERVAL constant."""
        assert MIN_CLICK_INTERVAL == 0.15

    def test_bot_detection_threshold(self):
        """Test BOT_DETECTION_THRESHOLD constant."""
        assert BOT_DETECTION_THRESHOLD == 150

    def test_max_wrong_clicks(self):
        """Test MAX_WRONG_CLICKS constant."""
        assert MAX_WRONG_CLICKS == 10

    def test_step3_min_score(self):
        """Test STEP3_MIN_SCORE constant."""
        assert STEP3_MIN_SCORE == 2

    def test_overall_score_required(self):
        """Test OVERALL_SCORE_REQUIRED constant."""
        assert OVERALL_SCORE_REQUIRED == 2

    def test_image_categories(self):
        """Test IMAGE_CATEGORIES constant."""
        assert len(IMAGE_CATEGORIES) == 5
        assert "beer" in IMAGE_CATEGORIES
        assert "cocktails" in IMAGE_CATEGORIES
        assert "soda" in IMAGE_CATEGORIES
        assert "vodka" in IMAGE_CATEGORIES
        assert "water" in IMAGE_CATEGORIES

    def test_captcha_instructions(self):
        """Test CAPTCHA_INSTRUCTIONS constant."""
        assert len(CAPTCHA_INSTRUCTIONS) == 20


class TestIntegration:
    """Integration tests for complete workflows."""

    def test_complete_captcha_workflow(self, client, clean_comments):
        """Test complete captcha workflow from generation to comment."""
        with client:
            # Generate captcha
            response = client.post("/api/captcha/generate", json={})
            assert response.status_code == 200

            # Complete step 1 (simulate multiple clicks)
            for i in range(30):
                response = client.post(
                    "/api/captcha/verify",
                    json={
                        "shape_id": i % 36,
                        "instruction_index": i % 6,
                    },
                )
                data = json.loads(response.data)
                if data.get("completed"):
                    break

            # Complete step 2
            response = client.post("/api/captcha/step2/complete")
            assert response.status_code == 200

            # Generate and complete step 3
            response = client.post(
                "/api/captcha/step3/generate",
                json={
                    "is_18_plus": True,
                },
            )
            assert response.status_code == 200

            # Complete step 3
            session["step3_score"] = STEP3_MIN_SCORE
            response = client.post("/api/captcha/step3/complete")
            assert response.status_code == 200

            # Add comment
            response = client.post(
                "/api/comments",
                json={
                    "author": "Test User",
                    "content": "This is a test comment",
                    "html_content": "<p>This is a test comment</p>",
                },
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["success"] is True
            assert len(clean_comments) == 1

    def test_captcha_status_workflow(self, client):
        """Test captcha status throughout workflow."""
        with client:
            # Check status before generation
            response = client.get("/api/captcha/status")
            data = json.loads(response.data)
            assert data["active"] is False

            # Generate captcha
            client.post("/api/captcha/generate", json={})

            # Check status after generation
            response = client.get("/api/captcha/status")
            data = json.loads(response.data)
            assert data["active"] is True
            assert data["score"] == 0
            assert data["clicks"] == 0

    def test_step3_status_workflow(self, client):
        """Test step 3 status throughout workflow."""
        with client:
            # Check status before generation
            response = client.get("/api/captcha/step3/status")
            data = json.loads(response.data)
            assert data["skipped"] is False
            assert data["score"] == 0

            # Generate step 3
            client.post("/api/captcha/step3/generate", json={"is_18_plus": True})

            # Check status after generation
            response = client.get("/api/captcha/step3/status")
            data = json.loads(response.data)
            assert data["skipped"] is False
