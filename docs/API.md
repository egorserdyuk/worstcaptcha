# API Documentation

Complete API reference for the Worst Captcha application.

## Base URL

```
http://localhost:5000
```

## Authentication

All state-changing requests require CSRF protection. Include the CSRF token in the request header:

```
X-CSRFToken: <csrf-token>
```

The CSRF token is available in the HTML meta tag:
```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```

## Rate Limiting

API endpoints are protected with rate limiting:
- **Default**: 200 requests per day, 50 requests per hour
- **Drawing endpoints**: 10-20 requests per minute
- **Comment submission**: 5 requests per minute

## Drawing Challenge

### Generate Drawing Challenge

Generate a new drawing challenge with an art image and edge-detected version.

**Endpoint:**
```
POST /api/captcha/drawing/generate
```

**Rate Limit:** 10 per minute

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "image_path": "/static/images/art/1.webp",
  "edge_image": "data:image/png;base64,...",
  "time_limit": 30
}
```

**Response Fields:**
- `success` (boolean): Whether the challenge was generated successfully
- `image_path` (string): Path to the reference art image
- `edge_image` (string): Base64-encoded edge-detected version of the image
- `time_limit` (integer): Time limit in seconds (30)

**Error Response:**
```json
{
  "error": "No art images available"
}
```

### Verify Drawing

Verify user's drawing against the original image edges.

**Endpoint:**
```
POST /api/captcha/drawing/verify
```

**Rate Limit:** 20 per minute

**Request Body:**
```json
{
  "drawing_data": "data:image/png;base64,..."
}
```

**Request Fields:**
- `drawing_data` (string, required): Base64-encoded PNG image of the user's drawing (max 1MB)

**Response (Success):**
```json
{
  "valid": true,
  "match_percentage": 75.5,
  "completed": true,
  "message": "Drawing challenge completed!",
  "overall_score": 1
}
```

**Response (Failure):**
```json
{
  "valid": false,
  "match_percentage": 45.2,
  "attempts": 1,
  "message": "Drawing doesn't match enough. Match: 45.2%"
}
```

**Response Fields:**
- `valid` (boolean): Whether the drawing passed the threshold (60%)
- `match_percentage` (float): Percentage of edge pixels matched
- `completed` (boolean): Whether the challenge is completed
- `message` (string): Human-readable message
- `overall_score` (integer): Current overall captcha score
- `attempts` (integer): Number of attempts made

**Error Responses:**
```json
{
  "valid": false,
  "error": "Invalid request"
}
```

```json
{
  "valid": false,
  "error": "No drawing data"
}
```

```json
{
  "valid": false,
  "error": "Drawing data too large"
}
```

```json
{
  "valid": false,
  "error": "No drawing challenge session"
}
```

```json
{
  "valid": false,
  "error": "Time expired",
  "restart": true
}
```

## Step 2: Sing the Notes

### Complete Step 2

Mark step 2 as completed after user matches all 3 notes.

**Endpoint:**
```
POST /api/captcha/step2/complete
```

**Rate Limit:** 10 per minute

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "overall_score": 1
}
```

**Response Fields:**
- `success` (boolean): Whether step 2 was marked as completed
- `overall_score` (integer): Current overall captcha score

## Step 3: Image Selection

### Generate Step 3

Generate image grid for step 3 with age verification.

**Endpoint:**
```
POST /api/captcha/step3/generate
```

**Rate Limit:** 10 per minute

**Request Body:**
```json
{
  "is_18_plus": true
}
```

**Request Fields:**
- `is_18_plus` (boolean, required): Whether the user is 18 years or older

**Response (18+ User):**
```json
{
  "skipped": false,
  "images": [
    {
      "category": "beer",
      "filename": "1.webp",
      "path": "/static/images/beer/1.webp"
    },
    {
      "category": "cocktails",
      "filename": "5.webp",
      "path": "/static/images/cocktails/5.webp"
    }
  ],
  "current_category": "beer",
  "total_categories": 1
}
```

**Response (Under 18 User):**
```json
{
  "skipped": true,
  "message": "Step 3 skipped for users under 18"
}
```

**Response Fields:**
- `skipped` (boolean): Whether step 3 was skipped
- `images` (array): Array of 16 image objects for the 4×4 grid
  - `category` (string): Image category (beer, cocktails, soda, vodka, water)
  - `filename` (string): Image filename
  - `path` (string): Full path to the image
- `current_category` (string): Category to select in this challenge
- `total_categories` (integer): Total number of categories to find (always 1)
- `message` (string): Message for skipped step

### Verify Step 3

Verify image selection for step 3.

**Endpoint:**
```
POST /api/captcha/step3/verify
```

**Rate Limit:** 20 per minute

**Request Body:**
```json
{
  "selected_indices": [0, 3, 7, 12]
}
```

**Request Fields:**
- `selected_indices` (array of integers, required): Array of selected image indices (0-15)

