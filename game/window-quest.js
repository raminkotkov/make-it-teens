'use strict';
(() => {
 const key='anellion-bedroom-v3';
 class WindowTrial {
  constructor(completed=0,quests=window.WINDOW_QUESTS){this.quests=quests;this.completed=Number.isInteger(completed)&&completed>=0&&completed<=3?completed:0;this.index=0;this.active=false;}
  get xp(){return this.quests.slice(0,this.completed).reduce((sum,q)=>sum+q.reward,0);}
  start(){if(this.completed===3)return false;this.index=0;this.active=true;return true;}
  answer(option){
   if(!this.active||!Number.isInteger(option)||option<0||option>3)return 'ignored';
   if(option!==this.quests[this.completed].questions[this.index].answer){this.active=false;this.index=0;return 'failed';}
   this.index++;
   if(this.index<3)return 'next';
   this.completed++;this.active=false;this.index=0;return 'won';
  }
 }
 window.WindowTrial=WindowTrial;
 const items=[
  {scene:0,name:'Окно',title:'Грязное окно',x:.09,top:32,width:10,height:23},
  {scene:0,name:'Зеркало',title:'Треснувшее зеркало',x:.28,top:29,width:7,height:39},
  {scene:0,name:'Будильник',title:'Старый будильник',x:.39,top:51,width:5,height:9},
  {scene:0,name:'Ваза',title:'Глиняная ваза',x:.755,top:53,width:6,height:18},
  {scene:0,name:'Сундук',title:'Деревянный сундук',x:.89,top:56,width:14,height:16},

  {scene:1,name:'Карта',title:'Карта Империи',x:.27,top:26,width:18,height:30},
  {scene:1,name:'Чернильница',title:'Чернильница с пером',x:.41,top:46,width:5,height:11},
  {scene:1,name:'Конверт',title:'Запечатанный конверт',x:.725,top:51,width:5,height:7},
  {scene:1,name:'Сейф',title:'Сейф',x:.90,top:52,width:10,height:20},
  {scene:2,name:'Объявления',title:'Доска объявлений',x:.115,top:39,width:16,height:26},
  {scene:2,name:'Почтовый ящик',title:'Почтовый ящик',x:.34,top:44,width:6,height:16},
  {scene:2,name:'Статуя',title:'Деревянная статуя Анеллиона',x:.54,top:12,width:10,height:42},
  {scene:2,name:'Фонарь',title:'Старый фонарь',x:.905,top:22,width:5,height:12},
  {scene:3,name:'Кувшин',title:'Глиняный кувшин',x:.11,top:47,width:4,height:7},
  {scene:3,name:'Кастрюля',title:'Ржавая кастрюля',x:.415,top:56,width:6,height:7},
  {scene:3,name:'Бочка',title:'Деревянная бочка',x:.63,top:58,width:7,height:12},
  {scene:3,name:'Зерно',title:'Мешок с зерном',x:.855,top:60,width:8,height:11}
 ];
 let record={};try{const stored=JSON.parse(localStorage.getItem(key)||'{}');record=Array.isArray(stored)?{completed:stored}:stored||{};}catch{}
 const saved=Array.isArray(record.completed)?record.completed:[];
 const trials=[];
 items.forEach((item,i)=>{const previous=items[i-1];const chain=i===0||previous.scene!==item.scene||trials[i-1].completed===3;const bedroomReady=i<5||trials.slice(0,5).every(t=>t.completed===3);trials.push(new WindowTrial(chain&&bedroomReady?saved[i]:0,window.BEDROOM_QUESTS[i]));});
 let allocations=Array.isArray(record.allocations)?record.allocations:[];
 let energy=Number.isInteger(record.energy)&&record.energy>=0&&record.energy<=3?record.energy:3;
 let nextEnergy=Number.isFinite(record.nextEnergy)&&record.nextEnergy>0?record.nextEnergy:0;
 const energyPeriod=8*60*60*1000;
 function refill(){if(energy>=3){nextEnergy=0;return;}if(!nextEnergy){nextEnergy=Date.now()+energyPeriod;return;}const now=Date.now();if(now>=nextEnergy){const count=Math.min(3-energy,Math.floor((now-nextEnergy)/energyPeriod)+1);energy+=count;nextEnergy=energy===3?0:nextEnergy+count*energyPeriod;}}
 function totals(){const base=trials.slice(0,5).reduce((sum,t)=>sum+t.xp,0);let hero=base,empire=base;for(let i=5;i<items.length;i++)for(let q=0;q<trials[i].completed;q++){const a=allocations[i]?.[q];hero+=a?.hero||0;empire+=a?.empire||0;}return {hero,empire};}
 const stage=document.querySelector('.stage');
 let selected=0,trial=trials[0],currentScene=0,pendingReward=null;
 const bedroomComplete=()=>trials.slice(0,5).every(t=>t.completed===3);
 const available=i=>(items[i].scene===0||bedroomComplete())&&(i===0||items[i-1].scene!==items[i].scene||trials[i-1].completed===3);
 const markers=items.map((item,i)=>{
  const marker=document.createElement('button');marker.className='window-marker';marker.type='button';
  Object.assign(marker.style,{left:`${item.x*100-item.width/2}%`,top:`${item.top}%`,width:`${item.width}%`,height:`${item.height}%`});
  const label=document.createElement('span');label.textContent=item.name;marker.append(label);stage.append(marker);
  marker.addEventListener('click',()=>open(i));return marker;
 });
 const prompt=document.createElement('button');prompt.className='window-prompt';prompt.type='button';prompt.hidden=true;stage.append(prompt);
 const dialog=document.createElement('dialog');dialog.className='quest-dialog';dialog.setAttribute('aria-labelledby','window-title');
 dialog.innerHTML='<button class="quest-close" aria-label="Закрыть">×</button><p class="quest-eyebrow">СПАЛЬНЯ</p><h2 id="window-title">Грязное окно</h2><p class="quest-meta"></p><div class="quest-content"></div>';
 document.body.append(dialog);
 const content=dialog.querySelector('.quest-content'),meta=dialog.querySelector('.quest-meta');
 let nearby=false,visible=false,lastUpdate='',lastX=0,lastWidth=1440;
 function line(text,tag='p'){const el=document.createElement(tag);el.textContent=text;content.append(el);return el;}
 function action(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);content.append(b);return b;}
 function progress(){lastUpdate='';markers.forEach((marker,i)=>{marker.disabled=!available(i);marker.querySelector('span').style.fontWeight=available(i)&&trials[i].completed<3?'700':'400';marker.title=available(i)?items[i].name:`Сначала пройди: ${items[Math.max(0,i-1)].name}`;});window.dispatchEvent(new Event('window-quest-progress'));}
 function persist(){try{localStorage.setItem(key,JSON.stringify({completed:trials.map(t=>t.completed),allocations,energy,nextEnergy}));return true;}catch{return false;}}
 const pendingLevels=[];
 const levelDialog=document.createElement('dialog');levelDialog.className='quest-dialog level-dialog';levelDialog.setAttribute('aria-labelledby','level-title');document.body.append(levelDialog);
 function showNextLevel(){
  if(!pendingLevels.length){if(levelDialog.open)levelDialog.close();window.dispatchEvent(new Event('window-quest-close'));document.querySelector('canvas').focus({preventScroll:true});return;}
  const entry=pendingLevels.shift();levelDialog.replaceChildren();
  const notice=document.createElement('section');notice.className='level-celebration';
  const icon=document.createElement('div');icon.className='level-celebration-icon';icon.textContent='✦';
  const heading=document.createElement('h3');heading.id='level-title';heading.textContent=`Поздравляем! ${entry.name} — уровень ${entry.level}!`;
  notice.append(icon,heading);
  if(entry.name==='Империя'){
   const openings=[
    [2,'Кабинет правления Империей'],[2,'Главная площадь Империи'],[2,'Общая столовая'],
    [5,'Испытание для открытия Консильерга'],[6,'Заброшенные сельскохозяйственные поля'],
    [7,'Имперская казна и склад ресурсов'],[8,'Разрушенная лесопилка'],[8,'Военный лагерь'],[9,'Заброшенная шахта']
   ].filter(([level])=>level>entry.previous&&level<=entry.level);
   if(openings.length){const label=document.createElement('strong');label.textContent='Вам теперь доступны';notice.append(label);for(const [,name] of openings){const row=document.createElement('p');row.textContent=name;notice.append(row);}}
  }
  const button=document.createElement('button');button.type='button';button.textContent=pendingLevels.length?'Далее':'Продолжить';button.addEventListener('click',showNextLevel);
  levelDialog.append(notice,button);if(!levelDialog.open)levelDialog.showModal();button.focus();
 }
 levelDialog.addEventListener('cancel',event=>{event.preventDefault();showNextLevel();});
 function close(){if(pendingReward)return;trial.active=false;dialog.close();showNextLevel();}

 function intro(){
  content.replaceChildren();meta.textContent='';
  if(trial.completed===3){meta.textContent='✅';line('Все квесты пройдены');action('Вернуться в комнату',close);return;}
  line(`Квест ${trial.completed+1} из 3`,'h3');
  if(!window.DeveloperMode?.enabled)line('Три верных ответа — квест пройден.');
  if(window.DeveloperMode?.enabled){
   const button=action('Пройти одним нажатием',()=>{
    if(!window.DeveloperMode?.enabled||trial.completed===3)return;
    const reward=trial.quests[trial.completed].reward;
    startAttempt(true);
   });button.classList.add('developer-pass');
  }else action('Пройти квест',()=>startAttempt(false));
 }
 function startAttempt(developer){
  if(trial.completed===3||pendingReward||trial.active)return;
  refill();
  if(items[selected].scene!==0&&!developer){
   if(energy===0){content.replaceChildren();line('Энергия закончилась.');line('Одна энергия восстанавливается каждые 8 часов.');action('Вернуться в комнату',close);return;}
   if(energy===3)nextEnergy=Date.now()+energyPeriod;energy--;persist();progress();
  }
  trial.start();
  if(!developer){question();return;}
  const reward=trial.quests[trial.completed].reward;let result;
  while(trial.active)result=trial.answer(trial.quests[trial.completed].questions[trial.index].answer);
  if(result==='won')showVictory(reward);
 }
 function splitReward(reward,direction){
  const current=totals();
  // All twelve objects in the three base rooms remain available sources.
  const future=trials.slice(5).reduce((sum,t)=>sum+t.quests.slice(t.completed).reduce((n,q)=>n+q.reward,0),0)-reward;
  const target=current.empire<2000?2000:current.empire<4000?4000:current.empire<6000?6000:current.empire<8000?8000:0;
  // Later rooms have their own sources; reserve only for the first opening here.
  const reserve=target===2000?Math.min(reward,Math.max(0,target-current.empire-future)):0;
  let empire=direction==='empire'?reward:reserve,hero=reward-empire;
  if(current.hero+hero>10000){const overflow=current.hero+hero-10000;hero-=overflow;empire+=overflow;}
  if(current.empire+empire>10000){const overflow=current.empire+empire-10000;empire-=overflow;hero=Math.min(10000-current.hero,hero+overflow);}
  return {hero,empire};
 }
 function chooseReward(reward){
  trial.completed--;pendingReward=reward;content.replaceChildren();meta.textContent='Квест пройден';line('Куда направить награду?','h3');
  for(const [direction,name] of [['hero','Анеллион'],['empire','Империя']]){
   const split=splitReward(reward,direction);
   const label=split.hero&&split.empire?`Анеллион +${split.hero} XP · Империя +${split.empire} XP`:`${name} +${reward} XP`;
   if(direction==='hero'&&split.empire)line('Часть награды нужна Империи для открытия полей.');
   action(label,()=>{if(pendingReward!==reward)return;const index=trial.completed;allocations[selected]??=[];allocations[selected][index]=split;trial.completed++;pendingReward=null;finishVictory(reward,split);});
  }
 }
 function showVictory(reward){
  if(items[selected].scene!==0){chooseReward(reward);return;}
  finishVictory(reward,{hero:reward,empire:reward});
 }
 function finishVictory(reward,split){
  content.replaceChildren();
    const stored=persist();progress();meta.textContent=trial.completed===3?'✅':`${trial.completed}/3 ✅`;
    const total=totals();
    for(const [field,name] of [['empire','Империя'],['hero','Анеллион']]){
     const before=window.AnellionLevelInfo(total[field]-split[field]),after=window.AnellionLevelInfo(total[field]);
     if(after.level>before.level)pendingLevels.push({name,level:after.level,previous:before.level});
    }
    line('Квест пройден!','h3');
    const panel=document.createElement('div');panel.className='quest-reward';
    const title=document.createElement('strong');title.textContent='Награда';panel.append(title);
    for(const [field,name] of [['hero','Анеллион'],['empire','Империя']]){
     if(!split[field])continue;
     const row=document.createElement('p'),amount=document.createElement('b'),label=document.createElement('span');
     amount.textContent=`+${split[field]} XP`;label.textContent=name;row.append(amount,label);panel.append(row);
    }
    content.append(panel);
    if(trial.completed===3)line(selected===4?'Спальня пройдена!':items[selected+1]?.scene===items[selected].scene?`Открыт следующий предмет: ${items[selected+1].name}.`:'Все предметы этой комнаты пройдены!');
    if(!stored)line('Прогресс пока сохранён только до закрытия этой страницы.');
    action(trial.completed===3?'Готово':'Следующий квест',trial.completed===3?close:intro);
 }
 function question(){
  const q=trial.quests[trial.completed],item=q.questions[trial.index];content.replaceChildren();
  meta.textContent=`Квест ${trial.completed+1}/3 · Вопрос ${trial.index+1}/3`;
  line(item.text,'h3');
  item.options.forEach((option,i)=>{const b=action(option,()=>{
   const reward=q.reward,result=trial.answer(i);
   if(result==='next'){question();return;}
   content.replaceChildren();
   if(result==='failed'){
    meta.textContent='Попытка завершена';line('Неверно. Открой предмет заново, чтобы повторить попытку.');
    action('Вернуться в комнату',close);
   }else if(result==='won'){
    showVictory(reward);
   }
  });b.classList.add('quest-answer');});
 }
 function open(index=selected){
  if(!visible||items[index].scene!==currentScene||dialog.open||levelDialog.open||window.GameHUD?.isOpen||!available(index)||trials[index].completed===3)return;
  if(Math.abs(lastX-lastWidth*items[index].x)>=lastWidth*.075)return;
  selected=index;trial=trials[index];dialog.querySelector('.quest-eyebrow').textContent=['СПАЛЬНЯ','КАБИНЕТ','ГЛАВНАЯ ПЛОЩАДЬ','ОБЩАЯ СТОЛОВАЯ'][items[index].scene];dialog.querySelector('#window-title').textContent=items[index].title;
  window.dispatchEvent(new Event('window-quest-open'));intro();dialog.showModal();dialog.querySelector('.quest-close').focus();
 }
 prompt.addEventListener('click',()=>open());
 dialog.querySelector('.quest-close').addEventListener('click',close);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',()=>{trial.active=false;});
 addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||dialog.open)return;if(['e','E','у','У'].includes(e.key)&&visible&&nearby){e.preventDefault();open();}});
 window.WindowQuest={
  get isOpen(){return dialog.open||levelDialog.open;},
  get progress(){refill();const xp=totals();return {completed:trials.reduce((n,t)=>n+t.completed,0),xp:xp.hero,heroXp:xp.hero,empireXp:xp.empire,bedroomComplete:bedroomComplete(),energy,nextEnergy};},
  update(scene,x,width){
   lastX=x;lastWidth=width;currentScene=scene;visible=scene>=0&&scene<=3;
   const candidates=items.map((item,i)=>({i,d:Math.abs(x-width*item.x)})).filter(p=>items[p.i].scene===scene&&available(p.i)).sort((a,b)=>a.d-b.d);
   const closest=candidates[0];nearby=visible&&!!closest&&closest.d<width*.075;
   if(!dialog.open&&closest){selected=closest.i;trial=trials[selected];}
   const signature=`${scene}:${visible}:${nearby}:${selected}:${trials.map(t=>t.completed)}`;if(signature===lastUpdate)return;lastUpdate=signature;
   markers.forEach((marker,i)=>{marker.hidden=!visible||items[i].scene!==scene||!available(i);marker.setAttribute('aria-label',items[i].name);});
   prompt.hidden=!nearby;prompt.textContent=trial.completed===3?'Все квесты пройдены':'E · Пройти квест';prompt.disabled=trial.completed===3;
  }

 };
 progress();
})();
