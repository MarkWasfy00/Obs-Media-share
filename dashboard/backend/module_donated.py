import json
import re
from pytube import YouTube, Playlist
from currency_converter import CurrencyConverter
import requests
from bs4 import BeautifulSoup
import pyktok as pyk
import shutil
import os
import glob

class Backend_donated:
    def __init__(self):

        self.VIDEO_DATA_FILE="queue_data.json"
        self.VIDEO_DATA_DONATED_FILE = "queue_data_donated.json"

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

    def __detect_if_shorts(self, youtube_url):
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
        history = self.__load_data(self.HISTORY_FILE_DONATED)
        if not history:
            history = {}
        new_id = str(max(map(int, history.keys()), default=0) + 1)
        history[new_id] = video
        self.__save_data(history, self.HISTORY_FILE_DONATED)

    def add_video_data(self, url,start_time,currency,price,callback=None):
        platform=self.detect_platform(url=url)
        if(platform=="Youtube"):
            TYPE, modefiedURL = self.__detect_if_shorts(url)
            try:
                    ulrStartTime, video_length = self.__construct_start_time_url(
                        modefiedURL if TYPE == "shorts" else url, str(start_time)
                    )
                    yt = YouTube(url if TYPE == "video" else modefiedURL)
                    title = yt.title
                    video_data = self.__load_data(self.VIDEO_DATA_DONATED_FILE)
                    new_id = str(max(map(int, video_data.keys()), default=0) + 1)
                    price_in_dollar,time_in_Seconds = self.__calculate_time(currency,price)                                 #->>> activate this line after creating function
                    video_data[new_id] = {
                        "Platform" :platform,
                        "TYPE" :"DONATED",
                        "URL": ulrStartTime,
                        "title": title or "NONE",
                        "duration": time_in_Seconds,                                                                          #->>> activate this line after creating function
                        "start_time": str(start_time),
                        "video_length": video_length or 0,
                        "price_in_dollar" :price_in_dollar                                                             #->>> activate this line after creating function
                    }
                    self.totalTime += video_length
                    self.__save_data(video_data, self.VIDEO_DATA_DONATED_FILE)
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
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) edge/91.0.4472.124 Safari/537.36'
                    }                       
                    response = requests.get(url, headers=headers)
                    soup = BeautifulSoup(response.content, 'html.parser')
                    video_length_script = soup.find('script', string=re.compile('duration'))

                    match = re.search(r'"duration":(\d+)', video_length_script.string)
                    video_length = int(match.group(1))


                    video_data = self.__load_data(self.VIDEO_DATA_DONATED_FILE)
                    new_id = str(max(map(int, video_data.keys()), default=0) + 1)
                    price_in_dollar,time_in_Seconds = self.__calculate_time(currency,price)
                    video_data[new_id] = {
                        "Platform" :platform,
                        "TYPE" :"DONATED",
                        "Path" :url,
                        "URL": "",
                        "title": title or "NONE",
                        "duration": time_in_Seconds,                                                                          #->>> activate this line after creating function
                        "start_time": str(start_time),
                        "video_length": video_length or 0,  
                        "price_in_dollar" :price_in_dollar                                                             #->>> activate this line after creating function
                    }
                    
                    base_directory = os.path.join('static', 'donated')
                    os.makedirs(base_directory, exist_ok=True)
                    print(base_directory)
                    files_before = set(glob.glob(os.path.join('.', '*.mp4')))
                    print("files before iss",files_before)
                    
                    pyk.save_tiktok(video_data[new_id]["Path"], False,'edge')
                    
                    files_after = set(glob.glob(os.path.join('.', '*.mp4')))
                    print("files after iss",files_after)
                    new_files = files_after - files_before
                    
                    downloaded_filename = new_files.pop() if new_files else None                    
                    if downloaded_filename:
                            new_path = os.path.join(base_directory, os.path.basename(downloaded_filename))
                            shutil.move(downloaded_filename, new_path)
                    downloaded_filename=downloaded_filename.lstrip(".\\")   
                    self.totalTime += video_length
                    video_data[new_id]['URL']=downloaded_filename
                    self.__save_data(video_data, self.VIDEO_DATA_DONATED_FILE)                   
                    return video_data, len(video_data), self.totalTime
            except Exception as e:
                    print(f"An error occurred while processing Tiktok video URL {url}: {e}")
                    return None, None, None
        else:
            print("its not youtupe nor instgram")
            

    def __remove_video_data(self, video_id):
        video_data = self.__load_data(self.VIDEO_DATA_DONATED_FILE)
        try:
            video_id = str(video_id)
            if video_id in video_data:
                self.totalTime -= video_data[video_id]["video_length"]
                del video_data[video_id]
                print(f"Video with ID {video_id} removed successfully.")
                for i in range(int(video_id) + 1, len(video_data) + 2):
                    if str(i) in video_data:
                        video_data[str(i - 1)] = video_data.pop(str(i))
                self.__save_data(video_data, self.VIDEO_DATA_DONATED_FILE)
            else:
                print(f"No video found with ID {video_id}.")
        except ValueError:
            print("Please provide a valid string ID.")
        return video_data, len(video_data), self.totalTime
    

    def change_order(self, new_order):
        try:
            video_data = self.__load_data(self.VIDEO_DATA_DONATED_FILE)
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
            self.__save_data(new_video_data, self.VIDEO_DATA_DONATED_FILE)
            print("Video order changed successfully.")
            return new_video_data,len(new_video_data)

        except Exception as e:
            print(f"An error occurred while changing the video order: {e}")
            return video_data,len(video_data)
        

    def __calculate_time(self,currency,price):
            c = CurrencyConverter()
            # Convert the given price to USD
            price_in_usd = int(c.convert(price, currency, 'USD'))

            # Calculate time in seconds based on $0.2 per second
            time_in_seconds = str(price_in_usd / 0.2)

            return price_in_usd, time_in_seconds



    def accept(self, video_id):
        # Load data from both files
        donated_videos = self.__load_data(self.VIDEO_DATA_DONATED_FILE)
        regular_videos = self.__load_data(self.VIDEO_DATA_FILE)
        
        try:
            video_id_str = str(video_id)
            if video_id_str in donated_videos:
                # Get the video data from the donated queue
                video_data = donated_videos[video_id_str]
                
                # Generate a new ID for the video in the regular queue
                if regular_videos:
                    new_id = str(max(map(int, regular_videos.keys())) + 1)
                else:
                    new_id = "1"
                
                # Add the video to the regular queue
                regular_videos[new_id] = video_data
                # Define the directory and pattern for old files
                base_directory = os.path.join('static', 'donated')
                os.makedirs(base_directory, exist_ok=True)
                pattern = video_data['URL']
                for file_path in glob.glob(os.path.join(base_directory, pattern)):
                        try:
                            os.remove(file_path)
                            print(f"Deleted old file: {file_path}")
                        except OSError as e:
                                print(f"Error: {file_path} : {e.strerror}")
                # Remove the video from the donated queue and shift subsequent videos
                del donated_videos[video_id_str]
                donated_videos = self.__shift_video_ids(donated_videos, video_id)

                # Save the updated data to both files
                self.__save_data(donated_videos, self.VIDEO_DATA_DONATED_FILE)
                self.__save_data(regular_videos, self.VIDEO_DATA_FILE)
                
                print(f"Video with ID {video_id} accepted and transferred to the regular queue.")
                return regular_videos,donated_videos
            else:
                print(f"No video found with ID {video_id} in the donated queue.")
                return regular_videos,donated_videos
        except Exception as e:
            print(f"An error occurred while accepting the video: {e}")
            return regular_videos,donated_videos

    def __shift_video_ids(self, videos, deleted_id):
        """ Shift the IDs of videos down after a specified ID is deleted """
        new_videos = {}
        deleted_index = int(deleted_id)
        for id_str in sorted(videos.keys(), key=int):
            current_index = int(id_str)
            if current_index > deleted_index:
                new_videos[str(current_index - 1)] = videos[id_str]
            elif current_index < deleted_index:
                new_videos[id_str] = videos[id_str]
        return new_videos


    def deny(self, video_id):
        # Load the donated videos data
        donated_videos = self.__load_data(self.VIDEO_DATA_DONATED_FILE)
        
        try:
            video_id_str = str(video_id)
            if video_id_str in donated_videos:
                # Remove the video from the donated queue
                # Define the directory and pattern for old files
                video_data = donated_videos[video_id_str]
                base_directory = os.path.join('static', 'donated')
                os.makedirs(base_directory, exist_ok=True)
                pattern = video_data['URL']             
                for file_path in glob.glob(os.path.join(base_directory, pattern)):
                        try:
                            os.remove(file_path)
                            print(f"Deleted old file: {file_path}")
                        except OSError as e:
                                print(f"Error: {file_path} : {e.strerror}")



                del donated_videos[video_id_str]

                # Shift subsequent videos IDs down
                donated_videos = self.__shift_video_ids(donated_videos, video_id)

                # Save the updated data
                self.__save_data(donated_videos, self.VIDEO_DATA_DONATED_FILE)
                
                print(f"Video with ID {video_id} has been denied and removed from the donated queue.")
                return donated_videos
            else:
                print(f"No video found with ID {video_id} in the donated queue.")
                return donated_videos
        except Exception as e:
            print(f"An error occurred while denying the video: {e}")
        return donated_videos


    def get_queue(self):
        queue=self.__load_data(self.VIDEO_DATA_DONATED_FILE)
        return queue
