/* ==========================================================
   portal.js — Working On Us DEMO patient portal
   Loaded only on portal.html and dashboard.html.

   !! DEMO ONLY !!
   This portal runs entirely in the browser with made-up data.
   Checking a password in JavaScript is NOT secure: anyone can
   open the file and read it. A real patient portal must:
     - check logins on a server (PHP) with hashed passwords
     - store records in an encrypted database
     - run on HIPAA-compliant hosting with a signed BAA
   That's why the live practice uses its official portal and
   this one only exists to show the design and JavaScript.

   1. Helpers        – safe storage, dates, money, escaping
   2. Login page     – validation, show/hide password, demo fill
   3. Dashboard      – sign-in check + sample data
   4. Rendering      – draws each tab from the data
   5. Tabs           – click + keyboard navigation
   6. Actions        – cancel/request visits, read/reply messages,
                       complete forms, pay, sign out
   ========================================================== */


/* ----------------------------------------------------------
   1. HELPERS
   ---------------------------------------------------------- */

// The one demo account (see the security note above)
const DEMO_ACCOUNT = {
    email: 'demo@workingonus.com',
    password: 'Demo1234',
    firstName: 'Jordan',
    lastName: 'Rivera'
};

const SESSION_KEY = 'wou-demo-session';

/* sessionStorage keeps the "signed in" flag only until the tab closes.
   It can throw an error in some privacy modes, so every use is wrapped
   in try/catch and the demo still works without it. */
function saveSession(value) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); return true; }
    catch (e) { return false; }
}

function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch (e) { return undefined; } // undefined = storage not available
}

function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to clear */ }
}

/* Builds a date X days from today at a set time, so the sample
   appointments always look current no matter when it's opened. */
function daysFromNow(days, hour = 9, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d;
}

// Moves weekend dates to the next Monday (the office is open Mon–Fri)
function nextWeekday(date) {
    const d = new Date(date);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
}

const formatDate = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const formatTime = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const formatMoney = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/* Anything a user types is escaped before it goes into innerHTML,
   so text like <script> shows as plain text instead of running.
   (This is how you prevent XSS — cross-site scripting.) */
function escapeHTML(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* Shows a short pop-up message at the bottom of the screen.
   role="status" on #toast means screen readers announce it too. */
let toastTimer;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}


/* ----------------------------------------------------------
   2. LOGIN PAGE (portal.html)
   ---------------------------------------------------------- */
const loginForm = document.getElementById('login-form');

if (loginForm) {
    // Already signed in this session? Skip straight to the dashboard.
    if (loadSession()) window.location.replace('dashboard.html');

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');

    // Show one field's error (or clear it when message is '')
    function setFieldError(input, message) {
        document.getElementById(input.id + '-error').textContent = message;
        input.classList.toggle('invalid', message !== '');
        input.setAttribute('aria-invalid', String(message !== ''));
    }

    // Show/hide password: switch the input between type="password" and "text"
    const showPass = document.getElementById('show-pass');
    showPass.addEventListener('click', () => {
        const showing = passwordInput.type === 'text';
        passwordInput.type = showing ? 'password' : 'text';
        showPass.textContent = showing ? 'Show' : 'Hide';
        showPass.setAttribute('aria-pressed', String(!showing));
    });

    // "Fill these in for me" types the demo account into the form
    document.getElementById('fill-demo').addEventListener('click', () => {
        emailInput.value = DEMO_ACCOUNT.email;
        passwordInput.value = DEMO_ACCOUNT.password;
        setFieldError(emailInput, '');
        setFieldError(passwordInput, '');
        loginError.textContent = '';
        loginForm.querySelector('button[type="submit"]').focus();
    });

    // "Forgot your password?" reveals a short explanation
    const forgotBtn = document.getElementById('forgot-btn');
    const forgotMsg = document.getElementById('forgot-msg');
    forgotBtn.addEventListener('click', () => {
        forgotMsg.hidden = !forgotMsg.hidden;
        forgotBtn.setAttribute('aria-expanded', String(!forgotMsg.hidden));
    });

    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        loginError.textContent = '';

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let ok = true;

        // Step 1: are the fields filled in correctly?
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFieldError(emailInput, 'Please enter a valid email address.');
            ok = false;
        } else {
            setFieldError(emailInput, '');
        }

        if (password === '') {
            setFieldError(passwordInput, 'Please enter your password.');
            ok = false;
        } else {
            setFieldError(passwordInput, '');
        }

        if (!ok) {
            loginForm.querySelector('.invalid').focus();
            return;
        }

        // Step 2: do they match the demo account? (email ignores capital letters)
        if (email.toLowerCase() !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
            loginError.textContent = "That email and password don't match the demo account. Check the account details below.";
            passwordInput.value = '';
            passwordInput.focus();
            return;
        }

        // Success: remember who signed in, then open the dashboard
        saveSession({ firstName: DEMO_ACCOUNT.firstName, lastName: DEMO_ACCOUNT.lastName });
        window.location.href = 'dashboard.html';
    });
}


