let player = new Plyr('#player', {controls: []});

const startBtn = document.getElementById('startBtn');
const backShadow = document.querySelector(".backshadow")
const addMediaBtn = document.querySelector(".queued-add")
const addVideoView = document.querySelector(".add-media-layout")
const addVideoBtn = document.querySelector(".add-video")
const addVideoLink = document.querySelector("#youtube-link-title")
const addVideoDuration = document.querySelector("#youtube-link-duration")
const addVideoStartTime = document.querySelector("#youtube-link-start-time")
const cancelBtns = document.querySelectorAll(".cancel")
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
const expandableQueue = document.querySelector(".queued-expand-icon")
const previousQueue = document.querySelector(".previous-expand-icon")
const QueuedTotalVideos = document.querySelector(".queue-total-videos")
const playingViewTitle = document.querySelector(".playing-title-now")
const playingViewNow = document.querySelector(".playing-now")
const playingViewUrl = document.querySelector(".playing-title-url")


let socket = io.connect('http://localhost:5000', {
  reconnection: true,              // Enable reconnection
  reconnectionAttempts: Infinity,  // Number of attempts before giving up
  reconnectionDelay: 1000,         // Delay between reconnection attempts (1 second)
});

let isPausedFromUser = false;
let currentDataLen = 0
let queuedDataLen = 0

new Sortable(allMediaHolder, {
  onEnd: function (evt) {
    handleDragEnd(evt);
  }
});



socket.on('connect', function() {
  console.log('Connected from server');

  setInterval(() => {
    socket.emit('heartbeat', "SEND");
  }, 25000);
});

socket.on('handle-queued-data', function(data) {
  currentDataLen = data[1]
  queuedDataLen = Object.keys(data[0]).length

  update_queued_data(data[0])

  if (checkbox.checked) {
    if (Object.keys(data[0]).length == 1 && data[1] == 0) {
      socket.emit("next-video", "SEND")
      setTimeout(()=> {
        player.play();
        socket.emit("play-signal-dash", "PLAY")
      }, 2000)
    }
  }
});


socket.on('handle-previous-data', function(data) {
  update_previous_data(data)
});

socket.on('handle-current-data', function(data) {
  if (Object.keys(data).length !== 0) {
    updatePlayerItself(data["URL"], data["duration"], data["start_time"], data["Platform"])
    updatePlayerInfo(data["title"] ,data["URL"])
  } else {
    showBlankVideo()
    updatePlayerInfoBlank()
  }
  RemoveLoading()
})

socket.on('handle-resume-button', function(data) {
  if (checkbox.checked && data != 0) {
    setTimeout(()=> {
      player.play();
      socket.emit("play-signal-dash", "PLAY")
    }, 2000)
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

  if (checkbox.checked && queuedDataLen == 1 && player.paused) {
    setTimeout(()=> {
      player.play();
      socket.emit("play-signal-dash", "PLAY")
    }, 2000)
  }

  if (checkbox.checked && currentDataLen != 0 && player.paused) {
    setTimeout(()=> {
      player.play();
      socket.emit("play-signal-dash", "PLAY")
    }, 2000)
  }
  
  if (checkbox.checked && currentDataLen == 0 && queuedDataLen > 0) {
    AddLoading()
    socket.emit("next-video", "SEND")
      setTimeout(()=> {
        player.play();
        socket.emit("play-signal-dash", "PLAY")
      }, 2000)
  }
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

function hideBackShadowAndViews () {
  backShadow.style.display = 'none'
  addVideoView.style.display = 'none'
  // addTokenView.style.display = 'none'
}

function showBackShadowAndAddView () {
  backShadow.style.display = 'block'
  addVideoView.style.display = 'flex'
}

function clearInputsAndHideShadow () {
  addVideoLink.value = ""
  addVideoDuration.value = ""
  addVideoStartTime.value = ""
  hideBackShadowAndViews()
}

function extractVideoCodeOrUrl(url) {
  // Regular expression to match the YouTube video code in the URL
  let youtubeRegex = regex = /[?&]v=([^&]+)/;
  let tiktokRegex = /(?:tiktok\.com\/)/;
  
  // Check if the URL is a YouTube URL
  let youtubeMatch = url.match(youtubeRegex);
  
  if (youtubeMatch && youtubeMatch[1]) {
      // Extracted YouTube video code
      return youtubeMatch[1];
  } else if (tiktokRegex.test(url)) {
      // If the URL is a TikTok URL
      return url;
  } else {
      // If the URL doesn't match either YouTube or TikTok format
      return url;
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

    

    if (!parseInt(vid["duration"]) && !parseInt(vid["start_time"])) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["video_length"])}`
      totalTime += parseInt(vid["video_length"])
    }  else if (parseInt(vid["duration"]) && !parseInt(vid["start_time"]) ) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
      totalTime += parseInt(vid["duration"])
    } else if (parseInt(vid["start_time"]) &&  !parseInt(vid["duration"])) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable((parseInt(vid["video_length"]) - parseInt(vid["start_time"])))}`
      totalTime += (parseInt(vid["video_length"]) - parseInt(vid["start_time"]))
    } else {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
      totalTime += parseInt(vid["duration"])
    }

    
    newRemoveMedia.addEventListener("click", function(event) {
      socket.emit("remove-video", key)
    })
    
    allMediaHolder.appendChild(newMediaEntry)
  }
  QueuedTotalVideos.innerHTML = `${Object.keys(data).length ? Object.keys(data).length + " videos" : "0 videos"}`
  totalQueuedTime.innerHTML = `${Object.keys(data).length ? secondsToHumanReadable(totalTime) : "0s"}`
}

