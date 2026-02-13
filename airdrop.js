// Airdrop Form Handler with Cookie-based Anti-spam

const AIRDROP_FORM = document.getElementById('airdrop-form');
const FORM_MESSAGE = document.getElementById('form-message');
const ENTITY_TYPE_SELECT = document.getElementById('entity-type');
const AGENT_FIELDS = document.getElementById('agent-fields');

const SPAM_COOKIE_NAME = 'airdrop_submitted';
const SPAM_COOKIE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Status Check Elements
const STATUS_WALLET = document.getElementById('status-wallet');
const CHECK_STATUS_BTN = document.getElementById('check-status-btn');
const STATUS_RESULT = document.getElementById('status-result');

// Initialize form
if (AIRDROP_FORM) {
    ENTITY_TYPE_SELECT.addEventListener('change', toggleAgentFields);
    AIRDROP_FORM.addEventListener('submit', handleFormSubmit);
    
    // Check for existing submission
    checkExistingSubmission();
}

// Initialize Status Check
if (CHECK_STATUS_BTN) {
    CHECK_STATUS_BTN.addEventListener('click', handleStatusCheck);
}

/**
 * Handle Status Check
 */
async function handleStatusCheck() {
    const wallet = STATUS_WALLET.value.trim();
    if (!wallet) return;

    CHECK_STATUS_BTN.disabled = true;
    STATUS_RESULT.style.display = 'none';

    try {
        const response = await fetch(`https://clawtip-verify.kay-594.workers.dev/api/status?wallet=${wallet}`);
        const result = await response.json();

        STATUS_RESULT.style.display = 'block';
        if (result.found) {
            STATUS_RESULT.style.background = 'rgba(39, 201, 63, 0.1)';
            STATUS_RESULT.style.border = '1px solid #27c93f';
            STATUS_RESULT.innerHTML = `
                <p style="color: #27c93f; font-weight: bold;">✅ Registration Found!</p>
                <p>Status: ${result.verified ? 'Verified' : 'Pending Verification'}</p>
                <p>Allocation: ${result.allocation} CLAW</p>
                <p>Type: ${result.type}</p>
            `;
        } else {
            STATUS_RESULT.style.background = 'rgba(255, 77, 77, 0.1)';
            STATUS_RESULT.style.border = '1px solid #ff4d4d';
            STATUS_RESULT.innerHTML = '<p style="color: #ff4d4d;">❌ No registration found for this wallet.</p>';
        }
    } catch (e) {
        STATUS_RESULT.style.display = 'block';
        STATUS_RESULT.innerHTML = 'Error checking status. Please try again.';
    } finally {
        CHECK_STATUS_BTN.disabled = false;
    }
}

/**
 * Show/hide agent-specific fields
 */
function toggleAgentFields() {
    const entityType = ENTITY_TYPE_SELECT.value;
    if (entityType === 'agent') {
        AGENT_FIELDS.style.display = 'block';
        // Mark agent fields as required
        document.getElementById('moltbook-handle').required = true;
        document.getElementById('github-repo').required = true;
    } else {
        AGENT_FIELDS.style.display = 'none';
        // Clear and unmark agent fields
        document.getElementById('moltbook-handle').required = false;
        document.getElementById('github-repo').required = false;
        document.getElementById('moltbook-handle').value = '';
        document.getElementById('github-repo').value = '';
        document.getElementById('reddit-handle').value = '';
    }
}

/**
 * Validate form fields
 */
function validateForm() {
    clearErrors();
    const form = AIRDROP_FORM;
    let isValid = true;

    const email = form.email.value.trim();
    const wallet = form.wallet.value.trim();
    const entityType = form.entityType.value;
    const terms = form.terms.checked;

    // Email validation
    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email');
        isValid = false;
    }

    // Wallet validation (basic Solana wallet format)
    if (!wallet) {
        showFieldError('wallet', 'Wallet address is required');
        isValid = false;
    } else if (!isValidSolanaWallet(wallet)) {
        showFieldError('wallet', 'Invalid Solana wallet address');
        isValid = false;
    }

    // Entity type validation
    if (!entityType) {
        showFieldError('entity-type', 'Please select if you are human or agent');
        isValid = false;
    }

    // Agent-specific validation
    if (entityType === 'agent') {
        const moltbookHandle = form.moltbookHandle.value.trim();
        const githubRepo = form.githubRepo.value.trim();

        if (!moltbookHandle) {
            showFieldError('moltbook-handle', 'Moltbook handle is required for agents');
            isValid = false;
        }

        if (!githubRepo) {
            showFieldError('github-repo', 'GitHub repository link is required for agents');
            isValid = false;
        } else if (!isValidUrl(githubRepo)) {
            showFieldError('github-repo', 'Please provide a valid repository URL');
            isValid = false;
        }
    }

    // Terms validation
    if (!terms) {
        showFieldError('terms', 'You must agree to the terms');
        isValid = false;
    }

    return isValid;
}

