# Worst Captcha - The Most Annoying Captcha Ever Created

A comment wall with an extremely difficult multi-step captcha verification system. Users must prove they're human by completing three increasingly annoying challenges before leaving comments.

## Features

### Multi-Step Captcha System

#### Step 1: Drawing Challenge
- **Art Image Reference**: Display a random art image from the collection
- **Edge Detection**: Server-side Sobel edge detection with Gaussian blur
- **Drawing Canvas**: 400×400 canvas for users to trace the edges
- **Time Limit**: 30 seconds to complete the drawing
- **Match Calculation**: Server-side pixel comparison with overlap percentage
- **Threshold**: 60% match required to pass

#### Step 2: Sing the Notes
- **Pitch Detection**: Real-time microphone input analysis using Web Audio API
- **Target Notes**: Three musical notes (C4, E4, G4) in random order
- **Auto-Correlation**: Pitch detection algorithm with 10% tolerance
- **Time Limit**: 60 seconds to match all 3 notes
- **No Audio Preview**: Users must use their musical knowledge

#### Step 3: Image Selection
- **Age Verification**: Client-side age check (18+ or under 18)
- **Image Grid**: 4×4 grid of images from 5 categories (beer, cocktails, soda, vodka, water)
- **Category Selection**: Random category selection for each challenge
- **Single Category**: Users must select all images from one category
- **Score Requirement**: Must score 2 out of 3 steps to pass

### Comment Wall Features
- **WYSIWYG Editor**: Quill.js rich text editor with formatting support
- **Google reCAPTCHA Style**: Compact checkbox that opens popup captcha
- **Real-time Comments**: Comments displayed in reverse chronological order
- **HTML Support**: Comments support rich text formatting with sanitization
- **Database Storage**: PostgreSQL (or SQLite for development) with SQLAlchemy ORM

## Installation

### Prerequisites
- Python 3.14 or higher
- PostgreSQL (optional, SQLite used by default)
- Docker (for production deployment)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/egorserdyuk/worstcaptcha.git
cd worstcaptcha
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t worstcaptcha .
```

2. Run the container:
```bash
docker run -p 5005:5005 worstcaptcha
```

3. Access at:
```
http://localhost:5005
```

## Usage

1. Write a comment using the rich text editor
2. Click "Leave a Comment" button
3. The captcha checkbox appears (Google reCAPTCHA style)
4. Click the checkbox to open the captcha popup
5. Complete the three-step captcha challenge:
   - **Step 1**: Draw the edges/contours of the art image shown
   - **Step 2**: Sing the musical notes displayed (requires microphone)
   - **Step 3**: Select all images from the specified category (beer, cocktails, soda, vodka, or water)
6. Must pass at least 2 out of 3 steps to successfully post a comment

## API Documentation

For complete API reference including all endpoints, request/response formats, and error handling, see [docs/API.md](docs/API.md).

## Technical Details

### Backend
- **Framework**: Flask 3.1.3
- **Database**: SQLAlchemy with PostgreSQL support (SQLite for development)
- **Session Management**: Flask sessions with secure secret key
- **CSRF Protection**: Flask-WTF CSRF protection
- **Rate Limiting**: Flask-Limiter (200/day, 50/hour default)
- **HTML Sanitization**: nh3 library for XSS prevention
- **Image Processing**: Pillow for edge detection and image manipulation

### Frontend
- **Editor**: Quill.js 1.3.6
- **Styling**: Custom CSS with Google reCAPTCHA design
- **Audio**: Web Audio API for pitch detection
- **Canvas**: HTML5 Canvas for drawing challenge
- **Animations**: Animate.css for UI effects

### Security Features
- **CSRF Protection**: All state-changing requests require CSRF token
- **Rate Limiting**: API endpoints protected with rate limits
- **Input Validation**: Server-side validation for all inputs
- **HTML Sanitization**: XSS prevention using nh3 whitelist
- **Session-based Verification**: Captcha state stored in secure sessions
- **Bot Detection**: Click speed analysis and time-based checks
- **Secure Secret Key**: Environment-based or file-based secret key

### Image Categories
The captcha uses images from 5 categories:
- **Beer**: 80 images
- **Cocktails**: 36 images
- **Soda**: 28 images
- **Vodka**: 30 images
- **Water**: (additional category)

### Art Images
5 art images used for the drawing challenge with edge detection.

## Project Structure

```
worstcaptcha/
├── app.py                    # Flask backend with all routes
├── requirements.txt          # Python dependencies
├── requirements_dev.txt      # Development dependencies
├── Dockerfile                # Production Docker configuration
├── .dockerignore             # Docker build exclusions
├── DEPLOYMENT.md             # Dokploy deployment guide
├── DOCKER_SUMMARY.md         # Docker configuration summary
├── TEST_COVERAGE.md          # Test suite documentation
├── license                   # MIT License
├── templates/
│   └── index.html           # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css        # Styling
│   ├── js/
│   │   ├── captcha.js       # Captcha game logic (3-step system)
│   │   └── comments.js      # Comment functionality
│   └── images/
│       ├── art/             # 5 art images for drawing challenge
│       ├── beer/            # 80 beer images
│       ├── cocktails/       # 36 cocktail images
│       ├── soda/            # 28 soda images
│       └── vodka/           # 30 vodka images
└── tests/
    ├── conftest.py          # Pytest configuration
    ├── test_app_simple.py   # 55 passing tests (core functionality)
    └── test_app.py          # 79 tests (full suite)
```

## Dependencies

### Production
- Flask==3.1.3
- gunicorn==25.1.0
- Flask-WTF==1.2.2
- Flask-Limiter==3.10.1
- nh3==0.3.3
- Pillow==12.1.1
- Flask-SQLAlchemy==3.1.1
- psycopg2-binary==2.9.11

### Development
- pytest (for testing)
- pytest-cov (for coverage)

## Testing

### Run Simplified Tests (All Passing)
```bash
python -m pytest tests/test_app_simple.py -v
```

### Run Full Test Suite
```bash
python -m pytest tests/ -v
```

### Run with Coverage
```bash
python -m pytest tests/test_app_simple.py -v --cov=app --cov-report=html
```

## Production Deployment

### Docker with Gunicorn
The application uses Gunicorn WSGI server with:
- 2 workers (adjustable)
- 120-second timeout
- Health checks every 30 seconds
- Non-root user execution
- Port 5005 (Dokploy compatible)

### Environment Variables
- `SECRET_KEY`: Secure random key for production
- `DATABASE_URL`: PostgreSQL connection string (optional)
- `FLASK_ENV`: Set to `production`

### Dokploy Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Dokploy deployment instructions.

## License

MIT License

## Disclaimer

This captcha is intentionally designed to be extremely difficult and annoying as a joke for Kilo Code hackathon. In production, use proper CAPTCHA services like Google reCAPTCHA or hCaptcha.

## Disclaimer 2

The author of this library does not promote the use of alcohol. I'm strongly condemns such behavior. Lead a healthy lifestyle.

The images were generated by AI solely for the purpose of humorously demonstrating CAPTCHAs for educational or contest purposes. This project is not affiliated with any brand and does not promote alcohol.