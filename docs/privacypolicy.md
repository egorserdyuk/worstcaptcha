# Privacy Policy

**Last Updated:** March 24, 2026

## Introduction

This Privacy Policy explains how Worst Captcha ("we," "us," or "our") collects, uses, and protects your information when you use our website. We are committed to protecting your privacy and being transparent about our data practices.

By using our website, you agree to the collection and use of information in accordance with this policy.

## Information We Collect

### 1. Comments Data

When you submit a comment on our website, we collect:

- **Author Name**: The name you provide (defaults to "Anonymous" if not specified)
- **Comment Content**: The text content of your comment
- **HTML Content**: Rich text formatting you apply to your comment
- **Timestamp**: The date and time when your comment was submitted

**Data Limits:**
- Author name: Maximum 100 characters
- Comment content: Maximum 5,000 characters
- HTML content: Maximum 10,000 characters

### 2. Session Data

To provide our captcha verification service, we temporarily store session data including:

- **Captcha Progress**: Your progress through the multi-step verification system
- **Drawing Challenge Data**: Information about your drawing challenge attempts
- **Image Selection Data**: Your progress through the image selection challenge
- **Audio Challenge Data**: Your progress through the audio challenge

This data is stored temporarily in your browser session and is automatically cleared after you complete the captcha verification.

### 3. Technical Data

We automatically collect certain technical information when you visit our website:

- **IP Address**: Used for rate limiting and security purposes
- **Session Cookies**: Used to maintain your session state and security tokens
- **Browser Information**: Basic information about your browser for compatibility

### 4. Drawing Data

During the drawing captcha challenge, we temporarily process:

- **Drawing Images**: Base64-encoded images of your drawings
- **Edge Detection Data**: Processed images used for verification

This data is processed in real-time and is not permanently stored. Temporary files are deleted immediately after verification.

## How We Use Your Information

We use the collected information for the following purposes:

### 1. Providing Our Service
- Displaying your comments on the comment wall
- Maintaining your session during captcha verification
- Processing and verifying captcha challenges

### 2. Security and Fraud Prevention
- Preventing automated spam and bot submissions
- Protecting against cross-site request forgery (CSRF) attacks
- Implementing rate limiting to prevent abuse
- Validating and sanitizing user input to prevent security vulnerabilities

### 3. Service Improvement
- Analyzing usage patterns to improve our captcha system
- Monitoring system performance and reliability
- Debugging and troubleshooting technical issues

## Data Storage and Security

### Storage Methods

- **Database**: Comments are stored in a PostgreSQL database (or SQLite for development)
- **Session Storage**: Temporary captcha data is stored in encrypted browser sessions
- **In-Memory Fallback**: If the database is unavailable, comments may be temporarily stored in memory

### Security Measures

We implement the following security measures to protect your data:

- **CSRF Protection**: All form submissions are protected against cross-site request forgery attacks
- **Rate Limiting**: We limit the number of requests to prevent abuse (200 requests per day, 50 per hour)
- **Input Validation**: All user input is validated and sanitized to prevent injection attacks
- **HTML Sanitization**: HTML content is sanitized using the nh3 library to prevent XSS attacks
- **Secure Session Management**: Sessions use cryptographically secure tokens
- **Encryption**: Session data is encrypted and transmitted over HTTPS

## Data Retention

### Comments
- Comments are stored indefinitely in our database
- Comments are publicly visible on the comment wall
- We do not automatically delete comments

### Session Data
- Session data is automatically cleared when you complete the captcha
- Session data is also cleared when you close your browser
- Session cookies expire after your browser session ends

### Technical Data
- IP addresses are used for rate limiting and are not permanently stored
- Server logs may temporarily contain IP addresses for debugging purposes
- Logs are regularly rotated and deleted

## Data Sharing and Disclosure

We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:

### 1. Legal Requirements
We may disclose your information if required by law or in response to:
- Court orders or legal processes
- Government requests or investigations
- Enforcement of our terms of service

### 2. Service Providers
We may share information with trusted service providers who assist us in:
- Database hosting and management
- Server infrastructure and maintenance
- Security monitoring and protection

These providers are contractually obligated to protect your information and use it only for the purposes we specify.

### 3. Safety and Security
We may disclose information when we believe it is necessary to:
- Protect the safety of our users or the public
- Investigate potential violations of our terms of service
- Prevent fraud or security threats

## Your Rights and Choices

### 1. Access and Correction
- You can view all comments on the public comment wall
- Comments cannot be edited or deleted after submission
- If you need to correct information, you may submit a new comment

### 2. Data Deletion
- Comments are stored indefinitely and cannot be automatically deleted
- If you believe your data should be deleted, please contact us
- We will review deletion requests on a case-by-case basis

### 3. Cookie Management
- You can control cookies through your browser settings
- Blocking cookies may affect your ability to use our website
- See our [Cookie Policy](/cookiepolicy.md) for more information

### 4. Opt-Out
- You can choose not to submit comments
- You can disable cookies in your browser
- You can stop using our website at any time

## Children's Privacy

Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.

If we discover that we have collected personal information from a child under 13, we will take steps to delete that information as soon as possible.

## International Data Transfers

Our website may be accessed from countries outside of your country of residence. By using our website, you consent to the transfer of your information to countries that may have different data protection laws than your country.

We take appropriate measures to ensure that your information is protected in accordance with this Privacy Policy, regardless of where it is processed.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:

- Posting the new Privacy Policy on this page
- Updating the "Last Updated" date at the top of this policy
- Providing notice through our website if the changes are significant

We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.

## Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

- **Issues**: [Contact us through GitHub](https://github.com/egorserdyuk/worstcaptcha/issues)

We will respond to your inquiry as soon as possible, typically within 30 days.

## Compliance

This Privacy Policy is designed to comply with:

- **General Data Protection Regulation (GDPR)**: EU regulation on data protection and privacy
- **California Consumer Privacy Act (CCPA)**: California law providing privacy rights to California residents
- **Children's Online Privacy Protection Act (COPPA)**: U.S. law protecting children's privacy online
- **ePrivacy Directive**: EU directive on privacy and electronic communications

## Definitions

- **Personal Information**: Any information that can be used to identify you, such as your name or IP address
- **Session**: A temporary storage of data that persists only while you are using our website
- **Cookies**: Small text files stored on your device by your browser
- **CSRF**: Cross-Site Request Forgery, a type of security attack
- **XSS**: Cross-Site Scripting, a type of security vulnerability
- **Rate Limiting**: Restrictions on the number of requests you can make to our website

## More Information

For more information about privacy and data protection, visit:

- [GDPR Official Website](https://gdpr.eu/)
- [CCPA Official Website](https://oag.ca.gov/privacy/ccpa)
- [COPPA Official Website](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)

---

*This Privacy Policy is effective as of March 24, 2026.*
