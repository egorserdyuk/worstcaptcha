/**
 * GDPR-Compliant Cookie Consent Configuration
 * Uses orestbida/cookieconsent library
 * 
 * This configuration provides:
 * - Clear information about cookie usage
 * - Granular consent options for different cookie categories
 * - Easy accept/reject all functionality
 * - Individual preference management
 * - Compliance with GDPR requirements
 */

import * as CookieConsent from 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.1.0/dist/cookieconsent.esm.js';

// Cookie category constants
const CAT_NECESSARY = "necessary";

CookieConsent.run({
    // GUI options
    guiOptions: {
        consentModal: {
            layout: 'box',
            position: 'bottom right',
            equalWeightButtons: true,
            flipButtons: false
        },
        preferencesModal: {
            layout: 'box',
            position: 'right',
            equalWeightButtons: true,
            flipButtons: false
        }
    },

    // Cookie categories configuration
    categories: {
        [CAT_NECESSARY]: {
            enabled: true,  // This category is enabled by default
            readOnly: true  // This category cannot be disabled
        }
    },

    // Language configuration
    language: {
        default: 'en',
        translations: {
            en: {
                consentModal: {
                    title: 'We use cookies 🍪',
                    description: 'This website uses essential cookies to ensure its proper operation. These cookies are necessary for the website to function and cannot be disabled.',
                    acceptAllBtn: 'Accept',
                    acceptNecessaryBtn: 'Reject',
                    showPreferencesBtn: 'Manage preferences',
                    footer: '<a href="https://github.com/egorserdyuk/worstcaptcha/docs/privacypolicy.md">Privacy Policy</a>\n<a href="https://github.com/egorserdyuk/worstcaptcha/docs/cookiepolicy.md">Cookie Policy</a>'
                },
                preferencesModal: {
                    title: 'Cookie preferences',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    savePreferencesBtn: 'Accept current selection',
                    closeIconLabel: 'Close modal',
                    serviceCounterLabel: 'Service|Services',
                    sections: [
                        {
                            title: 'Cookie usage',
                            description: 'We use essential cookies to ensure the basic functionalities of the website. These cookies are necessary for the website to function properly.'
                        },
                        {
                            title: 'Strictly necessary cookies',
                            description: 'These cookies are essential for the proper functioning of the website. Without these cookies, the website would not work properly. They cannot be disabled.',
                            linkedCategory: CAT_NECESSARY,
                            cookieTable: {
                                headers: {
                                    name: 'Name',
                                    domain: 'Service',
                                    description: 'Description',
                                    expiration: 'Expiration'
                                },
                                body: [
                                    {
                                        name: 'session',
                                        domain: 'Worst Captcha',
                                        description: 'Used to maintain user session state',
                                        expiration: 'Session'
                                    },
                                    {
                                        name: 'csrf_token',
                                        domain: 'Worst Captcha',
                                        description: 'Used for security - prevents cross-site request forgery attacks',
                                        expiration: 'Session'
                                    }
                                ]
                            }
                        },
                        {
                            title: 'More information',
                            description: 'For any queries in relation to our policy on cookies and your choices, please <a href="https://github.com/egorserdyuk/worstcaptcha" target="_blank" rel="noopener noreferrer">contact us</a>.'
                        }
                    ]
                }
            }
        }
    }
});
