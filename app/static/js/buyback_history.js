
// Tab navigation logic
document.querySelectorAll(".tab-link").forEach(button => {
    button.addEventListener("click", (e) => {
        // Remove 'active' class from all tabs and tab links
        document.querySelectorAll(".tab-link").forEach(link => link.classList.remove("active"));
        document.querySelectorAll(".tab").forEach(content => content.classList.remove("active"));

        // Add 'active' class to the clicked tab and corresponding tab content
        e.target.classList.add("active");
        const tabId = e.target.getAttribute("data-tab");
        document.querySelector(`#tab${tabId}`).classList.add("active");
    });
});


document.addEventListener("DOMContentLoaded", async function() {

    
    document.querySelector('#copy_ubuntu').addEventListener(()=>{
        navigator.clipboard.writeText("Ubuntu Hakurei").then(function() { 
            console.log("'Ubuntu Hakurei' is copied to clipboard.");
            showNotification("'Ubuntu Hakurei' is copied to clipboard.",'left-bottom');
        }).catch(function(e){
            console.error(`Failed to copy : ${e}`);
            showNotification("Error: Failed to copy.");
        });

    });

    const span_price=document.querySelector('#copy_price');

    span_price.ddEventListener(()=>{
        navigator.clipboard.writeText(span_price.getAttribute('data-value')).then(function() { 
            console.log("The price is copied to clipboard.");
            showNotification("The price is copied to clipboard.",'left-bottom');
        }).catch(function(e){
            console.error(`Failed to copy : ${e}`);
            showNotification("Error: Failed to copy.");
        });

    });
}
);



function showNotification(message, position = 'right-bottom') {

    const allowedPosition=['right-bottom','top-right','bottom-left','top-left','center'];
    if(!allowedPosition.includes(position)){
        position='right-bottom';
    }


    const notification = document.createElement('div');
    notification.setAttribute('id', 'notification');
    notification.classList.add('notification');
    
    // Set the position class
    position=position.toLowerCase();
    const positionClass = `notification-${position}`;
    notification.classList.add(positionClass);


    notification.innerText = message;
    notification.style.display = 'block';
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = 1;
    }, 10); // slight delay to ensure transition

    setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => {
            notification.remove(); // Remove element after animation
        }, 500); // match this duration to CSS transition
    }, 2000); // duration for which the notification stays visible
}
