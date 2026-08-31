// Grab every FAQ question button
const buttons = document.querySelectorAll('.question-btn');

buttons.forEach(button => {
    // Toggle this button's answer open/closed on click
    button.addEventListener('click', () => {
        // Relies on the .answer <p> being the very next sibling in the HTML
        const answer = button.nextElementSibling;
        answer.classList.toggle('open');   // expands/collapses via max-height in style.css
        button.classList.toggle('open');   // rotates the "+" icon via style.css
    });
});
