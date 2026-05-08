/**
 * Legal policy version strings — single source of truth.
 *
 * Used by:
 *   - Legal pages (display): /legal/terms, /legal/privacy, /legal/cookie-policy
 *   - users.terms_version (DB): records which version user accepted
 *   - completeOnboarding() (comparison): validates acceptance at signup
 *   - Middleware (re-acceptance gate): redirects on version mismatch
 *
 * Update these constants when policies change and redeploy.
 * CURRENT_TERMS_VERSION bump triggers re-acceptance for all existing users.
 */

/** SemVer string for the current Terms & Conditions document. */
export const CURRENT_TERMS_VERSION = "1.0.0";

/** Effective date of the current Terms & Conditions (set at Phase 19 launch). */
export const TERMS_EFFECTIVE_DATE = "2026-XX-XX"; // set at Phase 19 launch date

/** SemVer string for the current Privacy Policy document. */
export const CURRENT_PRIVACY_VERSION = "1.0.0";

/**
 * Version string for the current Cookie Consent schema.
 * Used in cookie_consent_record.consent_version to track which
 * cookie categories were presented when consent was collected.
 */
export const CURRENT_COOKIE_CONSENT_VERSION = "1.0";
