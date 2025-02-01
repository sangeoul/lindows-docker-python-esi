function copyActiveToken(){
    const active_token=document.querySelector('#hidden-active-token').value;
    navigator.clipboard.writeText(active_token).then(function() { 
        console.log("Copied.");
    }).catch(function(e){
        console.error(`Failed to copy : ${e}`);
    });
}


function copyRefreshToken(){
    const refresh_token=document.querySelector('#hidden-refresh-token').value;
    navigator.clipboard.writeText(refresh_token).then(function() { 
        console.log("Copied.");
    }).catch(function(e){
        console.error(`Failed to copy : ${e}`);
    });
}

// Call the function to fetch and store data
document.addEventListener("DOMContentLoaded", async function() {
    activeButton=document.querySelector('#button-copy-access-token');
    refreshButton=document.querySelector('#button-copy-refresh-token');

    if(activeButton){
        activeButton.addEventListener('click',()=>{
            copyActiveToken();
        });
    }
    if(refreshButton){
        refreshButton.addEventListener('click',()=>{
            copyRefreshToken();
        });
    }
});
