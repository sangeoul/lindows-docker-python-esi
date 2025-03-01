
const HOST_ADDRESS='https://lindows.kr:8001/';


document.addEventListener('DOMContentLoaded', function() {

});



document.addEventListener('DOMContentLoaded', function() {

    let fontlink = document.createElement('link');
    fontlink.href = 'https://fonts.googleapis.com/css2?family=Metrophobic&display=swap';
    fontlink.rel = 'stylesheet';
    
    document.head.appendChild(fontlink);


    let csslink = document.createElement('link');
    csslink.href = '/static/css/ui_frame.css';  // Replace 'styles.css' with the path to your CSS file
    csslink.rel = 'stylesheet';
    csslink.type = 'text/css';
    
    document.head.appendChild(csslink);


    const NUMBER_OF_LINKS=3;

    const div_banner = document.getElementById('lindows-top-banner');

    const table_linktable=document.createElement('table');
    table_linktable.style.height='25px';
    const tr_linktable=document.createElement('tr');
    let td_linktable=[];
    let a_links=[];

    for(let i=0;i<NUMBER_OF_LINKS;i++){
        td_linktable[i]=document.createElement('td');
        a_links[i]=document.createElement('a');

        td_linktable[i].appendChild(a_links[i]);
        tr_linktable.appendChild(td_linktable[i]);
    }

    a_links[0].innerHTML="Buyback";
    a_links[0].setAttribute('href',HOST_ADDRESS+'industry/buyback');

    a_links[1].innerHTML="Buyback History";
    a_links[1].setAttribute('href',HOST_ADDRESS+'industry/buyback_history');


    a_links[2].innerHTML="Industry Calculator";
    a_links[2].setAttribute('href',HOST_ADDRESS+'industry/industry_calculator');
    a_links[2].setAttribute('target','_blank');

    table_linktable.appendChild(tr_linktable);
    div_banner.appendChild(table_linktable);
});
