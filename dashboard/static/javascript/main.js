let player = new Plyr('#player', {controls: []});

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
const checkbox = document.querySelector('input[type="checkbox"]')
const clearHistory = document.querySelector(".previous-remove")
const totalQueuedTime = document.querySelector(".queue-total-time")

let socket = io.connect('http://localhost:5000');


new Sortable(allMediaHolder, {
  onEnd: function (evt) {
    handleDragEnd(evt);
  }
});


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
  if (Object.keys(data).length !== 0) {
    updatePlayerItself(data["URL"], data["duration"], data["start_time"])
  } else {
    showBlankVideo()
  }
})

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});



// Functions ---->

function secondsToHumanReadable(seconds) {
  if (isNaN(seconds) || seconds < 0) {
      return "Invalid input";
  }

  let days = Math.floor(seconds / (24 * 60 * 60));
  let hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  let minutes = Math.floor((seconds % (60 * 60)) / 60);
  let remainingSeconds = seconds % 60;

  let result = "";

  if (days > 0) {
      result += days + (days === 1 ? " day" : " days");
      if (hours > 0 || minutes > 0 || remainingSeconds > 0) {
          result += " and ";
      }
  }

  if (hours > 0) {
      result += hours + (hours === 1 ? " hour" : " hours");
      if (minutes > 0 || remainingSeconds > 0) {
          result += " and ";
      }
  }

  if (minutes > 0) {
      result += minutes + (minutes === 1 ? " minute" : " minutes");
      if (remainingSeconds > 0) {
          result += " and ";
      }
  }

  if (remainingSeconds > 0) {
      result += remainingSeconds + (remainingSeconds === 1 ? " second" : " seconds");
  }

  return result;
}

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function handleCheckboxChange() {
  setCookie('autoplay', checkbox.checked, 30); // Save the state in a cookie for 30 days
}

function checkCheckboxState() {
  let checkboxState = getCookie('autoplay');
  if (checkboxState) {
    checkbox.checked = checkboxState === 'true';
  }
}

function handleDragEnd(evt) {
  let newArray = []
  Array.from(allMediaHolder.children).forEach(function(child) {
    itmId = parseInt(child.getAttribute("data-id"))
    newArray.push(itmId)
  })
  socket.emit("new-sequence", newArray)
}

function updateStartButtonIcon () {
  if (player.paused) {
      startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>`;
  } else {
      startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>`;
  }
}

function DetectVideoType(youtubeLink) {
  // Regular expression to match YouTube playlist URLs
  const playlistRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:[^\/\n\s]+\/)*(?:playlist\?|watch\?.*?list=)([a-zA-Z0-9_-]+)/;

  // Regular expression to match YouTube video URLs
  const videoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/)*(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/;

  // Regular expression to match YouTube short video URLs
  const shortVideoRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;

  if (playlistRegex.test(youtubeLink)) {
    return "Playlist";
  } else if (shortVideoRegex.test(youtubeLink)) {
    return "Short Video";
  } else if (videoRegex.test(youtubeLink)) {
    return "Normal Video";
  } else {
    return "Unknown";
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
  let totalTime = 0
  for (let key in data) {
    const vid = data[key]
    const newMediaEntry  = mediaQueueDummy.cloneNode(true)
    newMediaEntry.classList.remove('hidden');
    newMediaEntry.setAttribute("data-id", `${key}`);
    
    const newMediaTitle = newMediaEntry.querySelector(".media-title-bar")
    const newMediaDuration = newMediaEntry.querySelector(".media-title-duration")
    const newRemoveMedia = newMediaEntry.querySelector(".media-title-remove")
    

    newMediaTitle.innerHTML  = vid["title"]
    if (parseInt(vid["duration"])) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
      totalTime += vid["duration"]
    } else {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["video_length"])}`
      totalTime += vid["video_length"]
    }
    
    newRemoveMedia.addEventListener("click", function(event) {
      socket.emit("remove-video", key)
    })
    
    allMediaHolder.appendChild(newMediaEntry)
  }
  totalQueuedTime.innerHTML = `${secondsToHumanReadable(totalTime)}`
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

    if (parseInt(vid["duration"])) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
    } else {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["video_length"])}`
    }

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

  player.on('seeking', event => {
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

  
  player.on('timeupdate', event => {
    if (!player.paused) {
      const currentTime = player.currentTime;
      // Check if the current time exceeds the expected duration
      if (parseInt(duration) && parseInt(startTime)) {
        if (currentTime >= (parseInt(duration) + parseInt(startTime))) {
            if (checkbox.checked) {
                socket.emit("next-video", "SEND")
                setTimeout(()=> {
                    player.play();
                    socket.emit("play-signal-dash", "PLAY")
                }, 2000)
            } else {
              socket.emit("next-video", "SEND")
            }
        }
      }
  }
  
    // You can perform any other actions based on the current time here
  });
 

  player.on('ended', event => {
    if (checkbox.checked && parseInt(duration) == 0 && parseInt(startTime) == 0) {
      socket.emit("next-video", "SEND")
      setTimeout(()=> {
        player.play();
        socket.emit("play-signal-dash", "PLAY")
      }, 2000)
    } else {
      socket.emit("next-video", "SEND")
    }
  });

  player.on('pause', event => {
    updateStartButtonIcon()
  });


}

function timeToSeconds(timeString) {
  const timeParts = timeString.split(':').map(part => parseInt(part));
  let seconds = 0;

  // Add hours if provided
  if (timeParts.length === 3) {
      seconds += timeParts[0] * 3600; // 1 hour = 3600 seconds
      timeParts.shift(); // Remove hours from array
  }

  // Add minutes if provided
  if (timeParts.length >= 2) {
      seconds += timeParts[0] * 60; // 1 minute = 60 seconds
      timeParts.shift(); // Remove minutes from array
  }

  // Add remaining seconds if provided
  if (timeParts.length === 1) {
      seconds += timeParts[0];
  }

  return seconds;
}

function showBlankVideo() {
  player.destroy()
  player = new Plyr('#player', { controls: [] });
  socket.emit("show-blank-video-dash", "SEND")
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

function updatePlayAndPauseBtn() {
  if (player.paused) {
    player.play(); // Play the video if it's paused
    socket.emit("play-signal-dash", "PLAY")
  } else {
      player.pause(); // Otherwise, pause the video
      socket.emit("pause-signal-dash", "PLAY")
  }
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
    videoDuration = "0"
  }

  if (addVideoStartTime.value  == 0) {
    videoStartTime = "0"
  }

  
  if (DetectVideoType(videoLink) == "Playlist") {
    socket.emit("add-playlist-media", videoLink)
  } else {
    socket.emit("add-media", videoLink, timeToSeconds(videoDuration), timeToSeconds(videoStartTime))
  }

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
  showBlankVideo()
})

clearHistory.addEventListener("click", function() {
  socket.emit("remove-history", "SEND")
})

window.addEventListener('load', checkCheckboxState);
checkbox.addEventListener('change', handleCheckboxChange);
addMediaBtn.addEventListener('click', showBackShadowAndAddView)
cancelVideoBtn.addEventListener('click', hideBackShadowAndAddView)
backShadow.addEventListener('click', hideBackShadowAndAddView)