import json
import re
from pytube import YouTube, Playlist
import requests
from bs4 import BeautifulSoup
import shutil

import os
import glob
import pyktok as pyk



class Backend:
    def __init__(self):
        self.VIDEO_DATA_FILE = "queue_data.json"
        self.HISTORY_FILE = "history.json"
        self.current_FILE ="current.json"
        self.currentVideo = {}
        self.totalTime = 0
    def detect_platform(self,url):
        # Regular expressions for each platform
        youtube_regex = re.compile(r'(https?://)?(www\.)?(youtube\.com|youtu\.be)')
        tiktok_regex = re.compile(r'(https?://)?(www\.)?tiktok\.com')
        instagram_regex = re.compile(r'(https?://)?(www\.)?instagram\.com')
        twitter_regex = re.compile(r'(https?://)?(www\.)?twitter\.com')
        
        if youtube_regex.search(url):
            return "Youtube"
        elif tiktok_regex.search(url):
            return "Tiktok"
        elif instagram_regex.search(url):
            return "Instagram"
        elif twitter_regex.search(url):
            return "Twitter"
        else:
            return "Unknown platform"    

    def detect_if_shorts(self, youtube_url):
        # Regular expression to match shorts YouTube URL
        shorts_regex = r"youtube\.com/shorts/([^&=%\?/]+)"

        # Check if the URL matches the shorts URL format
        if re.search(shorts_regex, youtube_url):
            modified_url = re.sub(shorts_regex, r"youtube.com/embed/\1", youtube_url)
            return "shorts", modified_url
        else:
            return "video", youtube_url  # Return original URL if it doesn't match the shorts URL format

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

            # Fetch video details including duration using pytube
            yt = YouTube(f"https://www.youtube.com/watch?v={video_id}")
            duration = yt.length
            total_seconds = duration

            start_time_url = f"https://www.youtube.com/watch?v={video_id}&t={start_time}s"
            return start_time_url, total_seconds

        except Exception as e:
            return f"Error: {str(e)}"

    def __load_data(self, filename):
        try:
            with open(filename, "r") as file:
                return json.load(file)
        except FileNotFoundError:
            return {}

    def __save_data(self, data, filename):
        with open(filename, "w") as file:
            json.dump(data, file, indent=4)

    def __add_to_history(self, video):
        history = self.__load_data(self.HISTORY_FILE)
        if not history:
            history = {}
        new_id = str(max(map(int, history.keys()), default=0) + 1)
        history[new_id] = video
        self.__save_data(history, self.HISTORY_FILE)

    def add_video_data(self, url, duration, start_time,callback=None):
        platform=self.detect_platform(url=url)
        if(platform=="Youtube"):
            TYPE, modefiedURL = self.detect_if_shorts(url)
            try:
                ulrStartTime, video_length = self.__construct_start_time_url(
                    modefiedURL if TYPE == "shorts" else url, start_time=start_time
                )
                yt = YouTube(url if TYPE == "video" else modefiedURL)
                title = yt.title
                video_data = self.__load_data(self.VIDEO_DATA_FILE)
                new_id = str(max(map(int, video_data.keys()), default=0) + 1)
                video_data[new_id] = {
                    "Platform" :platform,
                    "TYPE" :"STANDARD",
                    "URL":  ulrStartTime,
                    "title": title or "NONE",
                    "duration": duration,
                    "start_time": start_time,
                    "video_length": video_length or 0,
                }
                self.totalTime += video_length
                self.__save_data(video_data, self.VIDEO_DATA_FILE)
                if callback :
                    callback(video_data, len(video_data), self.totalTime)
                return video_data, len(video_data), self.totalTime
            except Exception as e:
                print(f"An error occurred while processing youtupe video URL {url}: {e}")
                return None, None, None
            
        elif(platform=="Tiktok"):
            try:
                #get the title from Tiktok official library    
                oembed_url = f'https://www.tiktok.com/oembed?url={url}'
                response = requests.get(oembed_url)
                title = response.json()['title']
                #get the duration from unofficial tiktok library
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(url, headers=headers)
                soup = BeautifulSoup(response.content, 'html.parser')
                video_length_script = soup.find('script', string=re.compile('duration'))

                match = re.search(r'"duration":(\d+)', video_length_script.string)
                video_length = int(match.group(1))

                #now reload the old data and the video to it
                video_data = self.__load_data(self.VIDEO_DATA_FILE)
                new_id = str(max(map(int, video_data.keys()), default=0) + 1)
                video_data[new_id] = {
                    "Platform" :platform,
                    "TYPE" :"STANDARD",
                    "URL":  "",
                    "Path": url,
                    "title": title or "NONE",
                    "duration": duration,
                    "start_time": start_time,
                    "video_length": video_length or 0,
                }
                self.totalTime += video_length
                self.__save_data(video_data, self.VIDEO_DATA_FILE)
                return video_data, len(video_data), self.totalTime

            except Exception as e:
                print(f"An error occurred while processing Tiktok video URL {url}: {e}")
                return None, None, None
        else:
            print("its not youtupe nor instgram")
            


            

    def remove_video_data(self, video_id):
        video_data = self.__load_data(self.VIDEO_DATA_FILE)
        try:
            video_id = str(video_id)
            if video_id in video_data:
                self.totalTime -= video_data[video_id]["video_length"]
                del video_data[video_id]
                print(f"Video with ID {video_id} removed successfully.")
                for i in range(int(video_id) + 1, len(video_data) + 2):
                    if str(i) in video_data:
                        video_data[str(i - 1)] = video_data.pop(str(i))
                self.__save_data(video_data, self.VIDEO_DATA_FILE)
            else:
                print(f"No video found with ID {video_id}.")
                return None, None, None
        except ValueError:
            print("Please provide a valid string ID.")
        return video_data, len(video_data), self.totalTime

    def play_next_video(self):
        try:
            video_data = self.__load_data(self.VIDEO_DATA_FILE)
            self.currentVideo=self.__load_data(self.current_FILE)
            if self.currentVideo != {}:
                self.__add_to_history(self.currentVideo)
            if not(video_data):
                self.currentVideo = {}
                self.__save_data(self.currentVideo, self.current_FILE)
                return self.currentVideo, self.get_queue(), self.get_history()

            if "1" in video_data:
                self.currentVideo = video_data["1"]
                #lets check if its youtupe or tiktok here to download the video
                if(self.currentVideo['Platform']=="Youtube"):
                        print("here Youtube")
                        self.__save_data(self.currentVideo, self.current_FILE)
                        self.remove_video_data("1")
                        return self.currentVideo, self.get_queue(), self.get_history()
                elif(self.currentVideo["Platform"]=="Tiktok"):
                        # Specify the browser type
                        pyk.specify_browser('edge')

                   

                        # Define the directory and pattern for old files
                        base_directory = os.path.join('static', 'videos')
                        os.makedirs(base_directory, exist_ok=True)
                        pattern = '*.mp4'
                        # Find and delete old files
                        for file_path in glob.glob(os.path.join(base_directory, pattern)):
                            try:
                                os.remove(file_path)
                                print(f"Deleted old file: {file_path}")
                            except OSError as e:
                                print(f"Error: {file_path} : {e.strerror}")

                        # Call the save_tiktok function with the specified parameters
                        files_before = set(glob.glob(os.path.join('.', pattern)))
                        print("before",files_before)
                        pyk.save_tiktok(self.currentVideo["Path"], False,'edge')
                        files_after = set(glob.glob(os.path.join('.', pattern)))
                        new_files = files_after - files_before
                        downloaded_filename = new_files.pop() if new_files else None
                        if downloaded_filename:
                            new_path = os.path.join(base_directory, os.path.basename(downloaded_filename))
                            shutil.move(downloaded_filename, new_path)
                        downloaded_filename=downloaded_filename.lstrip(".\\")   

                        self.currentVideo["URL"]=downloaded_filename
                        self.__save_data(self.currentVideo, self.current_FILE)
                        self.remove_video_data("1")
                        return self.currentVideo, self.get_queue(), self.get_history()
            else:
                return self.currentVideo, self.get_queue(), self.get_history()

        except Exception as e:
            print(f"An error occurred while playing the next video: {e}")
            return self.currentVideo, self.get_queue(), self.get_history()

    def add_playlist(self,playlist_url,callback):
        try:
            playlist = Playlist(playlist_url)
            playlist_videos = playlist.video_urls
            for url in playlist_videos:
                video_data, len_video_data, totalTime = self.add_video_data(url,"","",callback)
            return video_data, len_video_data, self.totalTime
        except Exception as e:
            print(f"An error occurred while extracting playlist URLs: {e}")
            return [], [], []

    def play_previous_video(self):  
        try:
            history_data = self.__load_data(self.HISTORY_FILE)
            last_index_history = str(len(history_data))  # Get the last index of the video data
            video_data = self.__load_data(self.VIDEO_DATA_FILE)
            self.currentVideo=self.__load_data(self.current_FILE)
            last_index_queue = str(len(video_data))
            if self.currentVideo != {}:
                for i in range(int(last_index_queue), 0, -1):
                    video_data[str(i+1)] = video_data[str(i)]
                video_data["1"] = self.currentVideo
                self.totalTime += self.currentVideo["video_length"]
                self.__save_data(video_data,self.VIDEO_DATA_FILE)
            if not(history_data):
                self.currentVideo = {}
                self.__save_data(self.currentVideo, self.current_FILE)
                return self.currentVideo, self.get_queue(), self.get_history(), self.totalTime
            if last_index_history in history_data:
                self.currentVideo = history_data[last_index_history]
                if(self.currentVideo['Platform']=="Youtube"):

                    self.__save_data(self.currentVideo, self.current_FILE)
                    # Shift the existing items by one index
                    del history_data[last_index_history]
                    self.__save_data(history_data, self.HISTORY_FILE)
                    return self.currentVideo , self.get_queue(), self.get_history(), self.totalTime
                elif(self.currentVideo['Platform']=="Tiktok"):
                    pyk.specify_browser('edge')

        

                    # Define the directory and pattern for old files
                    base_directory = os.path.join('static', 'videos')
                    os.makedirs(base_directory, exist_ok=True)
                    pattern = '*.mp4'
                    # Find and delete old files
                    for file_path in glob.glob(os.path.join(base_directory, pattern)):
                        try:
                                os.remove(file_path)
                                print(f"Deleted old file: {file_path}")
                        except OSError as e:
                                print(f"Error: {file_path} : {e.strerror}")
                    files_before = set(glob.glob(os.path.join('.', pattern)))
                    pyk.save_tiktok(self.currentVideo["Path"], False,'edge')
                    files_after = set(glob.glob(os.path.join('.', pattern)))
                    new_files = files_after - files_before
                    downloaded_filename = new_files.pop() if new_files else None
                    print("name",downloaded_filename)
                    if downloaded_filename:
                        new_path = os.path.join(base_directory, os.path.basename(downloaded_filename))
                        shutil.move(downloaded_filename, new_path)
                        # Call the save_tiktok function with the specified parameters
                    self.__save_data(self.currentVideo, self.current_FILE)
                    del history_data[last_index_history]
                    self.__save_data(history_data, self.HISTORY_FILE)
                    return self.currentVideo , self.get_queue(), self.get_history(), self.totalTime
            else:
                print(f"No video found with ID {last_index_history}.")
                return None ,None ,None,None
        except Exception as e:
            print(f"An error occurred while playing the next video: {e}")
            return None ,None ,None,None

    def get_history(self):
        return self.__load_data(self.HISTORY_FILE)

    def get_queue(self):
        return self.__load_data(self.VIDEO_DATA_FILE)

    def get_current(self):
        return self.__load_data(self.current_FILE)

    def remove_queue(self):
        try:
            video_data = {}
            self.totalTime = 0
            self.__save_data(video_data, self.VIDEO_DATA_FILE)
            print("Queue cleared successfully.")
            return self.get_queue(), self.totalTime
        except Exception as e:
            print(f"An error occurred while removing the queue: {e}")
            return None, None

    def remove_current(self):
        try:
            self.currentVideo = {}
            self.__save_data(self.currentVideo, self.current_FILE)
            print("current cleared successfully.")
            return self.currentVideo
        except Exception as e:
            print(f"An error occurred while removing the current: {e}")
            return None

    def remove_history(self):
        try:
            video_data = {}
            self.__save_data(video_data, self.HISTORY_FILE)
            print("history cleared successfully.")
            return self.get_history()
        except Exception as e:
            print(f"An error occurred while removing the history: {e}")
            return None

    def change_order(self, new_order):
        try:
            video_data = self.__load_data(self.VIDEO_DATA_FILE)
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

    def replay(self, video_id_int):
        try:
            video_id = str(video_id_int)
            # Load data from history and video data files
            history_data = self.__load_data(self.HISTORY_FILE)
            video_data = self.__load_data(self.VIDEO_DATA_FILE)

            # Check if the video exists in history
            if video_id in history_data:
                # Get the video from history
                replay_video = history_data[video_id]

                # Find the first available ID in video data
                new_id = str(max(map(int, video_data.keys()), default=0) + 1)

                # Shift all existing videos down by one index in video data
                for i in range(len(video_data), 0, -1):
                    video_data[str(i + 1)] = video_data[str(i)]

                # Add the replayed video to video data at the first ID
                video_data["1"] = replay_video
                self.totalTime += replay_video["video_length"]

                # Shift down subsequent videos in history if their ID is greater than the replayed video ID
                for i in range(int(video_id), len(history_data)):
                    history_data[str(i)] = history_data[str(i + 1)]

                # Remove the last video from history
                del history_data[str(len(history_data))]
                # Save the updated data
                self.__save_data(video_data, self.VIDEO_DATA_FILE)
                self.__save_data(history_data, self.HISTORY_FILE)

                print(f"Video with ID {video_id} replayed successfully.")
                return video_data , history_data

            else:
                print(f"No video found with ID {video_id} in history.")
                return video_data , history_data

        except Exception as e:
            print(f"An error occurred while replaying the video: {e}")
            return video_data , history_data
