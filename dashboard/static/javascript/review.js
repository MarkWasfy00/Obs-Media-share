const queuedMediaBtn = document.querySelector(".queue-title")
const queuedMedia = document.querySelector(".queued-media")
const donatedMediaBtn = document.querySelector(".donate-title")
const donatedMedia = document.querySelector(".donated-media")
const donatedApprove = document.querySelector('.donated-approve')
const donatedDeny = document.querySelector('.donated-deny')
const approveSound = document.getElementById('approve');
const denySound = document.getElementById('deny');
const allDonateHolder = document.querySelector(".all-donated")
const donatedQueueDummy = document.querySelector(".donated-bar")
const donatedVideoQueueDummy = document.querySelector(".donated-bar-video")
const totalDonatedTime = document.querySelector(".donated-total-time")
const expandableDonation = document.querySelector(".donated-expand-icon")
const donatedTotalVideos = document.querySelector(".donated-total-videos")

let socket = io.connect('http://85.239.240.70:5000', {
  reconnection: true,              // Enable reconnection
  reconnectionAttempts: Infinity,  // Number of attempts before giving up
  reconnectionDelay: 1000,         // Delay between reconnection attempts (1 second)
});


new Sortable(allDonateHolder, {
    onEnd: function (evt) {
      handleDragEndDonation(evt);
    }
});
  

socket.on('connect', function() {
  console.log('Connected from server');

  setInterval(() => {
    socket.emit('heartbeat', "SEND");
  }, 25000);
});

socket.on('handle-donated-data', function(data) {
    update_donated_data(data[0])
});



function update_donated_data(data) {
    allDonateHolder.innerHTML = ""
    let totalTime = 0
    for (let key in data) {
      const vid = data[key]

      let newDonatedEntry

      if (vid["Platform"] == "Youtube") {
        newDonatedEntry = donatedQueueDummy.cloneNode(true)
        
      }else {
        newDonatedEntry = donatedVideoQueueDummy.cloneNode(true)
      }
      // here
      
      newDonatedEntry.classList.remove('hidden');
      newDonatedEntry.setAttribute("data-id", `${key}`);
      
      const newDonatedTitle = newDonatedEntry.querySelector(".donation-title")
      const newDonatedUrl = newDonatedEntry.querySelector(".donation-url")
      const newDonatedDuration = newDonatedEntry.querySelector(".donated-title-duration")
      const newDonatedPrice = newDonatedEntry.querySelector(".donation-price")
      const newApproveDonated = newDonatedEntry.querySelector(".donated-approve")
      const newDenyDonated = newDonatedEntry.querySelector(".donated-deny")
      
      
      newDonatedTitle.innerHTML  = vid["title"]
      newDonatedUrl.innerHTML = vid["URL"]
      newDonatedUrl.setAttribute("href", vid["URL"]);
      newDonatedPrice.innerHTML = vid["price_in_dollar"] + "$"
      
  
      if (!parseInt(vid["duration"]) && !parseInt(vid["start_time"])) {
        newDonatedDuration.innerHTML = `for ${secondsToHumanReadable(vid["video_length"])}`
        totalTime += parseInt(vid["video_length"])
      }  else if (parseInt(vid["duration"]) && !parseInt(vid["start_time"]) ) {
        newDonatedDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
        totalTime += parseInt(vid["duration"])
      } else if (parseInt(vid["start_time"]) &&  !parseInt(vid["duration"])) {
        newDonatedDuration.innerHTML = `for ${secondsToHumanReadable((parseInt(vid["video_length"]) - parseInt(vid["start_time"])))}`
        totalTime += (parseInt(vid["video_length"]) - parseInt(vid["start_time"]))
      } else {
        newDonatedDuration.innerHTML = `for ${secondsToHumanReadable(vid["duration"])}`
        totalTime += parseInt(vid["duration"])
      }
      
      newApproveDonated.addEventListener("click", function(event) {
        socket.emit("donation-accept", key)
      })
      newDenyDonated.addEventListener("click", function(event) {
        socket.emit("donation-deny", key)
      })
  

      if (vid["Platform"] == "Youtube") {
        const newIframeDonated = newDonatedEntry.querySelector("iframe")
        newIframeDonated.setAttribute("src", `https://www.youtube-nocookie.com/embed/${extractYouTubeVideoCode(vid["URL"])}?start=${vid["start_time"]}&end=${parseInt(vid["start_time"]) + parseInt(vid["duration"])}`)
      } else {
        const newIframeDonated = newDonatedEntry.querySelector("#video")
        newIframeDonated.src = `/static/donated/${vid["URL"]}`

        newIframeDonated.addEventListener('loadedmetadata', () => {
          // Set the video's current time to 10 seconds
          newIframeDonated.currentTime = parseInt(vid["start_time"]);
        });
    
        newIframeDonated.addEventListener('timeupdate', () => {
            // Pause the video at 20 seconds 
            if (newIframeDonated.currentTime >= parseInt(vid["start_time"]) + parseInt(vid["duration"])) {
              newIframeDonated.pause();
            }
        });

      }
  
      
      allDonateHolder.appendChild(newDonatedEntry)
    }
    donatedTotalVideos.innerHTML = `${Object.keys(data).length ? Object.keys(data).length + " videos" : "0 videos"}`
    totalDonatedTime.innerHTML = `${Object.keys(data).length ? secondsToHumanReadable(totalTime) : "0s"}`
}

function handleDragEndDonation(evt) {
    let newArray = []
    Array.from(allDonateHolder.children).forEach(function(child) {
      itmId = parseInt(child.getAttribute("data-id"))
      newArray.push(itmId)
    })
    socket.emit("new-donation-sequence", newArray)
  }
  
function DonationExpandableIcon() {
    if (allDonateHolder.style.height === '0px') {
      allDonateHolder.style.height = 'auto';
      expandableDonation.style.transform = "rotateX(0)";
    } else {
      allDonateHolder.style.height = '0px';
      expandableDonation.style.transform = "rotateX(180deg)";
    }
}

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

expandableDonation.addEventListener('click', DonationExpandableIcon)

document.querySelector(".xtest").addEventListener("click", () => {
  socket.emit("xtest", "SEND")
})
