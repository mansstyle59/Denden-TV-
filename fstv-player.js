(function(){
  var RAW=(window.FSTV_SRC||"").replace(/&amp;/g,"&").trim();
  var NAME=window.FSTV_NAME||"";
  var ICON={
    play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    volHigh:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.2v2.06a7 7 0 010 13.48v2.06A9 9 0 0014 3.2z"/></svg>',
    volLow:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>',
    mute:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3l2.7-2.7-1.41-1.41-2.7 2.7-2.7-2.7-1.4 1.41 2.7 2.7-2.7 2.7 1.4 1.41 2.7-2.7 2.7 2.7 1.41-1.41z"/></svg>',
    fs:'<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    pip:'<svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm4 12V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>',
    gear:'<svg viewBox="0 0 24 24"><path d="M19.14 12.94a7.5 7.5 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.61-.22l-2.39.96a7 7 0 00-1.62-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 00-.61.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58a7.5 7.5 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96a.5.5 0 00.61-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z"/></svg>',
    swap:'<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    err:'<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
  };
  var $=function(i){return document.getElementById(i);};
  var stage=$("fstvStage"),v=$("fstvVideo"),poster=$("fstvPoster"),load=$("fstvLoad"),
      err=$("fstvErr"),nameEl=$("fstvName"),live=$("fstvLive"),lat=$("fstvLat"),
      pBtn=$("fstvPlay"),big=$("fstvBig"),mBtn=$("fstvMute"),vol=$("fstvVol"),fsBtn=$("fstvFs"),
      pip=$("fstvPip"),set=$("fstvSet"),qMenu=$("fstvQ"),qList=$("fstvQList");
  if(!stage)return;
  var plabel=poster?poster.querySelector(".fstv-plabel"):null;
  var hls=null,retry=0,hideT=null,sOpen=false,adFired=false,unmute=null,srcBtn=null,toastEl=null,toastT=null;
  var primaryId=(RAW.match(/[?&]id=([^&]+)/)||[])[1]||"";
  var SRC=RAW, sources=primaryId?[primaryId]:[], srcLabels=primaryId?[""]:[], srcIdx=0, srcFetched=false;
  function lblOf(o){var q=(o&&o.q&&o.q!=='None')?o.q:'';var tm={basic:'TNT',satellite:'Sat',cable:'Cable'};var t=(o&&tm[o.s])||'';var cm={'France':'FR','United Kingdom':'UK','Turkey':'TR','Arabia':'AR','Spain':'ES','Italy':'IT','Germany':'DE','Portugal':'PT','United States':'US','Netherlands':'NL','Belgium':'BE','Switzerland':'CH','Canada':'CA','Qatar':'QA','Saudi Arabia':'SA','Morocco':'MA','Algeria':'DZ','Tunisia':'TN'};var cc=(o&&o.ct)?(cm[o.ct]||(''+o.ct).substring(0,2).toUpperCase()):'';return [cc,q,t].filter(Boolean).join(' ');}
  function addSources(a){if(!a||!a.length)return;a.forEach(function(o){var id=(typeof o==='string')?o:(o&&o.id);if(!id)return;var lbl=(typeof o==='object'&&o)?lblOf(o):'';var k=sources.indexOf(id);if(k>=0){if(lbl&&!srcLabels[k])srcLabels[k]=lbl;return;}sources.push(id);srcLabels.push(lbl);});}
  var watchdog=null, everPlayed=false, blockedGate=false, switching=false;
  var phBytes=0,phDur=0,phFrags=0,phTried=0,phDone=false;
  var netFails=0;
  function ssvg(el,s){if(el)el.innerHTML=s;}
  function showUI(){stage.classList.add("ui");clearTimeout(hideT);if(!v.paused)hideT=setTimeout(function(){if(!sOpen&&!v.paused)stage.classList.remove("ui");},3200);}
  stage.addEventListener("mousemove",showUI);
  stage.addEventListener("mouseleave",function(){if(!v.paused&&!sOpen)stage.classList.remove("ui");});
  function showLoad(b){load.classList.toggle("on",b);}
  function showErr(m,r){err.querySelector(".fstv-err-msg").textContent=m;err.classList.add("on");showLoad(false);err.querySelector(".fstv-retry").style.display=(r===false?"none":"");}
  function hideErr(){err.classList.remove("on");}
  function toggle(){if(v.paused)v.play();else v.pause();}
  function fireAd(){if(adFired)return;adFired=true;if(typeof window.FSTV_AD_onFirstPlay==="function"){try{window.FSTV_AD_onFirstPlay();}catch(e){}}}
  function showUnmute(b){if(unmute)unmute.style.display=b?"flex":"none";}
  function doUnmute(){v.muted=false;if(v.volume===0)v.volume=1;updVol();showUnmute(false);fireAd();}
  function toast(m){if(!toastEl){toastEl=document.createElement("div");toastEl.className="fstv-toast";stage.appendChild(toastEl);}toastEl.textContent=m;toastEl.classList.add("on");clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove("on");},1800);}
  function clearWatch(){if(watchdog){clearTimeout(watchdog);watchdog=null;}}
  function armWatch(){clearWatch();if(everPlayed)return;watchdog=setTimeout(function(){if(!everPlayed&&!blockedGate)failover();},5000);}
  function failover(){
    clearWatch(); if(switching)return; switching=true;
    if(!srcFetched&&NAME){ srcFetched=true;
      fetch("/live.php?q=1&sources="+encodeURIComponent(NAME)).then(function(r){return r.json();}).then(function(a){
        addSources(a);
        updateSrcBtn();switching=false;nextSource();
      }).catch(function(){switching=false;nextSource();});
    }else{switching=false;nextSource();}
  }
  function nextSource(){srcIdx++;if(srcIdx<sources.length){SRC="/live.php?id="+sources[srcIdx];showLoad(true);init();}else{showErr("Aucune source disponible",true);}}
  function phCheck(){if(phDone)return;var k=phDur>0?(phBytes*8/phDur/1000):0;if((phFrags>=2&&k<250)||(phFrags>=1&&k>0&&k<120)){phDone=true;phSkip("Pub detectee");}else if(phFrags>=3&&k>=250){phDone=true;}}
  function phSkip(reason){ensureSources(function(){phTried++;if(phTried>=sources.length){return;}srcIdx=(srcIdx+1)%sources.length;everPlayed=false;phBytes=0;phDur=0;phFrags=0;phDone=false;SRC="/live.php?id="+sources[srcIdx];toast((reason||"Pub detectee")+", source "+(srcIdx+1)+"/"+sources.length);init();});}
  function ensureSources(cb){if(srcFetched||!NAME){if(cb)cb();return;}srcFetched=true;fetch("/live.php?q=1&sources="+encodeURIComponent(NAME)).then(function(r){return r.json();}).then(function(a){addSources(a);updateSrcBtn();if(cb)cb();}).catch(function(){if(cb)cb();});}
  function updateSrcBtn(){if(srcBtn)srcBtn.style.display=(sources.length>1)?"flex":"none";}
  function manualSwitch(){ensureSources(function(){if(sources.length<2){toast("Source unique");return;}srcIdx=(srcIdx+1)%sources.length;SRC="/live.php?id="+sources[srcIdx];everPlayed=false;toast("Source "+(srcIdx+1)+"/"+sources.length+(srcLabels[srcIdx]?" ("+srcLabels[srcIdx]+")":""));init();});}
  v.addEventListener("play",function(){stage.classList.add("playing");poster.classList.add("hide");ssvg(pBtn,ICON.pause);showUI();if(v.muted)showUnmute(true);});
  v.addEventListener("pause",function(){stage.classList.remove("playing");ssvg(pBtn,ICON.play);showUI();});
  v.addEventListener("waiting",function(){showLoad(true);});
  v.addEventListener("playing",function(){showLoad(false);hideErr();retry=0;everPlayed=true;blockedGate=false;phTried=0;netFails=0;clearWatch();});
  v.addEventListener("volumechange",function(){if(!v.muted)showUnmute(false);updVol();});
  function toggleMute(){if(v.muted){doUnmute();}else{v.muted=true;updVol();}}
  vol.addEventListener("input",function(){v.volume=parseFloat(this.value);v.muted=(v.volume===0);fireAd();updVol();});
  function updVol(){var m=v.muted||v.volume===0;ssvg(mBtn,m?ICON.mute:(v.volume<.5?ICON.volLow:ICON.volHigh));vol.value=m?0:v.volume;}
  function toggleFs(){var d=document,fe=d.fullscreenElement||d.webkitFullscreenElement;if(fe){(d.exitFullscreen||d.webkitExitFullscreen).call(d);}else if(stage.requestFullscreen){stage.requestFullscreen();}else if(stage.webkitRequestFullscreen){stage.webkitRequestFullscreen();}else if(v.webkitEnterFullscreen){v.webkitEnterFullscreen();}else if(v.requestFullscreen){v.requestFullscreen();}}
  function togglePip(){try{if(document.pictureInPictureElement)document.exitPictureInPicture();else v.requestPictureInPicture();}catch(e){}}
  function goLive(){if(hls&&isFinite(hls.liveSyncPosition))v.currentTime=hls.liveSyncPosition;v.play();}
  setInterval(function(){if(!hls)return;var lp=hls.liveSyncPosition;if(lp&&isFinite(lp)){var l=Math.max(0,Math.round(lp-v.currentTime));live.classList.toggle("behind",l>4);lat.textContent=l>4?("-"+l+"s"):"EN DIRECT";}},1000);
  function buildQ(){
  ensureSources(function(){
    qList.innerHTML="";
    var fl=qMenu.querySelector(".fstv-q-lbl"); if(fl) fl.style.display="none";
    if(sources.length){
      var h1=document.createElement("div");h1.className="fstv-q-lbl";h1.textContent="Source";qList.appendChild(h1);
      sources.forEach(function(sid,i){var d=document.createElement("div");d.className="fstv-qi"+(i===srcIdx?" act":"");d.textContent="Source "+(i+1)+(srcLabels[i]?" ("+srcLabels[i]+")":"");d.onclick=function(){tSet(false);if(i!==srcIdx){srcIdx=i;SRC="/live.php?id="+sources[i];everPlayed=false;toast("Source "+(i+1)+"/"+sources.length+(srcLabels[i]?" ("+srcLabels[i]+")":""));init();}};qList.appendChild(d);});
    }
    if(hls&&hls.levels&&hls.levels.length>1){
      var h2=document.createElement("div");h2.className="fstv-q-lbl";h2.style.marginTop="6px";h2.textContent="Qualite";qList.appendChild(h2);
      addQ("Auto",-1,hls.autoLevelEnabled);
      hls.levels.forEach(function(lv,i){addQ(lv.height?lv.height+"p":Math.round(lv.bitrate/1000)+"k",i,!hls.autoLevelEnabled&&hls.currentLevel===i);});
    }
  });
}
  function addQ(lb,idx,a){var d=document.createElement("div");d.className="fstv-qi"+(a?" act":"");d.textContent=lb;d.onclick=function(){hls.currentLevel=idx;tSet(false);};qList.appendChild(d);}
  function tSet(f){sOpen=(f===undefined?!sOpen:f);qMenu.classList.toggle("on",sOpen);set.classList.toggle("act",sOpen);if(sOpen){buildQ();showUI();}}
  function revealPlay(){blockedGate=true;clearWatch();showLoad(false);showUnmute(false);poster.classList.remove("hide");if(big)big.style.display="";if(plabel)plabel.style.display="";}
  function init(){
    hideErr();showLoad(true);retry=0;phBytes=0;phDur=0;phFrags=0;phDone=false;
    if(hls){try{hls.destroy();}catch(e){}hls=null;}
    if(window.Hls&&Hls.isSupported()){
      hls=new Hls({liveSyncDurationCount:3,liveDurationInfinity:true,enableWorker:true,backBufferLength:90,maxBufferLength:30,manifestLoadingMaxRetry:3,manifestLoadingRetryDelay:1000,levelLoadingMaxRetry:3,levelLoadingRetryDelay:1000,fragLoadingMaxRetry:3,fragLoadingRetryDelay:1000});
      hls.loadSource(SRC);hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED,function(){tryPlay();buildQ();});
      hls.on(Hls.Events.LEVEL_SWITCHED,buildQ);
      hls.on(Hls.Events.FRAG_BUFFERED,function(){showLoad(false);retry=0;});
      hls.on(Hls.Events.FRAG_LOADED,function(e,d){var f=d&&d.frag;if(!f)return;var b=(f.stats&&(f.stats.total||f.stats.loaded))||(d.payload&&d.payload.byteLength)||0;var du=f.duration||0;if(b>0&&du>0){phBytes+=b;phDur+=du;phFrags++;phCheck();}});
      hls.on(Hls.Events.ERROR,function(e,d){if(!d.fatal)return;
        if(!everPlayed&&!blockedGate){failover();return;}
        if(d.type===Hls.ErrorTypes.NETWORK_ERROR){netFails++;if(netFails>=2&&sources.length>1&&phTried<sources.length){netFails=0;phSkip("Source indispo");return;}if(retry<60){retry++;showLoad(true);setTimeout(function(){try{hls.startLoad();}catch(_){}}, 2500);}else showErr("Flux indisponible",true);}
        else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){try{hls.recoverMediaError();}catch(_){}}
        else showErr("Erreur de lecture",true);});
    }else if(v.canPlayType("application/vnd.apple.mpegurl")){
      v.src=SRC;v.addEventListener("loadedmetadata",tryPlay);
      v.addEventListener("error",function(){if(!everPlayed&&!blockedGate)failover();else showErr("Flux indisponible",true);});
    }else{showErr("HLS non supporte par ce navigateur",false);return;}
    armWatch();
  }
  function tryPlay(){var pr=v.play();if(pr&&pr.then){pr.then(function(){showLoad(false);}).catch(function(){v.muted=true;updVol();var p2=v.play();if(p2&&p2.catch)p2.catch(function(){revealPlay();});});}}
  function manualStart(){fireAd();blockedGate=false;v.muted=false;updVol();srcIdx=0;everPlayed=false;SRC=sources.length?("/live.php?id="+sources[0]):RAW;init();}
  if(big)big.onclick=manualStart;
  pBtn.onclick=toggle;mBtn.onclick=toggleMute;fsBtn.onclick=toggleFs;pip.onclick=togglePip;live.onclick=goLive;set.onclick=function(){tSet();};
  stage.addEventListener("click",function(e){if(e.target.closest(".fstv-ctrl")||e.target.closest(".fstv-top")||e.target.closest(".fstv-q")||e.target.closest(".fstv-err")||e.target.closest(".fstv-unmute"))return;fireAd();if(e.target.closest(".fstv-poster"))return;toggle();});
  document.addEventListener("click",function(e){if(sOpen&&!e.target.closest(".fstv-q")&&!e.target.closest("#fstvSet"))tSet(false);});
  document.addEventListener("keydown",function(e){var a=document.activeElement;if(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"))return;if(e.key===" "||e.key==="k"){e.preventDefault();fireAd();toggle();}else if(e.key==="f")toggleFs();else if(e.key==="m")toggleMute();else if(e.key==="l")goLive();else if(e.key==="s")manualSwitch();});
  ssvg(pBtn,ICON.play);ssvg(mBtn,ICON.mute);ssvg(fsBtn,ICON.fs);ssvg(pip,ICON.pip);ssvg(set,ICON.gear);err.querySelector(".fstv-eico").innerHTML=ICON.err;
  if(nameEl)nameEl.textContent=NAME;
  srcBtn=document.createElement("button");srcBtn.type="button";srcBtn.className="fstv-btn";srcBtn.title="Changer de source";srcBtn.innerHTML=ICON.swap;srcBtn.style.display="none";srcBtn.onclick=manualSwitch;
  if(set&&set.parentNode)set.parentNode.insertBefore(srcBtn,set);
  err.querySelector(".fstv-retry").onclick=function(){srcIdx=0;everPlayed=false;blockedGate=false;SRC=sources.length?("/live.php?id="+sources[0]):RAW;init();};
  if(!RAW){showErr("Aucun flux configure",false);poster.classList.add("hide");return;}
  if(big)big.style.display="none";
  if(plabel)plabel.style.display="none";
  unmute=document.createElement("button");unmute.type="button";unmute.className="fstv-unmute";unmute.style.display="none";unmute.innerHTML=ICON.mute+"<span>Activer le son</span>";
  unmute.addEventListener("click",function(e){e.stopPropagation();doUnmute();});
  stage.appendChild(unmute);
  var fsTr=document.createElement("button");fsTr.type="button";fsTr.className="fstv-fs-tr";fsTr.title="Plein ecran";fsTr.setAttribute("aria-label","Plein ecran");ssvg(fsTr,ICON.fs);fsTr.onclick=function(e){e.stopPropagation();toggleFs();};stage.appendChild(fsTr);
  v.muted=true;v.volume=1;updVol();showLoad(true);
  ensureSources(updateSrcBtn);
  init();
})();


(function(){
  var NAME=(window.FSTV_NAME||"").trim();
  var stage=document.getElementById("fstvStage");
  if(!NAME||!stage)return;
  var bar=document.createElement("div");
  bar.className="fstv-epg";bar.style.display="none";
  bar.innerHTML='<div class="fstv-epg-main"><span class="fstv-epg-live"><span class="dot"></span>EN DIRECT</span><span class="fstv-epg-time" id="fstvEpgT"></span><span class="fstv-epg-title" id="fstvEpgTitle"></span><span class="fstv-epg-rem" id="fstvEpgRem"></span></div><div class="fstv-epg-bar"><div class="fstv-epg-fill" id="fstvEpgFill"></div></div><div class="fstv-epg-next" id="fstvEpgNext"></div>';
  stage.insertAdjacentElement("afterend",bar);
  var cur=null,srvOff=0;
  function hhmm(ts){var d=new Date(ts*1000);return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}
  function srvNow(){return Math.floor(Date.now()/1000)+srvOff;}
  function esc(s){return (s||"").replace(/[&<>"]/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c];});}
  function render(){
    if(!cur){bar.style.display="none";return;}
    bar.style.display="";
    document.getElementById("fstvEpgT").textContent=hhmm(cur.start);
    document.getElementById("fstvEpgTitle").textContent=cur.title+(cur.sub_title?(" — "+cur.sub_title):"");
    var n=srvNow();var rem=Math.max(0,cur.stop-n);
    var prog=cur.duration_sec?Math.min(1,Math.max(0,(n-cur.start)/cur.duration_sec)):0;
    document.getElementById("fstvEpgFill").style.width=(prog*100).toFixed(1)+"%";
    document.getElementById("fstvEpgRem").textContent=rem>0?(Math.round(rem/60)+" min restant"):"";
    if(rem<=0){cur=null;load();}
  }
  function load(){
    fetch("/live.php?epg="+encodeURIComponent(NAME)).then(function(r){return r.json();}).then(function(d){
      if(!d||!d.current){bar.style.display="none";cur=null;return;}
      cur=d.current;srvOff=(cur.start+(cur.elapsed_sec||0))-Math.floor(Date.now()/1000);
      var nx=d.next;
      document.getElementById("fstvEpgNext").innerHTML=nx?('<span class="fstv-epg-next-arrow">›</span> <span class="fstv-epg-next-time">'+hhmm(nx.start)+'</span> '+esc(nx.title)):"";
      render();
    }).catch(function(){});
  }
  load();setInterval(render,1000);setInterval(load,60000);
})();