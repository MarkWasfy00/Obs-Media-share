import json
import re
from pytube import YouTube
from pytube import  Playlist

class Backend:
    def __init__(self):
        self.VIDEO_DATA_FILE = "queue_data.json"
        self.HISTORY_FILE = "history.json"
        self.current_FILE ="current.json"
        self.currentVideo={}
        self.totalTime=0

    def detect_if_shorts(self,youtube_url):
        # Regular expression to match shorts YouTube URL
        shorts_regex = r"youtube\.com/shorts/([^&=%\?/]+)"

        # Check if the URL matches the shorts URL format
        if re.search(shorts_regex, youtube_url):
            modified_url = re.sub(shorts_regex, r"youtube.com/embed/\1", youtube_url)
            return "shorts",modified_url
        else:
            return "video",youtube_url  # Return original URL if it doesn't match the shorts URL format

    def __construct_start_time_url(self,youtube_url, start_time):
        try:
            # Regular expression to match YouTube video ID
            youtube_regex = (
                r"(https?://)?(www\.)?"
                "(youtube|youtu|youtube-nocookie)\.(com|be)/"
                "(watch\?v=|embed/|v/|.+\\?v=)?([^&=%\?]{11})"
            )
            
            # Find video ID and check if it's a valid YouTube URL
            match = re.match(youtube_regex, youtube_url)
            if match:
                video_id = match.group(6)
            else:
                return "Invalid YouTube URL"

            # Fetch video details including duration using pytube
            yt = YouTube(f"https://www.youtube.com/watch?v={video_id}")
            duration = yt.length
            total_seconds = duration

            start_time_url = f"https://www.youtube.com/watch?v={video_id}&t={start_time}s"
            return start_time_url, total_seconds

        except Exception as e:
            return f"Error: {str(e)}"
    
    def __load_video_data(self):
        try:
            with open(self.VIDEO_DATA_FILE, "r") as file:
                return json.load(file)
        except FileNotFoundError:
            return {}
        
    def __load_current_data(self):
        try:
            with open(self.current_FILE, "r") as file:
                return json.load(file)
        except FileNotFoundError:
            return {}

    def __add_to_history(self, video):
        history = self.__load_history_data()
        if not history:
            history = {}
        new_id = str(max(map(int, history.keys()), default=0) + 1)
        history[new_id] = video
        self.__save_data(history, self.HISTORY_FILE)

    def __load_history_data(self):
        try:
            with open(self.HISTORY_FILE, "r") as file:
                return json.load(file)
        except FileNotFoundError:
            return {}
        
    def __save_data(self, data, filename):
        with open(filename, "w") as file:
            json.dump(data, file, indent=4)

    def add_video_data(self, url, duration, start_time):

        TYPE,modefiedURL=self.detect_if_shorts(url)
        if  TYPE== "shorts":
            print("its a short")
            yt = YouTube(modefiedURL)
            ulrStartTime,video_length = self.__construct_start_time_url(modefiedURL, start_time=start_time)
            title = yt.title
            video_data = self.__load_video_data()
            new_id = str(max(map(int, video_data.keys()), default=0) + 1)
            video_data[new_id] = {
                    "URL": ulrStartTime,
                    "title": title or "NONE",
                    "duration": duration,
                    "start_time": start_time,
                    "video_length":video_length or 0
                }
            self.totalTime=self.totalTime+video_length         #--<<
            self.__save_data(video_data, self.VIDEO_DATA_FILE)
            return video_data, len(video_data)            
        else :
            try:        

                ulrStartTime,video_length = self.__construct_start_time_url(url, start_time=start_time)
                yt = YouTube(url)
                title = yt.title
                video_data = self.__load_video_data()
                new_id = str(max(map(int, video_data.keys()), default=0) + 1)
                video_data[new_id] = {
                    "URL": ulrStartTime,
                    "title": title,
                    "duration": duration,
                    "start_time": start_time,
                    "video_length":video_length
                }
                self.totalTime=self.totalTime+video_length             #--<<
                self.__save_data(video_data, self.VIDEO_DATA_FILE)
                return video_data, len(video_data),self.totalTime
            except Exception as e:
                print(f"An error occurred while processing video URL {url}: {e}")
                return None, None

    def remove_video_data(self, video_id):
        video_data = self.__load_video_data()
        try:
            video_id = str(video_id)
            if video_id in video_data:
                self.totalTime=self.totalTime-video_data[video_id]['video_length']      #--<<
                del video_data[video_id]
                print(f"Video with ID {video_id} removed successfully.")
                for i in range(int(video_id) + 1, len(video_data) + 2):
                    if str(i) in video_data:
                        video_data[str(i - 1)] = video_data.pop(str(i))
                self.__save_data(video_data, self.VIDEO_DATA_FILE)
            else:
                print(f"No video found with ID {video_id}.")
        except ValueError:
            print("Please provide a valid string ID.")
        return video_data, len(video_data),self.totalTime

    def play_next_video(self):
        try:
            video_data = self.__load_video_data()
            if(self.currentVideo !={}):
                self.__add_to_history(self.currentVideo)
            if not(video_data):
                self.currentVideo={}
                self.__save_data(self.currentVideo,self.current_FILE)
                return self.currentVideo,self.get_queue(), self.get_history()
           
            if "1" in video_data:
                self.currentVideo = video_data["1"]
                self.__save_data(self.currentVideo,self.current_FILE)
                self.remove_video_data("1")
                return self.currentVideo,self.get_queue(), self.get_history(),self.totalTime
            else:
                return self.currentVideo,self.get_queue(), self.get_history(),self.totalTime
                
        except Exception as e:
            print(f"An error occurred while playing the next video: {e}")
            return self.currentVideo,self.get_queue(), self.get_history()
    
    def add_playlist(self,playlist_url):
        try:
            playlist = Playlist(playlist_url)
            playlist_videos = playlist.video_urls
            for url in playlist_videos:
                video_data,len_video_data,totalTime=self.add_video_data(url,"","")
            return video_data,len_video_data,self.totalTime
        except Exception as e:
            print(f"An error occurred while extracting playlist URLs: {e}")
            return []    

    def play_previous_video(self):
        try:
            history_data = self.__load_history_data()
            last_index_history = str(len(history_data))  # Get the last index of the video data
            video_data=self.__load_video_data()
            last_index_queue=str(len(video_data))
            if(self.currentVideo !={}):
                for i in range(int(last_index_queue), 0, -1):
                    video_data[str(i+1)] = video_data[str(i)]
                video_data["1"] = self.currentVideo 
                self.totalTime=self.totalTime+self.currentVideo["video_length"]       #--<<
                self.__save_data(video_data,self.VIDEO_DATA_FILE)            
            if not(history_data):
                self.currentVideo={}
                self.__save_data(self.currentVideo,self.current_FILE)
                return self.currentVideo,self.get_queue(), self.get_history(),self.totalTime
            if last_index_history in history_data:
                self.currentVideo = history_data[last_index_history]
                self.__save_data(self.currentVideo,self.current_FILE)
                # Shift the existing items by one index
                del history_data[last_index_history]
                self.__save_data(history_data,self.HISTORY_FILE)

                return self.currentVideo , self.get_queue(), self.get_history(),self.totalTime
            else:
                print(f"No video found with ID {last_index_history}.")
                return None
        except Exception as e:
            print(f"An error occurred while playing the next video: {e}")
            return None
        
    def get_history(self):
        return self.__load_history_data()

    def get_queue(self):
        return self.__load_video_data()
    
    def get_current(self):
        return self.__load_current_data()

    def remove_queue(self):
        try:
            video_data = {}
            self.totalTime=0
            self.__save_data(video_data, self.VIDEO_DATA_FILE)
            print("Queue cleared successfully.")
            return self.get_queue(),self.totalTime
        except Exception as e:
            print(f"An error occurred while removing the queue: {e}")

    def remove_current(self):
        try:
            self.currentVideo = {}
            self.__save_data(self.currentVideo, self.current_FILE)
            print("current cleared successfully.")
            return self.currentVideo
        except Exception as e:
            print(f"An error occurred while removing the current: {e}")       

    def remove_history(self):
        try:
            video_data = {}
            self.__save_data(video_data, self.HISTORY_FILE)
            print("history cleared successfully.")
            return self.get_history()
        except Exception as e:
            print(f"An error occurred while removing the history: {e}")            

    def change_order(self, new_order):
        try:
            video_data = self.__load_video_data()
            if not video_data:
                print("No videos in the queue.")
                return video_data,len(video_data)
            
            # Check if the provided order list is valid
            if len(new_order) != len(video_data):
                print("Invalid order list. Please provide a list of integers with length equal to the number of videos.")
                return video_data,len(video_data)
            
            # Create a new video_data dictionary with videos reordered according to the new_order list
            new_video_data = {}
            for index, new_index in enumerate(new_order):
                if str(new_index) not in video_data:
                    print(f"Invalid order list. Video with ID {new_index} does not exist.")
                    return video_data,len(video_data)
                new_video_data[str(index + 1)] = video_data[str(new_index)]

            # Save the modified video_data
            self.__save_data(new_video_data, self.VIDEO_DATA_FILE)
            print("Video order changed successfully.")
            return new_video_data,len(new_video_data)
            
        except Exception as e:
            print(f"An error occurred while changing the video order: {e}")
            return video_data,len(video_data)

