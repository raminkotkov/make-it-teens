'use strict';
(() => {
 const key='anellion-developer-mode';
 let enabled=true;
 try{const saved=localStorage.getItem(key);if(saved!==null)enabled=saved==='true';}catch{}
 const label=document.createElement('label');label.className='developer-toggle';
 const input=document.createElement('input');input.type='checkbox';input.checked=enabled;
 const text=document.createElement('span');text.textContent='Режим разработчика';label.append(input,text);document.querySelector('header').append(label);
 window.DeveloperMode={get enabled(){return enabled;}};
 input.addEventListener('change',()=>{enabled=input.checked;try{localStorage.setItem(key,String(enabled));}catch{}window.dispatchEvent(new Event('developer-mode-change'));});
})();