function update_previous_data(data) {
  AllPreviousMediaHolder.innerHTML = ""
  for (let key in data) {
    const vid = data[key]
    const newMediaEntry  = previousMediaDummy.cloneNode(true)
    newMediaEntry.classList.remove('hidden');
    
    const newMediaTitle = newMediaEntry.querySelector(".media-title-bar")
    const newMediaDuration = newMediaEntry.querySelector(".media-title-duration")
    const newMediaReadd = newMediaEntry.querySelector(".readd")

    newMediaTitle.innerHTML  = vid["title"]

 
    if (!parseInt(vid["duration"]) && !parseInt(vid["start_time"])) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["video_length"])}`
    }  else if (parseInt(vid["duration"]) && !parseInt(vid["start_time"]) ) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
    } else if (parseInt(vid["start_time"]) &&  !parseInt(vid["duration"])) {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable((parseInt(vid["video_length"]) - parseInt(vid["start_time"])))}`
    } else {
      newMediaDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
    }
    
    newMediaReadd.addEventListener("click", function(event) {
      AddLoading()
      socket.emit("read-video", key)
    })

    AllPreviousMediaHolder.appendChild(newMediaEntry)
  }
}

function updatePlayerItself(newYouTubeLink, duration, startTime, platform) {
  let hasInitialized = false;
  let eventHandled = false;
  
  let vidCode = extractVideoCodeOrUrl(newYouTubeLink)
  player.destroy()

  if (platform == "Youtube") {
    player = new Plyr('#player', {
      controls: ['progress', 'volume'],
      duration: (parseInt(duration) + parseInt(startTime)),
      youtube: {
        noCookie: true,
        start: parseInt(startTime),
        videoId: extractVideoCodeOrUrl(newYouTubeLink)
      }
    });
  
  } else {
    console.log(duration, startTime, "HEREEE");
    player = new Plyr('#player', {
      controls: ['progress', 'volume'],
      duration: (parseInt(duration) + parseInt(startTime)),
      source: {
        type: 'video',
        sources: [
          {
              src:  `/static/videos/${extractVideoCodeOrUrl(newYouTubeLink)}`,
              type: "video/mp4",
              size: 720
           }
         ]
      }
    });
  }

  
   // Listen for seeked event
  player.on('seeked', event => {
    const currentTime = player.currentTime;
    socket.emit("time-signal-dash", currentTime);
  });

  player.on('seeking', event => {
    if (isPausedFromUser) {
      setTimeout(() => {
        const currentTime = player.currentTime;
        socket.emit("time-signal-dash", currentTime);
      }, 2000)
    }
  });

  player.on('volumechange', event => {
    const volume =  player.volume 
    socket.emit("volume-signal-dash", volume)
  });

  player.on('ready', () => {
    if (!hasInitialized) {
      if(platform == "Youtube") {
        player.source = {
          type: 'video',
          sources: [
            {
              src: vidCode,
              provider: 'youtube',
            },
          ]
        };
      } else {
        player.source = {
          type: 'video',
          sources: [
            {
              src: `/static/videos/${extractVideoCodeOrUrl(newYouTubeLink)}`,
            },
          ]
        };
      }
      hasInitialized = true;
      player.seek(parseInt(startTime));
    }
    updatePlayerProgressBar();
  });

  player.on('play', event => {
    const currentTime = player.currentTime;
    updateStartButtonIcon()
    socket.emit("time-signal-dash", currentTime);
  });
  
  player.on('timeupdate', event => {
    const currentTime = player.currentTime;
  

    if (!parseInt(duration) == 0) {
      if (parseInt(currentTime) >= (parseInt(duration) + parseInt(startTime)) && !eventHandled) {
        eventHandled = true
        if (checkbox.checked) {
            AddLoading()
            socket.emit("next-video", "SEND");
            setTimeout(() => {
                player.play();
                socket.emit("play-signal-dash", "PLAY");
            }, 2000);
        } else {
          AddLoading()
          socket.emit("next-video", "SEND");
        }
      } else if (parseInt(currentTime) < (parseInt(duration) + parseInt(startTime))) {
        eventHandled = false
      }
    }

  });

  player.on('ended', event => {
    if (checkbox.checked) {
      AddLoading()
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

function updatePlayerInfo(title, url) {
  playingViewNow.innerHTML = `Now Playing`
  playingViewTitle.innerHTML = `${title}`
  playingViewUrl.innerHTML  = `from: ${url}`
  playingViewUrl.setAttribute('href', `${url}`);
}

function updatePlayerInfoBlank() {
  playingViewNow.innerHTML = ``
  playingViewTitle.innerHTML = ``
  playingViewUrl.innerHTML  = ``
}

function timeToSeconds(timeString) {
  let timeParts;
  if (timeString.includes(':')) {
      timeParts = timeString.split(':').map(part => parseFloat(part));
  } else if (timeString.includes('.')) {
      timeParts = timeString.split('.').map(part => parseFloat(part));
  } else {
      timeParts = [parseFloat(timeString)];
  }
  
  let seconds = 0;

  // Add hours if provided
  if (timeParts.length === 3) {
      seconds += Math.floor(timeParts[0]) * 3600; // 1 hour = 3600 seconds
      timeParts.shift(); // Remove hours from array
  }

  // Add minutes if provided
  if (timeParts.length >= 2) {
      seconds += Math.floor(timeParts[0]) * 60; // 1 minute = 60 seconds
      timeParts.shift(); // Remove minutes from array
  }

  // Add remaining seconds if provided
  if (timeParts.length === 1) {
      seconds += Math.floor(timeParts[0]);
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
  if (!startBtn.classList.contains("Loading")) {
    if (player.paused) {
      player.play(); // Play the video if it's paused
      isPausedFromUser = false
      socket.emit("play-signal-dash", "PLAY")
    } else {
      player.pause(); // Otherwise, pause the video
      isPausedFromUser = true
      socket.emit("pause-signal-dash", "PLAY")
    }
  }
}

function QueueExpandableIcon() {
  if (allMediaHolder.style.height === '0px') {
    allMediaHolder.style.height = 'auto';
    expandableQueue.style.transform = "rotateX(0)";
  } else {
    allMediaHolder.style.height = '0px';
    expandableQueue.style.transform = "rotateX(180deg)";
  }
}

function PreviousExpandableIcon() {
  if (AllPreviousMediaHolder.style.height === '0px') {
    AllPreviousMediaHolder.style.height = 'auto';
    previousQueue.style.transform = "rotateX(0)";
  } else {
    AllPreviousMediaHolder.style.height = '0px';
    previousQueue.style.transform = "rotateX(180deg)";
  }
}

function AddLoading() {
  const LoadingDivs = [forwardBtn, backwardBtn, startBtn]
  const className = "Loading"

  LoadingDivs.forEach(div => {
    // Check if the div doesn't already have the class
    if (!div.classList.contains(className)) {
        // Add the class to the div
        div.classList.add(className);
    }
  });

}


function RemoveLoading() {
  const LoadingDivs = [forwardBtn, backwardBtn, startBtn]
  const className = "Loading"

  LoadingDivs.forEach(div => {
    // Check if the div doesn't already have the class
    if (div.classList.contains(className)) {
        // Add the class to the div
        div.classList.remove(className);
    }
  });

}


//event listeners
startBtn.addEventListener('click', updatePlayAndPauseBtn);

expandableQueue.addEventListener('click', QueueExpandableIcon)



previousQueue.addEventListener('click', PreviousExpandableIcon)

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
  if (!forwardBtn.classList.contains("Loading")) {
    AddLoading()
    socket.emit("next-video", "SEND")
  }
})

backwardBtn.addEventListener("click", function() {
  if (!backwardBtn.classList.contains("Loading")) {
    AddLoading()
    socket.emit("previous-video", "SEND")
  }
  
})

RemoveAllQueuedBtn.addEventListener("click", function() {
  socket.emit("remove-all-queued-video", "SEND")
  showBlankVideo()
  updatePlayerInfoBlank()
})

clearHistory.addEventListener("click", function() {
  socket.emit("remove-history", "SEND")
})


window.addEventListener('load', checkCheckboxState);
checkbox.addEventListener('change', handleCheckboxChange);
addMediaBtn.addEventListener('click', showBackShadowAndAddView)
backShadow.addEventListener('click', hideBackShadowAndViews)
cancelBtns.forEach(cancelBtn => {cancelBtn.addEventListener("click", hideBackShadowAndViews)})