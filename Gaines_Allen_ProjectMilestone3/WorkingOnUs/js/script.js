/* ==========================================================
   script.js — Working On Us
   Loaded on every page (with "defer", so the HTML is ready first).

   1. Setup          – flags that JavaScript is running
   2. Mobile menu    – hamburger button opens/closes the nav on phones
   3. Nav highlight  – marks the link for the current page
   4. FAQ accordion  – index.html and faq.html
   5. FAQ search     – faq.html (live filter as you type)
   6. Contact form   – contact.html (validation + character counter)
   7. Scroll reveal  – fades sections in as they scroll into view
   8. Back to top    – button appears after scrolling down

   Each section checks that its elements exist before running,
   so one shared file works on every page without errors.
   ========================================================== */


/* ----------------------------------------------------------
   1. SETUP
   Adding .js to <html> lets the CSS hide .reveal elements only
   when JavaScript is available to show them again.
   ---------------------------------------------------------- */
document.documentElement.classList.add('js');

// True if the visitor has asked their device for less animation
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ----------------------------------------------------------
   2. MOBILE MENU
   The hamburger button is only visible on small screens (CSS).
   Clicking it toggles .open on the nav and updates aria-expanded
   so screen readers know whether the menu is open.
   ---------------------------------------------------------- */
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.getElementById('site-nav');

if (navToggle && siteNav) {
    function setMenu(open) {
        siteNav.classList.toggle('open', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        setMenu(!isOpen);
    });

    // Close the menu with the Escape key and put focus back on the button
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && siteNav.classList.contains('open')) {
            setMenu(false);
            navToggle.focus();
        }
    });

    // If the window is resized up to desktop width, reset the menu
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) setMenu(false);
    });
}


/* ----------------------------------------------------------
   3. NAV HIGHLIGHT
   Compares each nav link's href to the current file name and
   adds .active (styled in style.css) to the matching link.
   ---------------------------------------------------------- */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

document.querySelectorAll('#site-nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page'); // tells screen readers too
    }
});


/* ----------------------------------------------------------
   4. FAQ ACCORDION
   Each .question-btn opens/closes the .answer right after it.
   ---------------------------------------------------------- */
const questionButtons = document.querySelectorAll('.question-btn');

questionButtons.forEach(button => {
    // Start closed; aria-expanded lets screen readers announce the state
    button.setAttribute('aria-expanded', 'false');

    button.addEventListener('click', () => {
        // Relies on the .answer <p> being the very next sibling in the HTML
        const answer = button.nextElementSibling;
        const isOpen = answer.classList.toggle('open'); // expands/collapses via max-height in style.css
        button.classList.toggle('open');                // rotates the "+" icon via style.css
        button.setAttribute('aria-expanded', String(isOpen));
    });
});


/* ----------------------------------------------------------
   5. FAQ SEARCH (faq.html)
   On every keystroke, hide the question cards whose text
   doesn't include what was typed, and show a count of matches.
   ---------------------------------------------------------- */
const faqFilter = document.getElementById('faq-filter');

if (faqFilter) {
    const cards = document.querySelectorAll('.patient-card');
    const countText = document.getElementById('faq-count');
    const emptyMessage = document.getElementById('faq-empty');

    faqFilter.addEventListener('input', () => {
        const search = faqFilter.value.trim().toLowerCase();
        let matches = 0;

        cards.forEach(card => {
            // Search both the question and its answer
            const isMatch = card.textContent.toLowerCase().includes(search);
            card.hidden = !isMatch;
            if (isMatch) {
                matches++;
                card.classList.add('in'); // make sure revealed cards aren't left faded
            }
        });

        // Only show the count while something is typed
        if (search === '') {
            countText.textContent = '';
        } else {
            countText.textContent = `${matches} of ${cards.length} questions match`;
        }
        emptyMessage.hidden = matches > 0;
    });
}


/* ----------------------------------------------------------
   6. CONTACT FORM VALIDATION (contact.html)
   Checks every field when the form is submitted, shows an error
   message under each field that fails, and only "sends" when
   everything passes. Fields are also re-checked when the user
   leaves them (blur) so mistakes show up right away.

   NOTE: there's no back end yet, so a valid form just shows a
   thank-you message. PHP will handle actually sending it in a
   later milestone.
   ---------------------------------------------------------- */
