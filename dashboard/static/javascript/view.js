let socket = io.connect('http://localhost:5000');
let player = new Plyr('#player', {controls: []});

function extractYouTubeVideoCode(url) {
  // Regular expression to match the video code in the URL
  var regex = /[?&]v=([^&]+)/;
  var match = url.match(regex);
  
  if (match && match[1]) {
      // Extracted video code
      return match[1];
  } else {
      // If the URL doesn't match the expected format
      return null;
  }
}


socket.on('update-data', function(url) {
    const vidCode  = extractYouTubeVideoCode(url)
    player.source = {
        type: 'video',
        sources: [
          {
            src: vidCode,
            provider: 'youtube',
          },
        ]
    };
});


socket.on('play-signal', function(data) {
  player.play();
});

socket.on('pause-signal', function(data) {
  player.pause();
});

socket.on('time-signal', function(currentTime) {
  player.currentTime = currentTime
});

socket.on('volume-signal', function(currentVol) {
  player.volume = currentVol
});