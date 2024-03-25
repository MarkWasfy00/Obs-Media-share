let player = new Plyr('#player', {controls: []});

// player.on('ready', () => {
//   updatePlayerProgressBar()

// });
// player.on('play', updateStartButtonIcon);
// player.on('pause', updateStartButtonIcon);

// Get references to the buttons and the progress bar
const startBtn = document.getElementById('startBtn');
const backShadow = document.querySelector(".backshadow")
const addMediaBtn = document.querySelector(".queued-add")
const addVideoView = document.querySelector(".add-media-layout")
const addVideoBtn = document.querySelector(".add-video")
const addVideoLink = document.querySelector("#youtube-link-title")
const addVideoDuration = document.querySelector("#youtube-link-duration")
const addVideoStartTime = document.querySelector("#youtube-link-start-time")
const cancelVideoBtn = document.querySelector(".cancel")
const mediaQueueDummy = document.querySelector(".media-bar")
const allMediaHolder = document.querySelector(".all-media")
const AllPreviousMediaHolder = document.querySelector(".all-previous-media")
const previousMediaDummy  = document.querySelector(".previous-media-bar")
const forwardBtn = document.querySelector(".forward")
const backwardBtn = document.querySelector(".backward")
const iframeVideo = document.querySelector("#iframe-video")
const RemoveAllQueuedBtn = document.querySelector(".queued-remove")

let socket = io.connect('http://85.239.240.70:5000');


socket.on('connect', function() {
  console.log('Connected from server');
});

socket.on('handle-queued-data', function(data) {
  update_queued_data(data)
});

socket.on('handle-previous-data', function(data) {
  update_previous_data(data)
});

socket.on('handle-current-data', function(data) {
  updatePlayerItself(data["URL"], data["duration"], data["start_time"])
});

socket.on('handle-video', function(data) {
  updatePlayerItself(data["current_video"]["URL"], data["current_video"]["duration"], data["current_video"]["start_time"])
  update_queued_data(data["queued_media"])
  update_previous_data(data["previous_media"])
})

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});





// Functions ---->
function updateStartButtonIcon () {
  if (player.paused) {
      startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>`;
  } else {
      startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>`;
  }
}

function updateStartButtonIconFix () {
  startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>`;
}

function hideBackShadowAndAddView () {
  backShadow.style.display = 'none'
  addVideoView.style.display = 'none'
}

function showBackShadowAndAddView () {
  backShadow.style.display = 'block'
  addVideoView.style.display = 'flex'
}

function clearInputsAndHideShadow () {
  addVideoLink.value = ""
  addVideoDuration.value = ""
  addVideoStartTime.value = ""
  hideBackShadowAndAddView()
}

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

function update_queued_data(data) {
  allMediaHolder.innerHTML = ""
  for (let key in data) {
    const vid = data[key]
    const newMediaEntry  = mediaQueueDummy.cloneNode(true)
    newMediaEntry.classList.remove('hidden');
    
    const newMediaTitle = newMediaEntry.querySelector(".media-title-bar")
    const newMediaDuration = newMediaEntry.querySelector(".media-title-duration")

    newMediaTitle.innerHTML  = vid["title"]
    newMediaDuration.innerHTML = `for ${vid["duration"]} seconds`
    allMediaHolder.appendChild(newMediaEntry)
  }
}

function update_previous_data(data) {
  AllPreviousMediaHolder.innerHTML = ""
  for (let key in data) {
    const vid = data[key]
    const newMediaEntry  = previousMediaDummy.cloneNode(true)
    newMediaEntry.classList.remove('hidden');
    
    const newMediaTitle = newMediaEntry.querySelector(".media-title-bar")
    const newMediaDuration = newMediaEntry.querySelector(".media-title-duration")

    newMediaTitle.innerHTML  = vid["title"]
    newMediaDuration.innerHTML = `for ${vid["duration"]} seconds`
    AllPreviousMediaHolder.appendChild(newMediaEntry)
  }
}

function updatePlayerItself(newYouTubeLink, duration, startTime) {
  let hasInitialized = false;
  let vidCode = extractYouTubeVideoCode(newYouTubeLink)
  player.destroy()

  player = new Plyr('#player', {
    controls: ['progress', 'volume'],
    duration: (parseInt(startTime) + parseInt(duration)),
    youtube: {
      noCookie: true,
      start: parseInt(startTime),
      videoId: extractYouTubeVideoCode(newYouTubeLink)
    }
  });

   // Listen for seeked event
  player.on('seeked', event => {
    const currentTime = player.currentTime;
    socket.emit("time-signal-dash", currentTime);
  });

  player.on('volumechange', event => {
    // Print 'Hello' when the volume changes
    const volume =  player.volume 
    socket.emit("volume-signal-dash", volume)
  });

  player.on('ready', () => {
    if (!hasInitialized) {
      player.source = {
        type: 'video',
        sources: [
          {
            src: vidCode,
            provider: 'youtube',
          },
        ]
      };
      hasInitialized = true;
    }
    updatePlayerProgressBar();
    
  
  
  });

  player.on('play', event => {
    const currentTime = player.currentTime;
    updateStartButtonIcon()
    socket.emit("time-signal-dash", currentTime);
  });
  
  player.on('pause', updateStartButtonIcon);


}

function updatePlayerProgressBar() {
  try {
    const playingBarHolder = document.querySelector(".playing-bar")
    const newPlayingBar = document.querySelector(".plyr__progress__container")
    

    const volumeBarHolder = document.querySelector(".volume")
    const newVolumeBar = document.querySelector(".plyr__volume")

    
    playingBarHolder.innerHTML = ""
    volumeBarHolder.innerHTML = ""
    
    if (playingBarHolder) {
      playingBarHolder.appendChild(newPlayingBar);
      volumeBarHolder.appendChild(newVolumeBar)
    }
  } catch {}
}

//event listeners
startBtn.addEventListener('click', function() {
  if (player.paused) {
      player.play(); // Play the video if it's paused
      socket.emit("play-signal-dash", "PLAY")
  } else {
      player.pause(); // Otherwise, pause the video
      socket.emit("pause-signal-dash", "PLAY")
  }
});

addVideoBtn.addEventListener('click', function() {
  let videoLink = addVideoLink.value
  let videoDuration = addVideoDuration.value
  let videoStartTime = addVideoStartTime.value

  if (addVideoDuration.value  == 0) {
    videoDuration = 0
  }

  if (addVideoStartTime.value  == 0) {
    videoStartTime = 0
  }

  socket.emit("add-media", videoLink, videoDuration, videoStartTime)
  clearInputsAndHideShadow()
})

forwardBtn.addEventListener("click", function() {
  socket.emit("next-video", "SEND")
})

backwardBtn.addEventListener("click", function() {
  socket.emit("previous-video", "SEND")
})

RemoveAllQueuedBtn.addEventListener("click", function() {
  socket.emit("remove-all-queued-video", "SEND")
})

addMediaBtn.addEventListener('click', showBackShadowAndAddView)
cancelVideoBtn.addEventListener('click', hideBackShadowAndAddView)
backShadow.addEventListener('click', hideBackShadowAndAddView)