const form = document.getElementById('contact-form');

if (form) {
    // Simple pattern: something@something.something, no spaces
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /* Rules for each field: a test function that returns true when
       the value is OK, and the message to show when it isn't. */
    const rules = {
        name: {
            test: value => value.trim().length >= 2,
            message: 'Please enter your name.'
        },
        email: {
            test: value => emailPattern.test(value.trim()),
            message: 'Please enter a valid email address (like name@example.com).'
        },
        phone: {
            // Optional: blank is fine, otherwise it needs 10 digits
            // (or 11 starting with 1). Dashes, spaces and () are ignored.
            test: value => {
                const digits = value.replace(/\D/g, '');
                return digits.length === 0 ||
                       digits.length === 10 ||
                       (digits.length === 11 && digits.startsWith('1'));
            },
            message: 'Please enter a 10-digit phone number, or leave it blank.'
        },
        reason: {
            test: value => value !== '',
            message: 'Please choose a reason for reaching out.'
        },
        message: {
            test: value => value.trim().length >= 10,
            message: 'Please write a short message (at least 10 characters).'
        }
    };

    /* Show or clear the error for one field. Returns true if valid. */
    function validateField(field) {
        const rule = rules[field.name];
        if (!rule) return true;

        const errorSpan = document.getElementById(field.id + '-error');
        const isValid = rule.test(field.value);

        field.classList.toggle('invalid', !isValid);           // red border in style.css
        field.setAttribute('aria-invalid', String(!isValid));
        errorSpan.textContent = isValid ? '' : rule.message;

        return isValid;
    }

    const fields = form.querySelectorAll('input, select, textarea');
    const successMsg = document.getElementById('form-success');

    // Re-check a field when the user leaves it, and clear its
    // error as soon as they start fixing it.
    fields.forEach(field => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => {
            if (field.classList.contains('invalid')) validateField(field);
        });
    });

    /* Live character counter under the message box */
    const messageBox = document.getElementById('message');
    const counter = document.getElementById('message-count');

    function updateCounter() {
        const max = messageBox.maxLength;            // 500, from the HTML maxlength
        const used = messageBox.value.length;
        counter.textContent = `${used} / ${max}`;
        counter.classList.toggle('near-limit', used >= max * 0.9); // warn in the last 10%
    }

    if (messageBox && counter) {
        messageBox.addEventListener('input', updateCounter);
    }

    form.addEventListener('submit', event => {
        event.preventDefault(); // stop the page from reloading

        // Check every field (not stopping at the first error)
        let allValid = true;
        let firstInvalid = null;

        fields.forEach(field => {
            if (!validateField(field)) {
                allValid = false;
                if (!firstInvalid) firstInvalid = field;
            }
        });

        if (!allValid) {
            successMsg.textContent = '';
            firstInvalid.focus(); // jump the user to the first problem
            return;
        }

        // Everything passed: thank the user by first name and reset
        // (form.elements['name'] — plain form.name would be the form's own name attribute)
        const firstName = form.elements['name'].value.trim().split(' ')[0];
        successMsg.textContent = `Thank you, ${firstName}! We received your message and will reply within one business day.`;
        form.reset();
        if (counter) updateCounter(); // back to 0 / 500
    });
}


/* ----------------------------------------------------------
   7. SCROLL REVEAL
   IntersectionObserver tells us when an element scrolls into
   view; we add .in (style.css fades it up) and stop watching it.
   Skipped entirely for reduced-motion users.
   ---------------------------------------------------------- */
const revealItems = document.querySelectorAll('.reveal');

if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('in'));
} else {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                observer.unobserve(entry.target); // animate only once
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach(item => observer.observe(item));
}


/* ----------------------------------------------------------
   8. BACK TO TOP
   Shows the button once you've scrolled past 600px and scrolls
   back to the top when clicked.
   ---------------------------------------------------------- */
const toTopButton = document.querySelector('.to-top');

if (toTopButton) {
    window.addEventListener('scroll', () => {
        toTopButton.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });

    toTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        document.getElementById('main').focus({ preventScroll: true });
    });
}
