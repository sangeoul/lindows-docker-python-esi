
// Tab navigation logic
document.querySelectorAll(".tab-link").forEach(button => {
    button.addEventListener("click", (e) => {
        // Remove 'active' class from all tabs and tab links
        document.querySelectorAll(".tab-link").forEach(link => link.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

        // Add 'active' class to the clicked tab and corresponding tab content
        e.target.classList.add("active");
        const tabId = e.target.getAttribute("data-tab");
        document.querySelector(`#tab${tabId}`).classList.add("active");
    });
});
