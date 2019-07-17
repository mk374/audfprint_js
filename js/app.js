
//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording
var context;
// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

//secondsCounter variable
var myVar;

//DATA10second counter variable
var dataVar;
var tenSecondArray = [];

function startRecording() {
	console.log("recordButton clicked");
	

	//SIMPLY TESTING MEASURES TO SEE HOW NUMPY WORKS IN JS
	// console.log(tenSecondArray);
	// console.log(tenSecondArray.shape);
	// for (let i = 0; i < tenSecondArray.shape; i++){
	// 	console.log(tenSecondArray.get(i));
	// }

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	recordButton.disabled = true;
	stopButton.disabled = false;
	pauseButton.disabled = false

	var seconds = 0

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		// console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		// /*
		// 	create an audio context after getUserMedia is called
		// 	sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
		// 	the sampleRate defaults to the one set in your OS for your playback device

		// */
		// audioContext = new AudioContext();
		
		// //update the format 
		// document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		// /*  assign to gumStream for later use  */
		// gumStream = stream;
		
		/* just a simple second counter */
		var el = document.getElementById('seconds');
		function incrementSeconds() {
			seconds += 1;
			el.innerText = "You have been recording for " + seconds + " seconds.";
		}
		myVar = setInterval(incrementSeconds, 1000);

		/* just a simple second counter*/


		// /* use the stream */
		// input = audioContext.createMediaStreamSource(stream);
		// /* 
		// 	Create the Recorder object and configure to record mono sound (1 channel)
		// 	Recording 2 channels  will double the file size
		// */
		// rec = new Recorder(input,{numChannels:1})
		// //start the recording process
		// rec.record()

		context = new AudioContext({
			sampleRate: 11025,
		});

		var source = context.createMediaStreamSource(stream);
		var processor = context.createScriptProcessor(1024, 1, 1);
	
		source.connect(processor);
		processor.connect(context.destination);

		console.log(context.sampleRate);
		processor.onaudioprocess = function(e) {
			channelData = e.inputBuffer.getChannelData(0)
			for(offset = 0; offset < channelData.length; offset++) {
				sample = Math.max(-1, Math.min(1, channelData[offset])); // clamp
				sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
				tenSecondArray.push(sample);
				document.getElementById('latest-audio').innerHTML = sample
			}

		};

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;
    	pauseButton.disabled = true
	});
}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	console.log("stopButton clicked");
	clearInterval(myVar);
	context.close()
	//disable the stop button, enable the record too allow for new recordings
	stopButton.disabled = true;
	recordButton.disabled = false;
	pauseButton.disabled = true;

	//reset button just in case the recording is stopped while paused
	pauseButton.innerHTML="Pause";
	// console.log(tenSecondArray);

	var fftData = nj.float32(tenSecondArray);
	// download(fftData);

	let data = frame(fftData, 512, 256);
	
	// ------------------------------------------------------------------------------------>
	//COMPUTING HASHES HERE
	var analyzer = new Analyzer();
	// analyzer.findpeaks([2,3]);



	// //tell the recorder to stop the recording
	// rec.stop();

	// //stop microphone access
	// gumStream.getAudioTracks()[0].stop();

	// //create the wav blob and pass it on to createDownloadLink
	// rec.exportWAV(createDownloadLink);
}
  
  
 function download(data) {
	 var csv = "";
	 for (let i = 0; i < data.size; i++){
		 csv += data.get(i)
		 csv += "\n";
	 }
	 var hiddenElement = document.createElement('a');
	 hiddenElement.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv);
	 hiddenElement.download = 'people.txt';
	 hiddenElement.click();
 }


function createDownloadLink(blob) {
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;
	console.log(au)

	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename+".wav "))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
		          console.log("Server returned: ",e.target.responseText);
		      }
		  };
		  var fd=new FormData();
		  fd.append("audio_data",blob, filename);
		  xhr.open("POST","upload.php",true);
		  xhr.send(fd);
	})
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(upload)//add the upload link to li

	//add the li element to the ol
	recordingsList.appendChild(li);
}