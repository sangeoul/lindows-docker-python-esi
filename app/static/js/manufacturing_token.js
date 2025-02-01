
const button_active=document.querySelector('#button-copy-active-token');

if(button_active){
    button_active.addEventListener('click',()=>{
        const active_token=document.querySelector('#hidden-active-token').value;
        navigator.clipboard.writeText(active_token);
    }
    );
}


const button_refresh=document.querySelector('#button-copy-refresh-token');

if(button_refresh){
    button_refresh.addEventListener('click',()=>{
        const refresh_token=document.querySelector('#hidden-refresh-token').value;
        navigator.clipboard.writeText(refresh_token);
    }
    );
}