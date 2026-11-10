/* ==========================================================
   script.js — Working On Us
   Loaded on every page (with "defer", so the HTML is ready first).

    1. Setup           – flags that JavaScript is running
    2. Mobile menu     – hamburger button opens/closes the nav on phones
    3. Dropdown menus  – Services / About submenus
    4. Nav highlight   – marks the link for the current page
    5. Modal           – "Book an appointment" pop-up
    6. FAQ accordion   – questions open/close
    7. FAQ search      – live filter as you type (faq.html)
    8. Contact form    – validation, character counter, server messages
    9. Carousel        – programs slider on the homepage
   10. Scroll reveal   – fades sections in as they scroll into view
   11. Back to top     – button appears after scrolling down

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

function setMenu(open) {
    if (!navToggle || !siteNav) return;
    siteNav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
        setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    // If the window is resized up to desktop width, reset the menu
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) setMenu(false);
    });
}


/* ----------------------------------------------------------
   3. DROPDOWN MENUS
   On desktop the submenu opens on hover (CSS) or with the ▾
   button; on phones only the ▾ button opens it. Clicking
   outside or pressing Escape closes any open submenu.
   ---------------------------------------------------------- */
const dropdownItems = document.querySelectorAll('.has-dropdown');

function closeDropdowns(except = null) {
    dropdownItems.forEach(item => {
        if (item === except) return;
        item.classList.remove('open');
        item.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
}

dropdownItems.forEach(item => {
    const toggle = item.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', event => {
        event.stopPropagation();                      // don't let the document click handler close it
        const open = !item.classList.contains('open');
        closeDropdowns(item);                         // only one submenu open at a time
        item.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
    });
});

// Click anywhere else closes submenus
document.addEventListener('click', event => {
    if (!event.target.closest('.has-dropdown')) closeDropdowns();
});

// Escape closes submenus first, then the mobile menu
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openItem = document.querySelector('.has-dropdown.open');
    if (openItem) {
        closeDropdowns();
        openItem.querySelector('.dropdown-toggle').focus();
    } else if (siteNav && siteNav.classList.contains('open') && !document.querySelector('.modal:not([hidden])')) {
        setMenu(false);
        navToggle.focus();
    }
});


/* ----------------------------------------------------------
   4. NAV HIGHLIGHT
   Compares each nav link's href to the current file name and
   adds .active (styled in style.css). If the page is inside a
   dropdown, its parent link ("Services"/"About") is marked too.
   ---------------------------------------------------------- */
let currentPage = window.location.pathname.split('/').pop() || 'index.html';
// Portal pages count as the "Patient Portal" link
// (dashboard.html in the static demo; dashboard/register/install.php in the XAMPP version)
if (currentPage === 'dashboard.html') currentPage = 'portal.html';
if (['dashboard.php', 'register.php', 'install.php', 'index.php'].includes(currentPage)) currentPage = 'login.php';

document.querySelectorAll('#site-nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page'); // tells screen readers too
        const parent = link.closest('.has-dropdown');
        if (parent) parent.querySelector(':scope > a').classList.add('active');
    }
});


/* ----------------------------------------------------------
   5. MODAL ("Book an appointment" pop-up)
   - Any element with data-open-modal="book-modal" opens it.
     Those are links to contact.html, so without JavaScript
     they still go somewhere useful.
   - Focus moves into the modal and stays there (a "focus
     trap") until it closes; then it returns to the button
     that opened it. Escape, the × button, or clicking the
     dark background closes it.
   ---------------------------------------------------------- */
let lastFocused = null;

function getFocusable(container) {
    return Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
}

function openModal(modal) {
    lastFocused = document.activeElement;
    setMenu(false);                       // close the phone menu if it was open
    modal.hidden = false;
    document.body.classList.add('modal-open');
    // Focus the first option (the item after the × close button)
    const focusable = getFocusable(modal);
    (focusable[1] || focusable[0]).focus();
}

function closeModal(modal) {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocused) lastFocused.focus();
}

