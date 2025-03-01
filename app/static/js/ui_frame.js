
const HOST_ADDRESS='https://lindows.kr:8001/'
document.addEventListener('DOMContentLoaded', function() {

    const NUMBER_OF_LINKS=3;

    const div_banner = document.getElementById('lindows-top-banner');

    const table_linktable=document.createElement('table');
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
    
});
