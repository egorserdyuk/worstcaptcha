/**
 * Comments functionality for Worst Captcha
 * Handles comment loading and display
 */

// This file is kept minimal as most functionality is in captcha.js
// It can be extended for additional comment features

document.addEventListener('DOMContentLoaded', () => {
    // Initialize comments on page load
    if (window.captcha) {
        window.captcha.loadComments();
    }
});
