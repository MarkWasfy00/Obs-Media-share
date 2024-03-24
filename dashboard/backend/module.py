import json
import re
from pytube import YouTube

class Backend:
    def __init__(self):
        self.VIDEO_DATA_FILE = "queue_data.json"
        self.HISTORY_FILE = "history.json"
        self.current_FILE ="current.json"
        self.currentVideo={}
        
    def __construct_start_time_url(self, youtube_url, start_time):
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
            
            # Construct new URL with start time
            start_time_url = f"https://www.youtube.com/watch?v={video_id}&t={start_time}s"
            return start_time_url
            
        except:
            pass
    
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
        try:
            ulrStartTime = self.__construct_start_time_url(url, start_time=start_time)
            yt = YouTube(url)
            title = yt.title
            video_data = self.__load_video_data()
            new_id = str(max(map(int, video_data.keys()), default=0) + 1)
            video_data[new_id] = {
                "URL": ulrStartTime,
                "title": title,
                "duration": duration,
                "start_time": start_time
            }
            self.__save_data(video_data, self.VIDEO_DATA_FILE)
            return video_data, len(video_data)
        except Exception as e:
            print(f"An error occurred while processing video URL {url}: {e}")
            return None, None

    def remove_video_data(self, video_id):
        video_data = self.__load_video_data()
        try:
            video_id = str(video_id)
            if video_id in video_data:
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
        return video_data, len(video_data)

    def play_next_video(self):
        try:
            video_data = self.__load_video_data()
            if not(video_data):
                return self.currentVideo,self.get_queue(), self.get_history()
            if(self.currentVideo !={}):
                self.__add_to_history(self.currentVideo)
            if "1" in video_data:
                self.currentVideo = video_data["1"]
                self.__save_data(self.currentVideo,self.current_FILE)
                self.remove_video_data("1")
                return self.currentVideo , self.get_queue(), self.get_history()
            else:
                print("No video found with ID 1.")
                return None
        except Exception as e:
            print(f"An error occurred while playing the next video: {e}")
            return None
        
    def play_previous_video(self):
        try:
            history_data = self.__load_history_data()
            last_index_history = str(len(history_data))  # Get the last index of the video data
            video_data=self.__load_video_data()
            last_index_queue=str(len(video_data))
            if not(history_data):
                return self.currentVideo,self.get_queue(), self.get_history()
            if(self.currentVideo !={}):
                for i in range(int(last_index_queue), 0, -1):
                    video_data[str(i+1)] = video_data[str(i)]
                video_data["1"] = self.currentVideo 
                self.__save_data(video_data,self.VIDEO_DATA_FILE)

            if last_index_history in history_data:
                self.currentVideo = history_data[last_index_history]
                self.__save_data(self.currentVideo,self.current_FILE)
                # Shift the existing items by one index
                del history_data[last_index_history]
                self.__save_data(history_data,self.HISTORY_FILE)

                return self.currentVideo , self.get_queue(), self.get_history()
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
            self.__save_data(video_data, self.VIDEO_DATA_FILE)
            print("Queue cleared successfully.")
            return self.get_queue()
        except Exception as e:
            print(f"An error occurred while removing the queue: {e}")


    def remove_history(self):
        try:
            video_data = {}
            self.__save_data(video_data, self.HISTORY_FILE)
            print("history cleared successfully.")
            return self.get_history()
        except Exception as e:
            print(f"An error occurred while removing the history: {e}")            



# backend=Backend()
# data=backend.add_video_data("https://www.youtube.com/watch?v=evpB93BFeZk","1","1")
# data=backend.add_video_data("https://www.youtube.com/watch?v=evpB93BFeZk","2","2")
# data=backend.add_video_data("https://www.youtube.com/watch?v=evpB93BFeZk","3","3")
# current,mada,samy=backend.play_next_video()
# print("\n",current)
# current,mada,samy=backend.play_next_video()
# print("\n",current)
# current,mada,samy=backend.play_next_video()
# print("\n",current)
# current,mada,samy=backend.play_next_video()
# print("\n empty",current)

# current,mada,samy=backend.play_previous_video()
# print("\n",current)
# current,mada,samy=backend.play_previous_video()
# print("\n",current)
# current,mada,samy=backend.play_previous_video()
# print("\n",current)
# current,mada,samy=backend.play_previous_video()
# print("\n",current)
