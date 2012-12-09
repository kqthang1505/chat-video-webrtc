var sourcevid = document.getElementById('sourcevid');
var remotevid = document.getElementById('remotevid');
var status_coonection = document.getElementById('status');
var client_count = document.getElementById('client_count');

var stunServer = "stun.l.google.com:19302";
var socketServer = "ws://127.0.0.1:8080";

var mediaConstraints = {'has_audio':true, 'has_video':true};

var socket;
var localStream = null;
var peerConn = null;

var STATES = {WAITING:'Waiting other client', IN_PROGRESS:'Connection in progress...', CONNECTED:'Connected', ERROR_NAV:'Your navigator is not compatible'};

var logg = function(s) { console.log(s); };

function updateState(current_state){
  console.log(current_state);
  status_coonection.innerHTML = current_state;
}

function startVideo(){
  function successCallback(stream) {
    sourcevid.src = window.webkitURL.createObjectURL(stream);
    sourcevid.style.webkitTransform = "rotateY(180deg)";
    localStream = stream;

    socket = new WebSocket(socketServer);
    socket.addEventListener("message", onMessage, false);
    updateState(STATES.WAITING);
  }
  function errorCallback(error) {
    logg('An error occurred: [CODE ' + error.code + ']');
    updateState(STATES.ERROR_NAV);
  }
  try {
    navigator.webkitGetUserMedia({audio: true, video: true}, successCallback, errorCallback);
  }catch(e) {
    try{
      navigator.webkitGetUserMedia("video,audio", successCallback, errorCallback);
    }catch(e){
      updateState(STATES.ERROR_NAV);
    }
  }
}

function sendMessage(message) {
  var mymsg = JSON.stringify(message);
  logg("SEND: " + mymsg);
  socket.send(mymsg);
}

function setLocalAndSendMessage(sessionDescription) {
  peerConn.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function onIceCandidate(event) {
  if(event.candidate){
    sendMessage({type: 'candidate', sdpMLineIndex: event.candidate.sdpMLineIndex, sdpMid: event.candidate.sdpMid, candidate: event.candidate.candidate});
  }else{
    logg("End of candidates");
  }
}

function onRemoteStreamAdded(event) {
  logg("Added remote stream");
  remotevid.src = window.webkitURL.createObjectURL(event.stream);
  updateState(STATES.CONNECTED);
}

function onRemoteStreamRemoved(event) {
  logg("Remove remote stream");
  next();
}

function createPeerConnection(){
  try {
    updateState(STATES.IN_PROGRESS);
    logg("Creating peer connection");
    peerConn = new webkitRTCPeerConnection({'iceServers':[{'url':'stun:' + stunServer}]});
    peerConn.onicecandidate = onIceCandidate;
    peerConn.onaddstream = onRemoteStreamAdded;
    peerConn.onremovestream = onRemoteStreamRemoved;
  }catch(e){
    logg("Failed to create PeerConnection, exception: " + e.message);
  }
}

function onMessage(event) {
  logg("RECEIVED: " + event.data);

  var msg = JSON.parse(event.data);

  if(msg.type == 'client_count'){
    client_count.innerHTML = msg.value;
  }else if(msg.type == 'do_call'){
    createPeerConnection();
    peerConn.addStream(localStream);
    peerConn.createOffer(setLocalAndSendMessage, null, mediaConstraints);
  }else if(msg.type == 'wait'){
    if(peerConn){
      peerConn.close();
    }
    peerConn = null;
    remotevid.src = ''; 
    updateState(STATES.WAITING);
  }else if(msg.type == 'offer'){
    createPeerConnection();
    peerConn.addStream(localStream);
    peerConn.setRemoteDescription(new RTCSessionDescription(msg));
    peerConn.createAnswer(setLocalAndSendMessage, null, mediaConstraints);
  }else if(peerConn){
    if(msg.type == 'answer'){
      peerConn.setRemoteDescription(new RTCSessionDescription(msg));
    }else if(msg.type == 'candidate') {
      var candidate = new RTCIceCandidate({sdpMLineIndex:msg.sdpMLineIndex, candidate:msg.candidate, sdpMid: msg.sdpMid});
      peerConn.addIceCandidate(candidate);
    }else{
      console.log('Message unknown with peer: ' + msg.type);
    }    
  }else{
    console.log('Message unknown: ' + msg.type);
  }  
}

startVideo();

function next(){
  if(peerConn){
    peerConn.close();
  }
  peerConn = null;
  remotevid.src = ''; 

  if(socket){
    socket.close();
  }

  socket = new WebSocket(socketServer);
  socket.addEventListener();
  socket.addEventListener("message", onMessage, false);
  updateState(STATES.WAITING);

  document.getElementById('next').href = "javascript:true;";
  setTimeout(onOpen, 2000);
}
 
function onOpen(){
  document.getElementById('next').href = "javascript:next();";
}