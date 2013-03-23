// http://dev.w3.org/2011/webrtc/editor/webrtc.html

var statusBar = document.getElementById('status');
var clientsCount = document.getElementById('client_count');

var videoLocal = document.getElementById('sourcevid');
var videoRemote = document.getElementById('remotevid');

/***********************/

var webSocketServer = "ws://42pix.local:8080";
var peerConnectionConfiguration = { iceServers: [{ url: 'stun:stun.l.google.com:19302' }] };

var STATES = { WAITING: 'Waiting other client', IN_PROGRESS: 'Connection in progress...', CONNECTED: 'Connected', ERROR: 'Error' };

/***********************/

var localStream;
var webSocket;
var peerConnection;

/***********************/

startVideo();

function setStatus(state){
  statusBar.innerHTML = state;
}

function clearContext(){
  videoRemote.src = '';

  if(webSocket){
    webSocket.close();
  }
  if(peerConnection){
    peerConnection.close();
  }

  webSocket = null;
  peerConnection = null;
}

/***********************/

function startVideo(){
  navigator.webkitGetUserMedia({audio: true, video: true}, onStartVideoSuccess, onStartVideoError);
}

function onStartVideoSuccess(stream){
  console.log("Local video started");
  localStream = stream;
  videoLocal.src = window.webkitURL.createObjectURL(stream);

  startNewConnection();
}

function onStartVideoError(){
  console.log("Cannot start video");
  setStatus(STATES.ERROR);
}

function onStreamLocalEnded(){
  console.log("Stream local ended");
  setStatus(STATES.ERROR);
}

/***********************/

function startNewConnection(){
  clearContext();

  webSocket = new WebSocket(webSocketServer);

  webSocket.onopen = onSocketOpen;
  webSocket.onerror = onSocketError;
  webSocket.onclose = onSocketClose;
  webSocket.onmessage = onSocketMessage;
}

function onSocketOpen(){
  console.log("Socket open");
  setStatus(STATES.WAITING);
}

function onSocketError(){
  console.log("Socket error");
  setStatus(STATES.ERROR);
}

function onSocketClose(){
  console.log("Socket close");
}

function onSocketMessage(event){
  var message = JSON.parse(event.data);
  console.log("RECEIVE: " + message.type);

  if(message.type == 'do_call'){
    createPeerConnection();
    peerConnection.addStream(localStream);
    peerConnection.createOffer(onPeerConnectionCreateOfferSuccess, onPeerConnectionCreateOfferError);
  }else if(message.type == 'offer'){
    createPeerConnection();
    peerConnection.addStream(localStream);
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    peerConnection.createAnswer(onPeerConnectionCreateAnswerSuccess, onPeerConnectionCreateAnswerError, null);
  }else if(message.type == 'answer'){
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
  }else if(message.type == 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.sdpMLineIndex, 
      candidate: message.candidate, 
      sdpMid: message.sdpMid
    });
    peerConnection.addIceCandidate(candidate);
  }else if(message.type == 'clients_count'){
    clientsCount.innerHTML = message.count;
  }else{
    console.log("Unknow message: " + message.type);
  }
}

/***********************/

function createPeerConnection(){
  console.log("createPeerConnection");
  setStatus(STATES.IN_PROGRESS);

  peerConnection = new webkitRTCPeerConnection(peerConnectionConfiguration);
  peerConnection.onicecandidate = onPeerConnectionIceCandidate;
  peerConnection.onaddstream = onPeerConnectionAddStream;
  peerConnection.removestream = onPeerConnectionRemoveStream;
}

function peerConnectionSendMessage(message) {
  var json = JSON.stringify(message);
  console.log("SEND: " + json);
  webSocket.send(json);
}

function onPeerConnectionIceCandidate(peerConnectionIceEvent){
  console.log("onPeerConnectionIceCandidate");
  if(peerConnectionIceEvent.candidate){
    peerConnectionSendMessage({
      type: 'candidate', 
      sdpMLineIndex: peerConnectionIceEvent.candidate.sdpMLineIndex,
      sdpMid: peerConnectionIceEvent.candidate.sdpMid,
      candidate: peerConnectionIceEvent.candidate.candidate
    });
  }
}

function onPeerConnectionAddStream(mediaStreamEvent){
  console.log("onPeerConnectionAddStream");
  videoRemote.src = window.webkitURL.createObjectURL(mediaStreamEvent.stream);
  setStatus(STATES.CONNECTED);
}

function onPeerConnectionRemoveStream(mediaStreamEvent){
  console.log("onPeerConnectionRemoveStream");
}

function onPeerConnectionCreateOfferSuccess(sessionDescription){
  console.log("onPeerConnectionCreateOfferSuccess");
  peerConnection.setLocalDescription(sessionDescription);
  peerConnectionSendMessage(sessionDescription);
}

function onPeerConnectionCreateOfferError(error){
  console.log("onPeerConnectionCreateOfferError");
  setStatus(STATES.ERROR);
}

function onPeerConnectionCreateAnswerSuccess(sessionDescription){
  console.log("onPeerConnectionCreateAnswerSuccess");
  peerConnection.setLocalDescription(sessionDescription);
  peerConnectionSendMessage(sessionDescription);
}

function onPeerConnectionCreateAnswerError(error){
  console.log("onPeerConnectionCreateAnswerError");
  setStatus(STATES.ERROR);
}
