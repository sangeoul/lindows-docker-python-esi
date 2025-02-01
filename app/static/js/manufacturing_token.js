function copyAccessToken(){
    const access_token=document.querySelector('#hidden-access-token').value;
    navigator.clipboard.writeText(access_token).then(function() { 
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
    accessButton=document.querySelector('#button-copy-access-token');
    refreshButton=document.querySelector('#button-copy-refresh-token');

    if(accessButton){
        accessButton.addEventListener('click',()=>{
            copyAccessToken();
        });
    }
    if(refreshButton){
        refreshButton.addEventListener('click',()=>{
            copyRefreshToken();
        });
    }
});
