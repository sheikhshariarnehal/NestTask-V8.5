function r(o,t="info",c={}){const{duration:l=3e3,position:a="bottom-right",showIcon:s=!0}=c,e=document.createElement("div");let i="";switch(a){case"top-right":i="top-4 right-4";break;case"top-left":i="top-4 left-4";break;case"bottom-left":i="bottom-4 left-4";break;case"bottom-right":default:i="bottom-4 right-4";break}e.className=`fixed ${i} px-4 py-3 rounded-xl shadow-lg z-[9999] toast-notification ${t}`;let n="";if(s)switch(t){case"success":n=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`;break;case"error":n=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>`;break;case"info":default:n=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>`;break}return e.innerHTML=`
    <div class="flex items-center gap-2">
      ${s?n:""}
      <span>${o}</span>
    </div>
  `,document.body.appendChild(e),setTimeout(()=>{document.body.contains(e)&&(e.classList.add("animate-fadeOut"),setTimeout(()=>{document.body.contains(e)&&document.body.removeChild(e)},300))},l),e}function d(o,t){return r(o,"success",t)}function h(o,t){return r(o,"error",t)}export{d as a,h as s};
