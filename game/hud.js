'use strict';
(() => {
 const thresholds=[0,100,250,500,1000,2000,4000,6000,8000,10000];
 function levelInfo(value){
  const xp=Math.max(0,Math.min(10000,Number(value)||0));
  let index=0;while(index<9&&xp>=thresholds[index+1])index++;
  const floor=thresholds[index],ceiling=thresholds[index+1]??10000;
  return {xp,level:index+1,floor,ceiling,progress:index===9?1:(xp-floor)/(ceiling-floor),remaining:ceiling-xp};
 }
 window.AnellionLevelInfo=levelInfo;
 const root=document.querySelector('.game-hud');
 root.innerHTML=`<section class="growth-card hero-growth" aria-label="Развитие Анеллиона"><div class="growth-heading"><span class="growth-icon" aria-hidden="true">♜</span><h2>Анеллион</h2><span class="level-pill" data-level="hero"></span></div><div class="xp-caption"><span data-xp="hero"></span></div><div class="xp-track" role="progressbar" aria-label="До следующего уровня Анеллиона" data-bar="hero"><span></span></div></section>
 <section class="growth-card empire-growth" aria-label="Развитие Империи"><div class="growth-heading"><span class="growth-icon" aria-hidden="true">☀</span><h2>Империя</h2><span class="level-pill" data-level="empire"></span></div><div class="xp-caption"><span data-xp="empire"></span></div><div class="xp-track" role="progressbar" aria-label="До следующего уровня Империи" data-bar="empire"><span></span></div></section>
 <section class="growth-card energy-card" aria-label="Энергия"><div class="growth-heading"><span class="growth-icon" aria-hidden="true">ϟ</span><h2>Энергия</h2><span class="level-pill" data-energy-count>3 / 3</span></div><div class="energy-charges" aria-label="Три энергии из трёх"><span>ϟ</span><span>ϟ</span><span>ϟ</span></div><div class="energy-infinity" aria-label="Бесконечная энергия">∞</div></section>`;
 const route=document.querySelector('.journey-info');
 route.innerHTML='<button class="faq-button" type="button" aria-haspopup="dialog">FAQ</button>';
 const faq=document.createElement('dialog');faq.className='quest-dialog faq-dialog';faq.setAttribute('aria-labelledby','faq-title');
 faq.innerHTML='<button class="quest-close" aria-label="Закрыть FAQ">×</button><h2 id="faq-title">Об игре</h2><div class="faq-questions"></div>';
 document.body.append(faq);
 const answers=[
  ['Какая цель игры?','Развить Анеллиона и восстановить Империю. У каждого — 10 уровней и своя шкала опыта.'],
  ['Как начать квест?','Подойди к предмету и нажми E или кнопку «Пройти квест».'],
  ['Как пройти предмет?','У каждого предмета три квеста по три вопроса. Ответь верно на всю тройку, чтобы пройти квест.'],
  ['Что будет после ошибки?','Текущая попытка завершится. При повторе будут те же вопросы с первого; уже пройденные квесты сохранятся. Правильный ответ после ошибки не показывается.'],
  ['Почему у энергии знак ∞?','В спальне все попытки бесплатные. После спальни запас — 3 энергии: одна на попытку, восстановление — по одной каждые 8 часов. Испытание открытия Консильерга тоже бесплатное.'],
  ['Кому достаётся опыт?','В спальне опыт получают и Анеллион, и Империя. Дальше награду можно направлять герою или Империи — выбор за тобой.'],
  ['Как открыть новые предметы?','Пройди все три квеста одного предмета — откроется следующий. Так предметы открываются по очереди.']
 ];
 for(const [question,answer] of answers){const item=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('p');title.textContent=question;body.textContent=answer;item.append(title,body);faq.querySelector('.faq-questions').append(item);}
 function closeFAQ(){faq.close();window.dispatchEvent(new Event('window-quest-close'));document.querySelector('canvas').focus({preventScroll:true});}
 route.querySelector('.faq-button').addEventListener('click',()=>{window.dispatchEvent(new Event('window-quest-open'));faq.showModal();faq.querySelector('.quest-close').focus();});
 faq.querySelector('.quest-close').addEventListener('click',closeFAQ);
 faq.addEventListener('cancel',e=>{e.preventDefault();closeFAQ();});

 let scene=0;
 function bar(name,xp){
  const info=levelInfo(xp),track=root.querySelector(`[data-bar="${name}"]`);
  root.querySelector(`[data-level="${name}"]`).textContent=`Ур. ${info.level} / 10`;
  root.querySelector(`[data-xp="${name}"]`).textContent=`${info.xp.toLocaleString('ru-RU')} / ${info.ceiling.toLocaleString('ru-RU')} XP`;
  track.setAttribute('aria-valuemin',String(info.floor));track.setAttribute('aria-valuemax',String(info.ceiling));track.setAttribute('aria-valuenow',String(info.xp));
  track.setAttribute('aria-valuetext',`${info.xp} XP, уровень ${info.level} из 10`);
  track.querySelector('span').style.width=`${info.progress*100}%`;return info;
 }
 function render(){
  const state=window.WindowQuest.progress;
  bar('hero',state.heroXp);bar('empire',state.empireXp);
  const infinite=scene===0||window.DeveloperMode?.enabled;
  root.querySelector('[data-energy-count]').hidden=infinite;
  root.querySelector('[data-energy-count]').textContent=`${state.energy} / 3`;
  root.querySelector('.energy-charges').setAttribute('aria-label',`Энергия: ${state.energy} из 3`);
  [...root.querySelector('.energy-charges').children].forEach((charge,i)=>{charge.style.opacity=i<state.energy?'1':'.2';});
  root.querySelector('.energy-charges').hidden=infinite;
  root.querySelector('.energy-infinity').hidden=!infinite;

 }
 window.GameHUD={get isOpen(){return faq.open;},setScene(value){if(scene!==value){scene=value;render();}}};
 setInterval(render,30000);
 addEventListener('developer-mode-change',render);
 addEventListener('window-quest-progress',render);render();
})();
