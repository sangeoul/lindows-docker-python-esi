function copyActiveToken(){
    const active_token=document.querySelector('#hidden-active-token').value;
    navigator.clipboard.writeText(active_token);
}


function copyRefreshToken(){
    const refresh_token=document.querySelector('#hidden-refresh-token').value;
    navigator.clipboard.writeText(refresh_token);
}