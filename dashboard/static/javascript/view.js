let socket = io.connect('http://85.239.240.70:5000');
// let player = new Plyr('#player', {controls: []});
let player;

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

function onYouTubeIframeAPIReady(vidCode) {
  if (player) {
    player.destroy(); // Destroy the existing player if it exists
  } 
  player = new YT.Player('player', {
    videoId: vidCode, // Replace VIDEO_ID_HERE with the ID of your YouTube video
    height: "100%",
    width: "100%",
    playerVars: {
      'autoplay': 0, // 1 to autoplay
      'controls': 0, // 0 to hide controls
      // Additional parameters can be added as needed
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.setPlaybackQuality('hd720');
}

// The API calls this function when the player's state changes.
function onPlayerStateChange(event) {
  // You can do things here based on the player's state, like track when the video ends.
  if (event.data == YT.PlayerState.ENDED) {
    // Do something when the video ends
  }
}

function reloadPage() {
  location.reload(); // Reload the page
}


socket.on('update-data', function(url) {
    const vidCode  = extractYouTubeVideoCode(url)
    onYouTubeIframeAPIReady(vidCode)
    
});

socket.on('play-signal', function(data) {
  if (player) {
    player.playVideo();
  }
});

socket.on('pause-signal', function(data) {
  if (player) {
    player.pauseVideo();
  }
});

socket.on('time-signal', function(currentTime) {
  if (player) {
    player.seekTo(currentTime, true); // Set the current time in seconds
  }
});

socket.on('volume-signal', function(currentVol) {
  if (player) {
    let vol = currentVol * 100
    player.setVolume(vol); // Set the volume (0 to 100)
  }
});

socket.on("blank-signal", function(data) {
  player.destroy()
})

















