const L=window.L;const $=id=>document.getElementById(id);const nowLocal=new Date();$('activityDate').value=[nowLocal.getFullYear(),String(nowLocal.getMonth()+1).padStart(2,'0'),String(nowLocal.getDate()).padStart(2,'0')].join('-');$('activityTime').value=String(nowLocal.getHours()).padStart(2,'0')+':'+String(nowLocal.getMinutes()).padStart(2,'0');const activityStart=()=>{const date=$('activityDate').value,time=$('activityTime').value;if(!date||!time)throw Error('请选择活动日期和开始时间');return new Date(date+'T'+time+':00')};const map=L.map('map',{zoomControl:false}).setView([31.2304,121.4737],13);
const tiles=[L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}),L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap contributors, Tiles courtesy of Humanitarian OpenStreetMap Team'})];let layer=0;tiles[layer].addTo(map);let points=[],closed=false,sport='running';const lines=L.layerGroup().addTo(map),pins=L.layerGroup().addTo(map);const note=t=>$('notice').textContent=t,dist=(a,b)=>map.distance(a,b),total=()=>{let d=0;for(let i=1;i<points.length;i++)d+=dist(points[i-1],points[i]);if(closed&&points.length>2)d+=dist(points.at(-1),points[0]);return d},time=s=>{let h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=Math.floor(s%60);return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`};
function draw(){lines.clearLayers();pins.clearLayers();let p=closed&&points.length>2?[...points,points[0]]:points;if(p.length>1)L.polyline(p,{color:'#174d37',weight:5,lineCap:'round',lineJoin:'round'}).addTo(lines);points.forEach((x,i)=>L.circleMarker(x,{radius:i===0||i===points.length-1?7:5,color:'white',weight:3,fillColor:i===0?'#c36c42':'#174d37',fillOpacity:1}).bindTooltip(i===0?'起点':`点 ${i+1}`).addTo(pins));const km=total()/1000,pace=+$('pace').value,laps=+$('laps').value;$('pointCount').textContent=`${points.length} 个点`;$('distance').innerHTML=`${(km*laps).toFixed(2)} <i>km</i>`;$('duration').textContent=time(km*laps*pace);$('paceValue').textContent=`${Math.floor(pace/60)}:${String(pace%60).padStart(2,'0')} /km`;$('lapsValue').textContent=`${laps} 圈`;note(points.length<2?'点击地图添加路线点':`${points.length} 个路线点 · ${(km*laps).toFixed(2)} km`);$('undoBtn').disabled=!points.length;$('reverseBtn').disabled=points.length<2;$('closeBtn').disabled=points.length<3;$('clearBtn').disabled=!points.length}
map.on('click',e=>{points.push([e.latlng.lat,e.latlng.lng]);closed=false;draw()});$('undoBtn').onclick=()=>{points.pop();closed=false;draw()};$('reverseBtn').onclick=()=>{points.reverse();draw()};$('closeBtn').onclick=()=>{closed=!closed;draw()};$('clearBtn').onclick=()=>{points=[];closed=false;draw()};$('pace').oninput=draw;$('laps').oninput=draw;document.querySelectorAll('.sport').forEach(b=>b.onclick=()=>{document.querySelectorAll('.sport').forEach(x=>x.classList.remove('active'));b.classList.add('active');sport=b.dataset.sport;draw()});
async function search(){let q=$('searchInput').value.trim();if(!q)return;note('正在搜索地点…');try{let r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`),a=await r.json();if(!a.length)throw Error('没有找到这个地点');map.setView([+a[0].lat,+a[0].lon],15);$('mapLabel').textContent=a[0].display_name.split(',').slice(0,2).join(' · ');note('地点已定位，点击地图绘制')}catch(e){note(e.message||'搜索失败，请稍后重试')}}$('searchBtn').onclick=search;$('searchInput').onkeydown=e=>{if(e.key==='Enter')search()};$('locateBtn').onclick=()=>map.locate({setView:true,maxZoom:15});map.on('locationfound',()=>note('已定位到当前位置'));map.on('locationerror',()=>note('无法获取位置，请检查浏览器定位权限'));$('fitBtn').onclick=()=>points.length&&map.fitBounds(L.latLngBounds(points).pad(.18));$('layerBtn').onclick=()=>{map.removeLayer(tiles[layer]);layer=1-layer;tiles[layer].addTo(map)};
function course(){if(points.length<2)throw Error('请先在地图上添加至少两个路线点');let pts=points.map(p=>[...p]);if(closed&&pts.length>2)pts.push(pts[0]);let length=0,base=pts.map((p,i)=>{if(i)length+=dist(pts[i-1],p);return{lat:p[0],lon:p[1],meters:length}}),laps=+$('laps').value,pace=+$('pace').value,all=[];for(let n=0;n<laps;n++)base.forEach(p=>all.push({...p,meters:p.meters+n*length}));return{base,all,total:length*laps,elapsed:length*laps/1000*pace,pace}}
function save(name,data,type){let u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function gpx(){let c=course(),start=activityStart(),seconds=0,last=null,track=c.all.map(p=>{if(last)seconds+=dist([last.lat,last.lon],[p.lat,p.lon])*c.pace/1000;last=p;return`<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><ele>0</ele><time>${new Date(start.getTime()+seconds*1000).toISOString()}</time></trkpt>`}).join('');save('lanshan-run.gpx',`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Lanshan Run" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Lanshan Run</name><time>${start.toISOString()}</time></metadata><trk><name>Lanshan Run</name><type>${sport}</type><trkseg>${track}</trkseg></trk></gpx>`,'application/gpx+xml')}
function tcx(){let c=course(),start=activityStart(),seconds=0,last=null,track=c.all.map(p=>{if(last)seconds+=dist([last.lat,last.lon],[p.lat,p.lon])*c.pace/1000;last=p;return`<Trackpoint><Time>${new Date(start.getTime()+seconds*1000).toISOString()}</Time><Position><LatitudeDegrees>${p.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${p.lon.toFixed(7)}</LongitudeDegrees></Position><AltitudeMeters>0</AltitudeMeters><DistanceMeters>${p.meters.toFixed(2)}</DistanceMeters></Trackpoint>`}).join(''),type=sport==='running'?'Running':sport==='cycling'?'Biking':'Other';save('lanshan-run.tcx',`<?xml version="1.0" encoding="UTF-8"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="${type}"><Id>${start.toISOString()}</Id><Lap StartTime="${start.toISOString()}"><TotalTimeSeconds>${c.elapsed.toFixed(1)}</TotalTimeSeconds><DistanceMeters>${c.total.toFixed(2)}</DistanceMeters><Calories>0</Calories><Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod><Track>${track}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`,'application/vnd.garmin.tcx+xml')}
let fitSdkPromise;
async function getFitSdk(){
  if(!fitSdkPromise)fitSdkPromise=(async()=>{
    try{return await import('https://cdn.jsdelivr.net/npm/@garmin/fitsdk@21.222.0/+esm')}
    catch(firstError){
      try{return await import('https://esm.sh/@garmin/fitsdk@21.222.0?bundle')}
      catch(secondError){throw Error('Garmin FIT 编码器加载失败，请检查网络后重试（'+(secondError.message||firstError.message||'加载失败')+'）')}
    }
  })();
  return fitSdkPromise;
}
async function fit(){
  const {Encoder,Decoder,Stream,Profile,Utils}=await getFitSdk();
  const c=course(),start=activityStart(),t0=Utils.convertDateToDateTime(start),secondsPerMeter=+$('pace').value/1000;
  const sportName=sport==='running'?'running':sport==='cycling'?'cycling':'walking';
  const msgs=[
    {mesgNum:Profile.MesgNum.FILE_ID,type:'activity',manufacturer:'development',product:1,timeCreated:t0,serialNumber:1},
    {mesgNum:Profile.MesgNum.DEVICE_INFO,deviceIndex:'creator',manufacturer:'development',product:1,serialNumber:1,softwareVersion:1,timestamp:t0},
    {mesgNum:Profile.MesgNum.EVENT,timestamp:t0,event:'timer',eventType:'start'}
  ];
  let elapsedSeconds=0,last=null;
  for(const p of c.all){
    if(last)elapsedSeconds+=dist([last.lat,last.lon],[p.lat,p.lon])*secondsPerMeter;
    last=p;
    msgs.push({mesgNum:Profile.MesgNum.RECORD,timestamp:t0+Math.round(elapsedSeconds),positionLat:Math.round(p.lat*2147483648/180),positionLong:Math.round(p.lon*2147483648/180),distance:p.meters,enhancedSpeed:1/secondsPerMeter,enhancedAltitude:0});
  }
  const end=t0+Math.round(c.elapsed);
  msgs.push(
    {mesgNum:Profile.MesgNum.EVENT,timestamp:end,event:'timer',eventType:'stop'},
    {mesgNum:Profile.MesgNum.LAP,messageIndex:0,timestamp:end,startTime:t0,totalElapsedTime:c.elapsed,totalTimerTime:c.elapsed,totalDistance:c.total,sport:sportName,subSport:'generic'},
    {mesgNum:Profile.MesgNum.SESSION,messageIndex:0,timestamp:end,startTime:t0,totalElapsedTime:c.elapsed,totalTimerTime:c.elapsed,totalDistance:c.total,sport:sportName,subSport:'generic',firstLapIndex:0,numLaps:1},
    {mesgNum:Profile.MesgNum.ACTIVITY,timestamp:end,numSessions:1,localTimestamp:end-start.getTimezoneOffset()*60,totalTimerTime:c.elapsed}
  );
  const encoder=new Encoder();msgs.forEach(message=>encoder.writeMesg(message));
  const bytes=encoder.close(),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const decoder=new Decoder(Stream.fromArrayBuffer(buffer));
  if(!decoder.isFIT()||!decoder.checkIntegrity())throw Error('FIT 文件完整性校验失败');
  const result=decoder.read();
  if(result.errors?.length)throw Error('FIT 解码错误：'+result.errors.join('；'));
  const keys=Object.keys(result.messages||{}),findKey=prefix=>keys.find(key=>key.toLowerCase().startsWith(prefix));
  const recordKey=findKey('record');
  if(!recordKey||!findKey('session')||!findKey('lap'))throw Error('FIT 文件缺少轨迹、圈段或运动概要消息');
  save('lanshan-run.fit',bytes,'application/octet-stream');
  note('FIT 已编码并通过完整性校验 · '+result.messages[recordKey].length+' 个轨迹点');
}
document.querySelectorAll('.export-card').forEach(b=>b.onclick=()=>{try{if(b.dataset.format==='fit'){b.disabled=true;note('正在加载 Garmin FIT 编码器…');fit().catch(e=>note(e.message||'FIT 导出失败')).finally(()=>b.disabled=false)}else ({gpx,tcx})[b.dataset.format]()}catch(e){note(e.message)}});$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('gotIt').onclick=()=>$('helpDialog').close();draw();




function getBeijingDateString(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return v.year+'-'+v.month+'-'+v.day;
}
function planDayValue(d){return d.toISOString().slice(0,10)}
function shiftPlanDay(value,amount){const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return planDayValue(d)}
const planTomorrow=shiftPlanDay(getBeijingDateString(),1);
$('planStart').value=planTomorrow;
$('planEnd').value=shiftPlanDay(planTomorrow,13);
let planSchedule=null;
function clearPlanPreview(){planSchedule=null;$('downloadPlanZipBtn').disabled=true;$('planPreviewBody').innerHTML='<tr><td colspan="3">生成预览后显示安排</td></tr>'}
function formatPlanTime(minutes){return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')}
function randomPlanPreview(){
  try{
    course();
    const startValue=$('planStart').value,endValue=$('planEnd').value,count=Number($('planCount').value),format=$('planFormat').value;
    if(!startValue||!endValue)throw Error('请选择开始和结束日期');
    if(startValue>endValue)throw Error('结束日期不能早于开始日期');
    const first=new Date(startValue+'T00:00:00Z'),last=new Date(endValue+'T00:00:00Z'),days=Math.round((last-first)/86400000)+1;
    if(days<1||days>366)throw Error('日期范围最多选择一年');
    if(!Number.isInteger(count)||count<1||count>days)throw Error('计划天数需在 1 到 '+days+' 天之间');
    const available=Array.from({length:days},(_,i)=>shiftPlanDay(startValue,i));
    for(let i=available.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[available[i],available[j]]=[available[j],available[i]]}
    const entries=available.slice(0,count).map(date=>{
      const minutes=1080+Math.floor(Math.random()*121),time= formatPlanTime(minutes);
      const filename='lanshan-run-plan-'+date+'-'+time.replace(':','')+'.'+format;
      return{date,time,filename,minutes};
    }).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
    planSchedule={entries,format};
    $('planPreviewBody').innerHTML=entries.map(e=>'<tr><td>'+e.date+'</td><td>'+e.time+'</td><td>'+e.filename+'</td></tr>').join('');
    $('downloadPlanZipBtn').disabled=false;
    $('planStatus').textContent='已安排 '+entries.length+' 天 · 时间均为北京时间';
  }catch(e){clearPlanPreview();$('planStatus').textContent=e.message||'预览生成失败'}
}
function planTcxCourse(c,name){
  const pts=c.all,first=pts[0],last=pts[pts.length-1];
  const track=pts.map(p=>'<Trackpoint><Position><LatitudeDegrees>'+p.lat.toFixed(7)+'</LatitudeDegrees><LongitudeDegrees>'+p.lon.toFixed(7)+'</LongitudeDegrees></Position><AltitudeMeters>0</AltitudeMeters><DistanceMeters>'+p.meters.toFixed(2)+'</DistanceMeters></Trackpoint>').join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd"><Courses><Course><Name>'+esc(name)+'</Name><Lap><TotalTimeSeconds>'+c.elapsed.toFixed(1)+'</TotalTimeSeconds><DistanceMeters>'+c.total.toFixed(2)+'</DistanceMeters><BeginPosition><LatitudeDegrees>'+first.lat.toFixed(7)+'</LatitudeDegrees><LongitudeDegrees>'+first.lon.toFixed(7)+'</LongitudeDegrees></BeginPosition><EndPosition><LatitudeDegrees>'+last.lat.toFixed(7)+'</LatitudeDegrees><LongitudeDegrees>'+last.lon.toFixed(7)+'</LongitudeDegrees></EndPosition><Intensity>Active</Intensity></Lap><Track>'+track+'</Track></Course></Courses></TrainingCenterDatabase>';
}
async function planFitCourse(c,name,serial){
  const {Encoder,Decoder,Stream,Profile,Utils}=await getFitSdk();
  const baseTime=Utils.convertDateToDateTime(new Date('2000-01-01T00:00:00Z')),pts=c.all,first=pts[0],last=pts[pts.length-1];
  const msgs=[
    {mesgNum:Profile.MesgNum.FILE_ID,type:'course',manufacturer:'development',product:1,timeCreated:new Date(),serialNumber:serial},
    {mesgNum:Profile.MesgNum.COURSE,name,sport:'running',subSport:'generic'},
    {mesgNum:Profile.MesgNum.LAP,messageIndex:0,startTime:baseTime,timestamp:baseTime+Math.round(c.elapsed),totalElapsedTime:c.elapsed,totalTimerTime:c.elapsed,totalDistance:c.total,startPositionLat:Math.round(first.lat*2147483648/180),startPositionLong:Math.round(first.lon*2147483648/180),endPositionLat:Math.round(last.lat*2147483648/180),endPositionLong:Math.round(last.lon*2147483648/180),sport:'running',subSport:'generic'},
    {mesgNum:Profile.MesgNum.EVENT,timestamp:baseTime,event:'timer',eventType:'start'}
  ];
  let seconds=0,previous=null;
  for(const p of pts){
    if(previous)seconds+=dist([previous.lat,previous.lon],[p.lat,p.lon])*c.pace/1000;
    previous=p;
    msgs.push({mesgNum:Profile.MesgNum.RECORD,timestamp:baseTime+Math.round(seconds),positionLat:Math.round(p.lat*2147483648/180),positionLong:Math.round(p.lon*2147483648/180),distance:p.meters,speed:1000/c.pace});
  }
  msgs.push({mesgNum:Profile.MesgNum.EVENT,timestamp:baseTime+Math.round(c.elapsed),event:'timer',eventType:'stopDisableAll'});
  const encoder=new Encoder();msgs.forEach(m=>encoder.writeMesg(m));const bytes=encoder.close();
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),decoder=new Decoder(Stream.fromArrayBuffer(buffer));
  if(!decoder.isFIT()||!decoder.checkIntegrity())throw Error('FIT Course 文件完整性校验失败');
  const result=decoder.read();if(result.errors?.length)throw Error('FIT Course 解码错误：'+result.errors.join('；'));
  return bytes;
}
function planGpxRoute(c,name){
  const routePoints=c.all.map((p,i)=>'<rtept lat="'+p.lat.toFixed(7)+'" lon="'+p.lon.toFixed(7)+'"><name>路线点 '+(i+1)+'</name></rtept>').join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Lanshan Run" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>'+esc(name)+'</name><desc>计划路线，不是运动记录。</desc></metadata><rte><name>'+esc(name)+'</name><desc>GPX Route 规划路线，无活动时间戳。</desc>'+routePoints+'</rte></gpx>';
}
async function downloadPlanZip(){
  const button=$('downloadPlanZipBtn');button.disabled=true;
  try{
    if(!planSchedule)throw Error('请先生成预览');
    if(!window.JSZip)throw Error('ZIP 组件未加载，请检查网络后重试');
    const c=course(),zip=new JSZip(),rows=[],format=planSchedule.format;
    for(let i=0;i<planSchedule.entries.length;i++){
      const entry=planSchedule.entries[i],name='Run '+entry.date.slice(5).replace('-','')+' '+entry.time.replace(':','');
      let data;
      if(format==='tcx')data=planTcxCourse(c,name);
      else if(format==='fit')data=await planFitCourse(c,name,courseSerial(entry.filename));
      else data=planGpxRoute(c,name);
      zip.file('courses/'+entry.filename,data);
      rows.push([entry.date,entry.time,'Asia/Shanghai',format==='tcx'?'TCX Course':format==='fit'?'FIT Course':'GPX Route',filenameForPlan(entry.filename),(c.total/1000).toFixed(2)]);
      $('planStatus').textContent='正在生成路线课程 '+(i+1)+' / '+planSchedule.entries.length;
    }
    const quote=value=>'"'+String(value).replace(/"/g,'""')+'"';
    zip.file('training-plan.csv','\uFEFF'+['日期,北京时间,时区,文件类型,文件名,路线距离(km)',...rows.map(row=>row.map(quote).join(','))].join('\r\n'));
    zip.file('README.txt','Lanshan Run 计划路线包\r\n\r\nZIP 内包含 GPX Route、TCX Course 或 FIT Course 路线文件及计划表。它们描述规划路线，不是已完成运动记录。文件不含所选日期的活动时间戳；计划日期和北京时间仅列在文件名与 CSV 计划表中。\r\n');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    save('lanshan-run-plan-'+planSchedule.entries[0].date+'-'+planSchedule.entries.at(-1).date+'.zip',blob,'application/zip');
    $('planStatus').textContent='已打包 '+rows.length+' 个路线计划文件 · 日期时间为北京时间';
  }catch(e){$('planStatus').textContent=e.message||'计划 ZIP 生成失败'}
  finally{button.disabled=false}
}
function filenameForPlan(name){return name}
$('previewPlanBtn').onclick=randomPlanPreview;
$('downloadPlanZipBtn').onclick=downloadPlanZip;
['planStart','planEnd','planCount','planFormat'].forEach(id=>$(id).addEventListener('change',()=>{clearPlanPreview();$('planStatus').textContent='设置已变更，请重新生成预览'}));