/**
 * Show field error
 */
function showFieldError(fieldId, message) {
    const group = document.getElementById(fieldId).closest('.form-group');
    if (group) {
        group.classList.add('error');
        const errorText = group.querySelector('.error-text');
        if (errorText) {
            errorText.textContent = message;
        }
    }
}

/**
 * Clear all errors
 */
function clearErrors() {
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('error');
        const errorText = group.querySelector('.error-text');
        if (errorText) {
            errorText.textContent = '';
        }
    });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate Solana wallet address (43-44 chars base58)
 * Base58 excludes: 0 (zero), O (capital o), I (capital i), l (lowercase L)
 */
function isValidSolanaWallet(wallet) {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
    return base58Regex.test(wallet);
}

/**
 * Validate URL format
 */
function isValidUrl(urlString) {
    try {
        new URL(urlString.startsWith('http') ? urlString : 'https://' + urlString);
        return true;
    } catch {
        return false;
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
        showMessage('Please fix the errors above', 'error');
        return;
    }

    // Check for spam
    if (hasRecentSubmission()) {
        showMessage('You have already submitted within the last 24 hours. Please check your email for verification link.', 'info');
        return;
    }

    // Disable submit button
    const submitBtn = AIRDROP_FORM.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
        // Prepare form data
        const formData = new FormData(AIRDROP_FORM);
        const data = Object.fromEntries(formData);
        console.log('Submitting airdrop data:', data);

        // Submit to backend (Cloudflare Worker)
        const response = await fetch('https://clawtip-airdrop.kay-594.workers.dev/api/airdrop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        console.log('Worker response status:', response.status);
        const result = await response.json();
        console.log('Worker result:', result);

        if (response.ok) {
            // Set spam cookie
            setSpamCookie();

            // Show success message
            const tweetText = encodeURIComponent("I just joined the @clawtipbot agent economy! 🦞\n\nClaim your airdrop at clawtip.me and help build the future of autonomous agent tipping. #CLAW #Solana #AI");
            const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

            showMessage(
                `<div>
                    <p style="margin-bottom: 1rem;">✅ Submission received! Your wallet has been added to the airdrop list.</p>
                    <p style="font-size: 0.9rem; color: var(--secondary); margin-bottom: 1.5rem;">🚀 Want a 50% Bonus? Share your submission on X!</p>
                    <a href="${tweetUrl}" target="_blank" class="btn btn-primary" style="background: #1DA1F2; padding: 0.5rem 1rem; font-size: 0.8rem; box-shadow: none;">Tweet to Verify & Get Bonus</a>
                </div>`,
                'success'
            );

            // Reset form
            AIRDROP_FORM.reset();
            AGENT_FIELDS.style.display = 'none';
        } else {
            showMessage(result.error || 'Submission failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showMessage('Network error. Please try again later.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * Display form message
 */
function showMessage(message, type = 'info') {
    FORM_MESSAGE.textContent = message;
    FORM_MESSAGE.className = `form-message show ${type}`;
    FORM_MESSAGE.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Set spam prevention cookie
 */
function setSpamCookie() {
    const expiry = new Date(Date.now() + SPAM_COOKIE_DURATION);
    document.cookie = `${SPAM_COOKIE_NAME}=1; expires=${expiry.toUTCString()}; path=/; SameSite=Strict`;
}

/**
 * Check if user has recently submitted
 */
function hasRecentSubmission() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        if (cookie.trim().startsWith(SPAM_COOKIE_NAME)) {
            return true;
        }
    }
    return false;
}

/**
 * Check for existing submission on page load
 */
function checkExistingSubmission() {
    if (hasRecentSubmission()) {
        showMessage('You have already submitted. Verification email has been sent. Please check your inbox.', 'info');
        // Optionally disable the form
        const inputs = AIRDROP_FORM.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => input.disabled = true);
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateForm,
        isValidEmail,
        isValidSolanaWallet,
        isValidUrl,
        setSpamCookie,
        hasRecentSubmission
    };
}
