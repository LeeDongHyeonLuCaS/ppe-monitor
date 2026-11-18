'use strict';
const $ = id => document.getElementById(id);
// Display keys only; map the backend model's class IDs explicitly when connecting.
const classes = [
  {key:'helmet',name:'안전모(헬멧)',icon:'◒'},
  {key:'goggles',name:'고글',icon:'🥽'},
  {key:'vest',name:'안전조끼',icon:'◇'},
  {key:'gloves',name:'장갑',icon:'🧤'},
  {key:'boots',name:'안전화(부츠)',icon:'🥾'},
  {key:'person',name:'사람',icon:'♙'}
];
let stream = null, connecting = false, generation = 0, timer = null, demoStep = 0, logCount = 0;
const samples = [[2,2,2,4,4,3],[2,1,1,2,2,2],[1,0,1,1,0,2],[0,0,0,0,0,0]];
function renderCounts(counts=null){
  $('classList').replaceChildren(...classes.map((item,index)=>{
    const row=document.createElement('div');row.className='class-row';
    row.innerHTML=`<span class="class-symbol">${item.icon}</span><span class="class-name">${item.name}<small>${item.key}</small></span><span class="class-count">${counts ? counts[index] : '—'}<small>개</small></span>`;
    return row;
  }));
  $('totalCount').textContent=counts ? counts.reduce((a,b)=>a+b,0) : '—';
}
function log(message){
  if(!logCount)$('logs').replaceChildren();
  const row=document.createElement('div');row.className='log-row';
  const time=document.createElement('time');time.textContent=new Date().toLocaleTimeString('ko-KR',{hour12:false});
  const text=document.createElement('span');text.textContent=message;row.append(time,text);$('logs').prepend(row);
  while($('logs').children.length>50)$('logs').lastElementChild.remove();
  logCount++;$('logCount').textContent=logCount;
}
function stopDemo(){if(timer!==null)clearInterval(timer);timer=null;$('detectButton').textContent='테스트 시작';}
function stopCamera(){
  generation++;connecting=false;
  if(stream)stream.getTracks().forEach(track=>track.stop());
  stream=null;$('video').srcObject=null;$('video').hidden=true;$('emptyState').hidden=false;
  $('cameraButton').textContent='카메라 켜기';$('cameraButton').disabled=false;
  $('resolution').textContent='— × —';$('cameraBadge').textContent='OFFLINE';$('cameraBadge').className='badge';
  $('cameraSubtitle').textContent='노트북 웹캠 · 연결 대기';
}
function setMode(){
  stopDemo();stopCamera();renderCounts();const demo=$('mode').value==='demo';
  $('cameraButton').hidden=demo;$('detectButton').disabled=!demo;$('detectButton').textContent=demo?'테스트 시작':'탐지 시작';
  $('demoWatermark').hidden=!demo;
  $('emptyTitle').textContent=demo?'테스트 데이터 미리보기':'카메라를 연결해 주세요';
  $('emptyText').textContent=demo?'테스트 시작을 누르면 예시 탐지 결과가 반복됩니다. 실제 영상 분석은 수행하지 않습니다.':'아래 카메라 켜기 버튼을 누르고 브라우저의 카메라 접근을 허용하세요.';
  $('modeNotice').textContent=demo?'테스트 모드입니다. 표시되는 수치는 미리 준비한 예시이며, 웹캠이나 모델로 분석한 결과가 아닙니다.':'실제 카메라 모드입니다. 웹캠 화면을 확인할 수 있으며, 모델 탐지는 백엔드 연결 후 사용할 수 있습니다.';
  $('activity').textContent=demo?'테스트 시작 대기':'카메라 연결 대기';
  $('resultSubtitle').textContent=demo?'테스트 데이터 · 실제 탐지 아님':`현재 프레임 기준 · ${classes.length}개 클래스`;
  $('resultStatus').textContent=demo?'예시 결과를 기다리고 있습니다':'탐지 결과를 기다리고 있습니다';
}
$('cameraButton').addEventListener('click',async()=>{
  if(stream){stopCamera();$('activity').textContent='카메라가 꺼졌습니다';log('카메라 연결을 종료했습니다.');return;}
  if(connecting)return;
  const request=++generation;connecting=true;$('cameraButton').disabled=true;$('activity').textContent='카메라 접근 권한을 확인하고 있습니다';
  let acquired=null;
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('UNSUPPORTED');
    acquired=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
    if(request!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;$('video').srcObject=stream;await $('video').play();
    if(request!==generation)return;
    $('video').hidden=false;$('emptyState').hidden=true;$('cameraButton').textContent='카메라 끄기';
    $('cameraBadge').textContent='LIVE';$('cameraBadge').className='badge live';
    $('cameraSubtitle').textContent='노트북 웹캠 · 연결됨';$('resolution').textContent=`${$('video').videoWidth} × ${$('video').videoHeight}`;
    $('activity').textContent='웹캠 연결됨 · 실제 탐지는 백엔드 연결 필요';log('카메라가 연결됐습니다. 영상은 서버로 전송하지 않습니다.');
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===acquired){stopCamera();$('activity').textContent='카메라 연결이 해제됐습니다';log('카메라 연결이 해제됐습니다.');}});
  }catch(error){
    if(request!==generation)return;
    stopCamera();
    const messages={NotAllowedError:'카메라 권한이 차단됐습니다. 주소창의 사이트 권한에서 카메라를 허용한 뒤 다시 시도하세요.',NotFoundError:'연결된 카메라를 찾을 수 없습니다.',NotReadableError:'카메라를 열 수 없습니다. 다른 앱에서 사용 중인지 확인하세요.'};
    const message=messages[error.name]||(error.message==='UNSUPPORTED'?'이 환경에서 카메라를 사용할 수 없습니다. localhost 주소를 일반 브라우저로 열어 주세요.':'카메라 연결에 실패했습니다. 장치 연결과 브라우저 권한을 확인하세요.');
    $('activity').textContent=message;log(message);
  }finally{if(request===generation){connecting=false;$('cameraButton').disabled=false;}}
});
$('detectButton').addEventListener('click',()=>{
  if($('mode').value!=='demo')return;
  if(timer!==null){stopDemo();renderCounts();$('activity').textContent='테스트 중지됨';$('resultStatus').textContent='테스트 중지 · 현재 결과 없음';$('cameraBadge').textContent='PAUSED';log('테스트를 중지했습니다.');return;}
  log('테스트를 시작했습니다. 모든 수치는 예시 데이터입니다.');demoStep=0;
  const tick=()=>{const counts=samples[demoStep++%samples.length];renderCounts(counts);$('resultStatus').textContent=`예시 결과 갱신 · ${new Date().toLocaleTimeString('ko-KR',{hour12:false})}`;log('[테스트] '+classes.map((c,i)=>`${c.name} ${counts[i]}개`).join(' / '));};
  tick();timer=setInterval(tick,2500);$('detectButton').textContent='테스트 중지';$('activity').textContent='예시 데이터 표시 중 · 모델 미실행';$('cameraBadge').textContent='DEMO';
});
$('mode').addEventListener('change',()=>{setMode();log($('mode').value==='demo'?'테스트 데이터 모드로 전환했습니다.':'실제 카메라 모드로 전환했습니다.');});
$('clearLogs').addEventListener('click',()=>{logCount=0;$('logCount').textContent='0';$('logs').innerHTML='<div class="log-empty">로그를 지웠습니다.</div>';});
window.addEventListener('pagehide',()=>{stopDemo();stopCamera();});
setMode();