**Response (Correct Selection):**
```json
{
  "valid": true,
  "correct_indices": [0, 3, 7, 12],
  "completed": true,
  "total_categories": 1
}
```

**Response (Incorrect Selection):**
```json
{
  "valid": false,
  "correct_indices": [0, 3, 7, 12],
  "completed": false
}
```

**Response Fields:**
- `valid` (boolean): Whether the selection was correct
- `correct_indices` (array): Array of correct image indices
- `completed` (boolean): Whether all categories are completed
- `total_categories` (integer): Total number of categories

**Error Responses:**
```json
{
  "valid": false,
  "error": "Invalid request"
}
```

```json
{
  "valid": false,
  "error": "Invalid selected_indices"
}
```

```json
{
  "valid": false,
  "error": "No step 3 session"
}
```

### Complete Step 3

Mark step 3 as completed.

**Endpoint:**
```
POST /api/captcha/step3/complete
```

**Rate Limit:** 10 per minute

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "overall_score": 2
}
```

**Response Fields:**
- `success` (boolean): Whether step 3 was marked as completed
- `overall_score` (integer): Current overall captcha score

### Step 3 Status

Get current step 3 status.

**Endpoint:**
```
GET /api/captcha/step3/status
```

**Request Body:** None

**Response:**
```json
{
  "skipped": false,
  "attempts": 1,
  "overall_score": 2
}
```

**Response Fields:**
- `skipped` (boolean): Whether step 3 was skipped
- `attempts` (integer): Number of attempts made
- `overall_score` (integer): Current overall captcha score

## Comments

### Get Comments

Retrieve all comments from the database.

**Endpoint:**
```
GET /api/comments
```

**Request Body:** None

**Response:**
```json
{
  "comments": [
    {
      "id": 1,
      "author": "Anonymous",
      "content": "Great comment!",
      "html_content": "<p>Great comment!</p>",
      "timestamp": "2026-03-23T21:00:00"
    },
    {
      "id": 2,
      "author": "User123",
      "content": "Another comment",
      "html_content": "<p>Another comment</p>",
      "timestamp": "2026-03-23T20:30:00"
    }
  ]
}
```

**Response Fields:**
- `comments` (array): Array of comment objects
  - `id` (integer): Unique comment ID
  - `author` (string): Comment author name
  - `content` (string): Plain text content
  - `html_content` (string): Sanitized HTML content
  - `timestamp` (string): ISO 8601 timestamp

### Add Comment

Add a new comment (requires captcha completion with score ≥ 2).

**Endpoint:**
```
POST /api/comments
```

**Rate Limit:** 5 per minute

**Headers:**
```
X-CSRFToken: <csrf-token>
```

**Request Body:**
```json
{
  "author": "Username",
  "content": "Comment text",
  "html_content": "<p>Comment text</p>"
}
```

**Request Fields:**
- `author` (string, optional): Comment author name (max 100 characters, default: "Anonymous")
- `content` (string, required): Plain text comment content (max 5000 characters)
- `html_content` (string, optional): HTML formatted content (max 10000 characters, sanitized)

**Response (Success):**
```json
{
  "success": true,
  "comment": {
    "id": 1,
    "author": "Username",
    "content": "Comment text",
    "html_content": "<p>Comment text</p>",
    "timestamp": "2026-03-23T21:00:00"
  }
}
```

**Response (Captcha Not Completed):**
```json
{
  "error": "Captcha not completed successfully. Score: 1/2 required"
}
```

**Error Responses:**
```json
{
  "error": "Invalid request"
}
```

```json
{
  "error": "Invalid author name"
}
```

```json
{
  "error": "Invalid content"
}
```

```json
{
  "error": "Invalid HTML content (max 10000 chars)"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request data
- `403 Forbidden`: Captcha not completed or CSRF token missing
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error responses include a JSON object with an `error` field:

```json
{
  "error": "Error message description"
}
```

## Session Management

The application uses Flask sessions to track captcha state:

- `drawing_challenge`: Drawing challenge session data
- `step2_completed`: Step 2 completion status
- `step2_score_added`: Prevents duplicate scoring for step 2
- `step3_skipped`: Whether step 3 was skipped
- `step3_score_added`: Prevents duplicate scoring for step 3
- `step3_attempts`: Number of step 3 attempts
- `step3_images`: Images for current step 3 challenge
- `step3_current_category`: Current category to find
- `step3_categories_to_find`: List of categories to find
- `step3_category_index`: Current category index
- `overall_score`: Overall captcha score (must be ≥ 2 to post comment)

## Security Considerations

1. **CSRF Protection**: All POST requests to `/api/comments` require CSRF token
2. **Rate Limiting**: All endpoints have rate limits to prevent abuse
3. **Input Validation**: All inputs are validated server-side
4. **HTML Sanitization**: Comment HTML is sanitized using nh3 whitelist
5. **Session Security**: Captcha state stored in secure server-side sessions
6. **Image Size Limits**: Drawing data limited to 1MB base64
7. **Time Limits**: Drawing challenge has 30-second time limit
