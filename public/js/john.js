// http://dev.w3.org/2011/webrtc/editor/webrtc.html
// http://www.webrtc.org/interop

// http://habrahabr.ru/post/171477/

var statusBar = document.getElementById('status');
var clientsCount = document.getElementById('client_count');

var videoLocal = document.getElementById('sourcevid');
var videoRemote = document.getElementById('remotevid');

/***********************/

var webSocketServer = "ws://" + window.location.hostname + ":3000";
var peerConnectionConfiguration = { iceServers: [{ url: 'stun:stun.l.google.com:19302' }] };

var STATES = { WAITING: 'Waiting other client', IN_PROGRESS: 'Connection in progress...', CONNECTED: 'Connected', ERROR: 'Error', UNSUPPORTED: 'Your navigator is unsupported' };

/***********************/

var localStream;
var webSocket;
var peerConnection;

/***********************/

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
  compatGetUserMedia({ audio: true, video: true }, onStartVideoSuccess, onStartVideoError);
}

function onStartVideoSuccess(stream){
  console.log("Local video started");

  localStream = stream;
  setStreamToElement(stream, videoLocal);
  videoLocal.play();

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

  console.log("RECEIVE: " + event.data);

  if(message.type == 'do_call'){
    createPeerConnection();
    peerConnection.addStream(localStream);
    peerConnection.createOffer(onPeerConnectionCreateOfferSuccess, onPeerConnectionCreateOfferError);
  }else if(message.type == 'offer'){
    createPeerConnection();
    peerConnection.addStream(localStream);
    peerConnection.setRemoteDescription(compatRTCSessionDescription(message));
    peerConnection.createAnswer(onPeerConnectionCreateAnswerSuccess, onPeerConnectionCreateAnswerError, null);
  }else if(message.type == 'answer'){
    peerConnection.setRemoteDescription(compatRTCSessionDescription(message));
  }else if(message.type == 'candidate') {
    var candidate = compatRTCIceCandidate({
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

  peerConnection = compatRTCPeerConnection(peerConnectionConfiguration);
  peerConnection.onicecandidate = onPeerConnectionIceCandidate;
  peerConnection.onaddstream = onPeerConnectionAddStream;
  peerConnection.onremovestream = onPeerConnectionRemoveStream;
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
  setStreamToElement(mediaStreamEvent.stream, videoRemote);
  videoRemote.play();
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

/***********************/

function compatGetUserMedia(constraints, onStartVideoSuccess, onStartVideoError){
  if(navigator.webkitGetUserMedia){
    // Chrome
    navigator.webkitGetUserMedia(constraints, onStartVideoSuccess, onStartVideoError);
  }else if(navigator.mozGetUserMedia){
    // Firefox, need media.peerconnection.enabled = true
    navigator.mozGetUserMedia(constraints, onStartVideoSuccess, onStartVideoError);
  }else{
    console.log('Navigator unsupported: getUserMedia');
    setStatus(STATES.UNSUPPORTED);
  }
}

function setStreamToElement(stream, element){
  if(element.mozSrcObject){
    // Firefox
    element.mozSrcObject = stream;
  }else{
    element.src = URL.createObjectURL(stream);
  }
}

function compatRTCPeerConnection(peerConnectionConfiguration){
  if(typeof webkitRTCPeerConnection !== 'undefined'){
    // Chrome
    return new webkitRTCPeerConnection(peerConnectionConfiguration);
  }else if(typeof mozRTCPeerConnection !== 'undefined'){
    // Firefox
    return new mozRTCPeerConnection(peerConnectionConfiguration);
  }else{
    console.log('Navigator unsupported: RTCPeerConnection');
    setStatus(STATES.UNSUPPORTED);
    return null;
  }
}

function compatRTCSessionDescription(sessionDescription){
  if(typeof mozRTCSessionDescription !== 'undefined'){
    // Firefox
    return new mozRTCSessionDescription(sessionDescription);
  }else if(typeof RTCSessionDescription !== 'undefined'){
    // Chrome
    return new RTCSessionDescription(sessionDescription);
  }else{
    console.log('Navigator unsupported: RTCSessionDescription');
    setStatus(STATES.UNSUPPORTED);
    return null;
  }
}

function compatRTCIceCandidate(candidateInitDict){
  if(typeof mozRTCIceCandidate !== 'undefined'){
    // Firefox
    return new mozRTCIceCandidate(candidateInitDict);
  }else if(typeof RTCIceCandidate !== 'undefined'){
    // Chrome
    return new RTCIceCandidate(candidateInitDict);
  }else{
    console.log('Navigator unsupported: RTCIceCandidate');
    setStatus(STATES.UNSUPPORTED);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', function (){
  statusBar = document.getElementById('status');
  clientsCount = document.getElementById('client_count');

  videoLocal = document.getElementById('sourcevid');
  videoRemote = document.getElementById('remotevid');

  startVideo();
});
