# Worst Captcha - The Most Annoying Captcha Ever Created

A comment wall with the most chaotic captcha verification system. Users must prove they're human by completing an extremely difficult captcha before leaving comments.

## Features

### Captcha Features
- **6×6 Grid of Chaotic Shapes**: Squares, circles, triangles, and optical illusions
- **Changing Instructions**: Instructions change every 1.8 seconds
- **Score Target**: Must score exactly 25 correct clicks in 12 seconds
- **Penalties**: Wrong clicks deduct 3 points with screen shake and "BOT DETECTED" sound
- **Cursor Tricks**: Cursor disappears or inverts randomly
- **Shape Changes**: Shapes change color/type at random moments
- **Bot Detection**: Clicking too fast triggers bot detection
- **White Text Trick**: Instructions become invisible (white on white) once per session

### Comment Wall Features
- **WYSIWYG Editor**: Quill.js rich text editor
- **Google reCAPTCHA Style**: Compact checkbox that opens popup captcha
- **Real-time Comments**: Comments displayed in reverse chronological order
- **HTML Support**: Comments support rich text formatting

## Installation

### Prerequisites
- Python 3.14.3 or higher
- Node.js (for package management)

### Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

1. Write a comment using the rich text editor
2. Click "Leave a Comment" button
3. The captcha checkbox appears (Google reCAPTCHA style)
4. Click the checkbox to open the captcha popup
5. Complete the chaotic captcha challenge:
   - Follow the rapidly changing instructions
   - Click the correct shapes in the 6×6 grid
   - Score 25 points in 12 seconds
6. If successful, your comment will be posted

## Captcha Instructions Examples

The captcha generates random instructions from a pool including:
- "Click ALL green shapes that are moving LEFT"
- "Now click only those that are NOT squares (even if they look like squares)"
- "Ignore everything red, EXCEPT those reds that are in the top row"
- "Click the shapes that are currently changing color, but only if they are circular… no, wait, now only if they are NOT circular"
- "Urgently click everything left over from the previous instruction before it disappears"
- "If it's an even second — click triangles. If odd — pretend they don't exist"

## API Endpoints

### Generate Captcha
```
POST /api/captcha/generate
```
Generates a new captcha session with seed and rules.

### Verify Click
```
POST /api/captcha/verify
```
Verifies a captcha click and updates score.

### Get Comments
```
GET /api/comments
```
Retrieves all comments.

### Add Comment
```
POST /api/comments
```
Adds a new comment (requires captcha completion).

## Technical Details

### Backend
- **Framework**: Flask 3.1.3
- **Session Management**: Flask sessions
- **Storage**: In-memory (use database in production)

### Frontend
- **Editor**: Quill.js 1.3.6
- **Styling**: Custom CSS with Google reCAPTCHA design
- **Audio**: Web Audio API for bot detection sound

### Security Features
- Session-based captcha verification
- Bot detection (click speed analysis)
- Rate limiting (implicit through captcha)
- XSS protection (HTML escaping)

## Project Structure

```
worstcaptcha/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       ├── captcha.js    # Captcha game logic
│       └── comments.js   # Comment functionality
└── README.md
```

## License

MIT License

## Disclaimer

This captcha is intentionally designed to be extremely difficult and annoying as joke for Kilo Code hackathon. In production, use proper CAPTCHA services like Google reCAPTCHA or hCaptcha.