document.querySelectorAll('[data-open-modal]').forEach(trigger => {
    trigger.addEventListener('click', event => {
        const modal = document.getElementById(trigger.dataset.openModal);
        if (!modal) return;                // no modal on this page: follow the link instead
        event.preventDefault();
        openModal(modal);
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    // × button and backdrop
    modal.querySelectorAll('[data-close-modal]').forEach(el => {
        el.addEventListener('click', () => closeModal(modal));
    });

    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            closeModal(modal);
            return;
        }
        // Focus trap: Tab from the last item goes to the first, Shift+Tab the other way
        if (event.key === 'Tab') {
            const items = getFocusable(modal);
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    // Picking an option closes the pop-up (the link then opens as normal)
    modal.querySelectorAll('.modal-option').forEach(option => {
        option.addEventListener('click', () => {
            modal.hidden = true;
            document.body.classList.remove('modal-open');
        });
    });
});


/* ----------------------------------------------------------
   6. FAQ ACCORDION
   Each .question-btn opens/closes the .answer right after it.
   ---------------------------------------------------------- */
document.querySelectorAll('.question-btn').forEach(button => {
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
   7. FAQ SEARCH (faq.html)
   On every keystroke, hide the question cards whose text
   doesn't include what was typed, and show a count of matches.
   ---------------------------------------------------------- */
const faqFilter = document.getElementById('faq-filter');

if (faqFilter) {
    const cards = document.querySelectorAll('.Patients .patient-card');
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

        countText.textContent = search === '' ? '' : `${matches} of ${cards.length} questions match`;
        emptyMessage.hidden = matches > 0;
    });
}


/* ----------------------------------------------------------
   8. CONTACT FORM (contact.html)
   Checks every field on submit, shows an error under each
   field that fails, and re-checks a field when you leave it.

   - Static version: a valid form shows a thank-you message.
   - XAMPP version (form has data-server="true"): a valid form
     is sent to php/contact-submit.php, which checks it again,
     saves it to MySQL, and comes back to contact.html?sent=1.
   ---------------------------------------------------------- */
const form = document.getElementById('contact-form');

if (form) {
    // Simple pattern: something@something.something, no spaces
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /* Rules for each field (keyed by its name attribute): a test that
       returns true when the value is OK, and the message when it isn't. */
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
            // Optional: blank is fine, otherwise 10 digits (or 11 starting with 1)
            test: value => {
                const digits = value.replace(/\D/g, '');
                return digits.length === 0 || digits.length === 10 ||
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

    // Only the visible fields (not the hidden honeypot)
    const fields = Array.from(form.querySelectorAll('input, select, textarea'))
        .filter(field => rules[field.name]);
    const successMsg = document.getElementById('form-success');

    fields.forEach(field => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => {
            if (field.classList.contains('invalid')) validateField(field);
        });
    });

    /* Live character counter under the message box */
    const messageBox = document.getElementById('message-text');
    const counter = document.getElementById('message-count');

    function updateCounter() {
        const max = messageBox.maxLength;            // 500, from the HTML maxlength
        const used = messageBox.value.length;
        counter.textContent = `${used} / ${max}`;
        counter.classList.toggle('near-limit', used >= max * 0.9); // warn in the last 10%
    }

    if (messageBox && counter) messageBox.addEventListener('input', updateCounter);

    /* Read the page address for messages from PHP (?sent=1 / ?error=...)
       and for a preselected program (?program=family-restoration) */
    const params = new URLSearchParams(window.location.search);
    const serverMsg = document.getElementById('form-server-msg');

    if (params.get('sent') === '1') {
        serverMsg.textContent = 'Thank you! Your message was received. We reply within one business day.';
        serverMsg.hidden = false;
    } else if (params.get('error')) {
        // textContent (not innerHTML) so nothing in the URL can run as code
        serverMsg.textContent = 'Something in the form needs another look: ' + params.get('error');
        serverMsg.classList.add('error');
        serverMsg.hidden = false;
    }

    if (params.get('program')) {
        form.elements['reason'].value = 'program';
        const programName = params.get('program').replace(/-/g, ' ');
        messageBox.value = `I'd like to learn more about the ${programName} program.`;
        updateCounter();
    }

    form.addEventListener('submit', event => {
        // Check every field (not stopping at the first error)
        let firstInvalid = null;
        fields.forEach(field => {
            if (!validateField(field) && !firstInvalid) firstInvalid = field;
        });

        if (firstInvalid) {
            event.preventDefault();       // stop the submit
            successMsg.textContent = '';
            firstInvalid.focus();         // jump to the first problem
            return;
        }

        // XAMPP version: let the browser send the form to PHP
        if (form.dataset.server === 'true') return;

        // Static version: no server, so thank the user and reset
        event.preventDefault();
        const firstName = form.elements['name'].value.trim().split(' ')[0];
        successMsg.textContent = `Thank you, ${firstName}! We received your message and will reply within one business day.`;
        form.reset();
        if (counter) updateCounter();
    });
}


/* ----------------------------------------------------------
   9. CAROUSEL (programs slider on the homepage)
   All slides sit in one row; we move the row left by
   100% × the slide number with translateX.
   - Arrow buttons, dots, swipe on touch screens, and the
     keyboard ←/→ keys when the carousel has focus
   - Plays automatically every 7 seconds, but pauses on hover,
     on keyboard focus, with the pause button, and never
     autoplays for reduced-motion users
   ---------------------------------------------------------- */
const carousel = document.querySelector('.carousel');

if (carousel) {
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.slide'));
    const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));
    const section = carousel.closest('.carousel-section');
    const pauseBtn = section.querySelector('[data-carousel="pause"]');
    let index = 0;
    let timer = null;
    let userPaused = reduceMotion;

    function goTo(newIndex) {
        // Wrap around: after the last slide comes the first
        index = (newIndex + slides.length) % slides.length;
        track.style.transform = `translateX(-${index * 100}%)`;

        slides.forEach((slide, i) => {
            const current = i === index;
            slide.setAttribute('aria-hidden', String(!current));
            // Links on hidden slides shouldn't be reachable with Tab
            slide.querySelectorAll('a, button').forEach(el => { el.tabIndex = current ? 0 : -1; });
        });
        dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    }

    function stop() {
        clearInterval(timer);
        timer = null;
    }

    function start() {
        stop();
        if (!userPaused) timer = setInterval(() => goTo(index + 1), 7000);
    }

    section.querySelector('[data-carousel="prev"]').addEventListener('click', () => { goTo(index - 1); start(); });
    section.querySelector('[data-carousel="next"]').addEventListener('click', () => { goTo(index + 1); start(); });
    dots.forEach(dot => dot.addEventListener('click', () => { goTo(Number(dot.dataset.slide)); start(); }));

    // Pause / play button
    function updatePauseButton() {
        pauseBtn.textContent = userPaused ? '▶' : '❚❚';
        pauseBtn.setAttribute('aria-label', userPaused ? 'Play automatic slides' : 'Pause automatic slides');
    }
    pauseBtn.addEventListener('click', () => {
        userPaused = !userPaused;
        updatePauseButton();
        if (userPaused) { stop(); } else { start(); }
    });

    // Pause while the mouse is over it or something inside has keyboard focus
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);

    // Left/right arrow keys
    carousel.tabIndex = 0;
    carousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') goTo(index - 1);
        if (event.key === 'ArrowRight') goTo(index + 1);
    });

    // Swipe: remember where the finger (or mouse) went down, compare where it lifts.
    // pointerup is watched on the whole window so a swipe that ends outside the
    // slider still counts, and dragstart is blocked so dragging text or an image
    // doesn't cancel the swipe.
    let startX = null;
    const viewport = carousel.querySelector('.carousel-viewport');
    viewport.addEventListener('dragstart', event => event.preventDefault());
    viewport.addEventListener('pointerdown', event => { startX = event.clientX; });
    window.addEventListener('pointerup', event => {
        if (startX === null) return;
        const moved = event.clientX - startX;
        startX = null;
        if (Math.abs(moved) > 50) {           // ignore tiny movements (taps and clicks)
            goTo(moved < 0 ? index + 1 : index - 1);
            start();
        }
    });
    window.addEventListener('pointercancel', () => { startX = null; });

    updatePauseButton();
    goTo(0);
    start();
}


/* ----------------------------------------------------------
   10. SCROLL REVEAL
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
   11. BACK TO TOP
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
        const main = document.getElementById('main');
        if (main) main.focus({ preventScroll: true });
    });
}