/* ----------------------------------------------------------
   3. DASHBOARD (dashboard.html) — sign-in check + sample data
   ---------------------------------------------------------- */
const portalLayout = document.querySelector('.portal-layout');

if (portalLayout) {
    const session = loadSession();

    // Not signed in? Send them to the login page.
    // (null = storage works but nobody signed in; undefined = storage blocked,
    //  in which case we let the demo open anyway.)
    if (session === null) {
        window.location.replace('portal.html');
    }

    const patient = session || { firstName: DEMO_ACCOUNT.firstName, lastName: DEMO_ACCOUNT.lastName };

    /* ---- Sample data (all made up) ----
       In the PHP milestone this is what the server would send back
       from the database for the signed-in patient. */
    const data = {
        appointments: [
            { id: 1, type: 'Medication management follow-up', date: nextWeekday(daysFromNow(4, 10, 30)), format: 'In person', status: 'Confirmed' },
            { id: 2, type: 'Family counseling session', date: nextWeekday(daysFromNow(11, 15, 0)), format: 'Telehealth', status: 'Confirmed' },
            { id: 3, type: 'Medication management follow-up', date: nextWeekday(daysFromNow(-24, 10, 0)), format: 'In person', status: 'Completed' },
            { id: 4, type: 'First visit', date: nextWeekday(daysFromNow(-52, 9, 0)), format: 'In person', status: 'Completed' }
        ],
        messages: [
            { id: 1, from: 'Front Desk', subject: 'Appointment reminder', date: daysFromNow(-1, 14, 5), unread: true,
              body: 'Hi Jordan, this is a friendly reminder about your upcoming medication management visit. Reply here or call (910) 257-2815 if you need to reschedule.', replies: [] },
            { id: 2, from: 'Care Team', subject: 'Forms before your family session', date: daysFromNow(-3, 11, 20), unread: true,
              body: 'Before your family counseling session, please complete the Family Information Form in the Forms tab. It takes about 10 minutes.', replies: [] },
            { id: 3, from: 'Billing Office', subject: 'Your statement is ready', date: daysFromNow(-20, 9, 45), unread: false,
              body: 'Your latest statement is available in the Billing tab. Call our office with any questions about your balance.', replies: [] }
        ],
        forms: [
            { id: 1, name: 'New Patient Intake', done: true },
            { id: 2, name: 'Consent for Telehealth Services', done: true },
            { id: 3, name: 'Family Information Form', done: false },
            { id: 4, name: 'Release of Information (optional)', done: false }
        ],
        statements: [
            { id: 1, date: daysFromNow(-20), description: 'Office visit — copay', amount: 25, paid: false },
            { id: 2, date: daysFromNow(-50), description: 'First visit — copay', amount: 25, paid: true }
        ],
        nextId: 100 // for new appointments and replies
    };

    // Small "look-up" helpers used by the render functions
    const now = () => new Date();
    const upcoming = () => data.appointments
        .filter(a => a.date > now() && a.status !== 'Cancelled')
        .sort((a, b) => a.date - b.date);
    const past = () => data.appointments
        .filter(a => a.date <= now() || a.status === 'Cancelled')
        .sort((a, b) => b.date - a.date);
    const unreadCount = () => data.messages.filter(m => m.unread).length;
    const formsToDo = () => data.forms.filter(f => !f.done).length;
    const balance = () => data.statements.filter(s => !s.paid).reduce((sum, s) => sum + s.amount, 0);


    /* ----------------------------------------------------------
       4. RENDERING — each function redraws one part of the page
       from the data above. After any change we call renderAll().
       ---------------------------------------------------------- */

    function renderUser() {
        document.getElementById('user-name').textContent = `${patient.firstName} ${patient.lastName}`;
        document.getElementById('user-initials').textContent = patient.firstName[0] + patient.lastName[0];
        document.getElementById('welcome-heading').textContent = `Welcome back, ${patient.firstName}`;
    }

    // Little number bubbles on the tabs
    function renderBadges() {
        const set = (key, value) => {
            const badge = document.getElementById('badge-' + key);
            badge.textContent = value || '';
            badge.hidden = !value;
        };
        set('appointments', upcoming().length);
        set('messages', unreadCount());
        set('forms', formsToDo());
        set('billing', balance() > 0 ? '!' : '');
    }

    // Four summary cards; each button jumps to its tab
    function renderOverview() {
        const next = upcoming()[0];
        document.getElementById('overview-cards').innerHTML = `
            <article class="overview-card">
                <h2 class="ov-label">Next appointment</h2>
                ${next
                    ? `<p class="ov-big">${formatDate(next.date)}</p>
                       <p>${formatTime(next.date)} · ${escapeHTML(next.type)}<br>${next.format}</p>`
                    : '<p class="ov-big">None scheduled</p><p>Request one any time.</p>'}
                <button type="button" class="text-btn" data-go="appointments">View appointments →</button>
            </article>
            <article class="overview-card">
                <h2 class="ov-label">Messages</h2>
                <p class="ov-big">${unreadCount()} unread</p>
                <p>From our front desk and care team.</p>
                <button type="button" class="text-btn" data-go="messages">Open messages →</button>
            </article>
            <article class="overview-card">
                <h2 class="ov-label">Forms</h2>
                <p class="ov-big">${formsToDo()} to complete</p>
                <p>${formsToDo() ? 'Finish these before your next visit.' : "You're all caught up."}</p>
                <button type="button" class="text-btn" data-go="forms">View forms →</button>
            </article>
            <article class="overview-card">
                <h2 class="ov-label">Balance</h2>
                <p class="ov-big">${formatMoney(balance())}</p>
                <p>${balance() > 0 ? 'Payment due.' : 'Nothing due right now.'}</p>
                <button type="button" class="text-btn" data-go="billing">View billing →</button>
            </article>`;
    }

    // One <li> for an appointment. Upcoming ones get a Cancel button.
    function appointmentItem(a, canCancel) {
        const statusClass = a.status.toLowerCase();
        return `
            <li class="portal-item" data-id="${a.id}">
                <div class="item-date">
                    <span class="item-month">${a.date.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span class="item-day">${a.date.getDate()}</span>
                </div>
                <div class="item-body">
                    <p class="item-title">${escapeHTML(a.type)}</p>
                    <p class="item-meta">${formatDate(a.date)} · ${a.status === 'Requested' ? escapeHTML(a.timeOfDay) : formatTime(a.date)} · ${a.format}</p>
                </div>
                <span class="status status-${statusClass}">${a.status}</span>
                ${canCancel ? `
                <div class="item-actions">
                    <button type="button" class="btn-small" data-action="ask-cancel">Cancel</button>
                </div>` : ''}
            </li>`;
    }

    function renderAppointments() {
        const up = upcoming();
        const old = past();
        document.getElementById('upcoming-list').innerHTML = up.length
            ? up.map(a => appointmentItem(a, true)).join('')
            : '<li class="empty-state">No upcoming appointments.</li>';
        document.getElementById('past-list').innerHTML = old.length
            ? old.map(a => appointmentItem(a, false)).join('')
            : '<li class="empty-state">Nothing here yet.</li>';
    }

    // Left column: list of messages. Unread ones are bold with a dot.
    let openMessageId = null;

    function renderMessageList() {
        document.getElementById('message-list').innerHTML = data.messages.map(m => `
            <li>
                <button type="button" class="message-item ${m.unread ? 'unread' : ''} ${m.id === openMessageId ? 'selected' : ''}" data-message="${m.id}">
                    <span class="msg-from">${escapeHTML(m.from)}${m.unread ? ' <span class="dot" aria-label="unread"></span>' : ''}</span>
                    <span class="msg-subject">${escapeHTML(m.subject)}</span>
                    <span class="msg-date">${formatDate(m.date)}</span>
                </button>
            </li>`).join('');
    }

    // Right column: the open message, its replies, and a reply box
    function renderReader() {
        const reader = document.getElementById('message-reader');
        const m = data.messages.find(msg => msg.id === openMessageId);
        if (!m) {
            reader.innerHTML = '<p class="empty-state">Choose a message to read it.</p>';
            return;
        }
        reader.innerHTML = `
            <h3 class="reader-subject">${escapeHTML(m.subject)}</h3>
            <p class="reader-meta">From ${escapeHTML(m.from)} · ${formatDate(m.date)} at ${formatTime(m.date)}</p>
            <p class="reader-body">${escapeHTML(m.body)}</p>
            ${m.replies.map(r => `
                <div class="reply">
                    <p class="reader-meta">You · ${formatDate(r.date)} at ${formatTime(r.date)}</p>
                    <p>${escapeHTML(r.text)}</p>
                </div>`).join('')}
            <form class="reply-form" id="reply-form" novalidate>
                <label for="reply-text">Reply</label>
                <textarea id="reply-text" maxlength="500" placeholder="Write a non-urgent reply (no medical details in this demo)"></textarea>
                <span class="error-msg" id="reply-text-error" aria-live="polite"></span>
                <button type="submit" class="btn btn-primary">Send Reply</button>
            </form>`;
    }

    function renderForms() {
        document.getElementById('forms-list').innerHTML = data.forms.map(f => `
            <li class="portal-item" data-id="${f.id}">
                <div class="item-icon" aria-hidden="true">${f.done ? '✅' : '📝'}</div>
                <div class="item-body">
                    <p class="item-title">${escapeHTML(f.name)}</p>
                    <p class="item-meta">${f.done ? 'Completed' : 'Not started'}</p>
                </div>
                <span class="status ${f.done ? 'status-completed' : 'status-requested'}">${f.done ? 'Done' : 'To do'}</span>
                ${f.done ? '' : `
                <div class="item-actions">
                    <button type="button" class="btn-small" data-action="complete-form">Mark complete</button>
                </div>`}
            </li>`).join('');
    }

    function renderBilling() {
        const due = balance();
        document.getElementById('balance-card').innerHTML = `
            <div>
                <p class="ov-label">Current balance</p>
                <p class="balance-amount">${formatMoney(due)}</p>
            </div>
            ${due > 0
                ? '<button type="button" class="btn btn-primary" id="pay-btn">Pay Now (demo)</button>'
                : '<p class="paid-note">✅ You\'re all paid up.</p>'}`;

        document.getElementById('statements-body').innerHTML = data.statements.map(s => `
            <tr>
                <td>${formatDate(s.date)}</td>
                <td>${escapeHTML(s.description)}</td>
                <td>${formatMoney(s.amount)}</td>
                <td><span class="status ${s.paid ? 'status-completed' : 'status-requested'}">${s.paid ? 'Paid' : 'Due'}</span></td>
            </tr>`).join('');
    }

    function renderAll() {
        renderBadges();
        renderOverview();
        renderAppointments();
        renderMessageList();
        renderReader();
        renderForms();
        renderBilling();
    }


    /* ----------------------------------------------------------
       5. TABS
       Only one panel shows at a time. Arrow keys move between tabs
       (the standard keyboard pattern for ARIA tabs), and the URL
       hash (#messages) lets a link open a specific tab.
       ---------------------------------------------------------- */
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

    function selectTab(key, moveFocus = false) {
        tabs.forEach(t => {
            const selected = t.dataset.tab === key;
            t.setAttribute('aria-selected', String(selected));
            t.tabIndex = selected ? 0 : -1;               // only the active tab is in the Tab order
            document.getElementById('panel-' + t.dataset.tab).hidden = !selected;
            if (selected && moveFocus) t.focus();
        });
        history.replaceState(null, '', '#' + key);        // update the URL without jumping
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectTab(tab.dataset.tab));

        tab.addEventListener('keydown', event => {
            let next = null;
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            if (next !== null) {
                event.preventDefault();
                selectTab(tabs[next].dataset.tab, true);
            }
        });
    });


    /* ----------------------------------------------------------
       6. ACTIONS
       The lists are redrawn often, so instead of adding a listener
       to every button we add ONE listener to the main area and
       check what was clicked ("event delegation").
       ---------------------------------------------------------- */
    document.querySelector('.portal-main').addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const item = button.closest('.portal-item');
        const id = item ? Number(item.dataset.id) : null;

        // Overview card links: jump to a tab
        if (button.dataset.go) {
            selectTab(button.dataset.go, true);
            return;
        }

        // Cancel, step 1: swap the button for an inline "are you sure?"
        // (used instead of confirm() pop-ups, which block the page)
        if (button.dataset.action === 'ask-cancel') {
            button.parentElement.innerHTML = `
                <span class="confirm-text">Cancel this visit?</span>
                <button type="button" class="btn-small danger" data-action="confirm-cancel">Yes, cancel</button>
                <button type="button" class="btn-small" data-action="keep">Keep it</button>`;
            item.querySelector('[data-action="confirm-cancel"]').focus();
            return;
        }

        if (button.dataset.action === 'keep') {
            renderAppointments();
            return;
        }

        // Cancel, step 2: mark it cancelled; it moves to "Past & cancelled"
        if (button.dataset.action === 'confirm-cancel') {
            const appt = data.appointments.find(a => a.id === id);
            appt.status = 'Cancelled';
            renderAll();
            showToast(`Your ${appt.type.toLowerCase()} on ${formatDate(appt.date)} was cancelled.`);
            return;
        }

        if (button.dataset.action === 'complete-form') {
            const form = data.forms.find(f => f.id === id);
            form.done = true;
            renderAll();
            showToast(`${form.name} marked complete.`);
            return;
        }

        // Open a message (and mark it read)
        if (button.dataset.message) {
            openMessageId = Number(button.dataset.message);
            data.messages.find(m => m.id === openMessageId).unread = false;
            renderAll();
            document.querySelector('.reader-subject').setAttribute('tabindex', '-1');
            document.querySelector('.reader-subject').focus();
            return;
        }

        // Demo payment: marks every due statement as paid
        if (button.id === 'pay-btn') {
            data.statements.forEach(s => { s.paid = true; });
            renderAll();
            showToast('Demo payment recorded. No real payment was made.');
        }
    });

    // Reply form (it's redrawn with the reader, so we listen on the reader itself)
    document.getElementById('message-reader').addEventListener('submit', event => {
        event.preventDefault();
        const box = document.getElementById('reply-text');
        const error = document.getElementById('reply-text-error');

        if (box.value.trim().length < 2) {
            error.textContent = 'Please write a reply before sending.';
            box.classList.add('invalid');
            box.focus();
            return;
        }

        const message = data.messages.find(m => m.id === openMessageId);
        message.replies.push({ text: box.value.trim(), date: new Date() });
        renderReader();
        showToast('Reply sent (demo).');
    });

    // Request-an-appointment form
    const requestForm = document.getElementById('request-form');
    const dateInput = document.getElementById('req-date');

    // The date picker can't go earlier than tomorrow.
    // Built from local year/month/day (toISOString would use UTC and
    // could be a day off in the evening).
    const tomorrow = daysFromNow(1);
    const pad = n => String(n).padStart(2, '0');
    dateInput.min = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    requestForm.addEventListener('submit', event => {
        event.preventDefault();
        const typeSelect = document.getElementById('req-type');
        let ok = true;

        const setError = (input, message) => {
            document.getElementById(input.id + '-error').textContent = message;
            input.classList.toggle('invalid', message !== '');
            if (message) ok = false;
        };

        setError(typeSelect, typeSelect.value ? '' : 'Please choose a type of visit.');

        // "2026-11-20" -> a Date at local midnight (adding T00:00 avoids a time-zone shift)
        const picked = dateInput.value ? new Date(dateInput.value + 'T00:00') : null;
        if (!picked) {
            setError(dateInput, 'Please pick a date.');
        } else if (picked < daysFromNow(1, 0, 0)) {
            setError(dateInput, 'Please pick a date after today.');
        } else if (picked.getDay() === 0 || picked.getDay() === 6) {
            setError(dateInput, 'Our office is open Monday – Friday. Please pick a weekday.');
        } else {
            setError(dateInput, '');
        }

        if (!ok) {
            requestForm.querySelector('.invalid').focus();
            return;
        }

        const timeOfDay = document.getElementById('req-time').value;
        const chosenType = typeSelect.value; // saved now, because reset() below clears the form
        picked.setHours(timeOfDay === 'morning' ? 9 : 13);

        data.appointments.push({
            id: data.nextId++,
            type: chosenType,
            date: picked,
            timeOfDay: timeOfDay === 'morning' ? 'Morning' : 'Afternoon',
            format: requestForm.querySelector('input[name="format"]:checked').value,
            status: 'Requested'
        });

        requestForm.reset();
        renderAll();
        showToast('Request sent! The front desk will confirm by message.');

        // A few seconds later the "front desk" replies, to show how messages update
        setTimeout(() => {
            data.messages.unshift({
                id: data.nextId++,
                from: 'Front Desk',
                subject: 'We received your appointment request',
                date: new Date(),
                unread: true,
                body: `Thanks, ${patient.firstName}! We got your request for ${chosenType.toLowerCase()} on ${formatDate(picked)}. We'll confirm the exact time shortly. (This is an automatic demo message.)`,
                replies: []
            });
            renderAll();
            showToast('New message from the Front Desk.');
        }, 3000);
    });

    // Sign out: forget the session and go back to the login page
    document.getElementById('logout-btn').addEventListener('click', () => {
        clearSession();
        window.location.href = 'portal.html';
    });

    /* ---- Start up ---- */
    renderUser();
    renderAll();

    // Open the tab named in the URL (e.g. dashboard.html#billing), if any
    const startTab = window.location.hash.replace('#', '');
    if (tabs.some(t => t.dataset.tab === startTab)) selectTab(startTab);
}
