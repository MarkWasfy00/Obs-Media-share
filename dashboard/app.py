from flask import Flask, render_template, url_for, jsonify
from flask_socketio import SocketIO
from backend.module import Backend
import socketio as psio
import threading
from backend.module_token import Token
from backend.module_donated import Backend_donated
import json
import toml
import os
import time

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
server = Backend()
donation_server = Backend_donated()
sio = psio.Client()

# Get the base directory of the project
base_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the path to the config file
config_file_path = os.path.join(base_dir, "config.toml")

token = Token()
token_data = toml.load(config_file_path)
token_key = token_data["settings"]["token"]



# Flask Api

@app.route('/get_video_url/<video_name>')
def get_video_url(video_name):
    video_url = url_for('static', filename=f'videos/{video_name}.mp4')
    return jsonify({'video_url': video_url})




# Streamlabs Websocket:
@sio.event
def connect():
    print("Connected to Streamlabs socket.")

@sio.event
def disconnect():
    print("Disconnected from Streamlabs socket. Reconnecting in 20 seconds...")
    

@sio.event
def event(data):
    print("event triggered")
    if isinstance(data, dict):
        message = data
    else:
        try:
            message = json.loads(data)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return

    if message.get("type") == "donation":
        donation_data = message.get("message", [{}])[0]
        vid_id = f"https://www.youtube.com/embed/{donation_data.get('media', {}).get('id')}"
        start_time = donation_data.get('media', {}).get('start_time')
        currency = donation_data.get('currency')
        amount = donation_data.get('amount')

        new_donation, new_donation_len, new_donation_total_time = donation_server.add_video_data(vid_id, start_time, currency, amount)
        
        socketio.emit("handle-donated-data", [new_donation, 0, "donation"])
        print("event Ended Succesfuly")

@sio.event
def connect_error(data):
    print(f"Connection failed. Retrying in 20 seconds...")
    time.sleep(20)
    sio.connect(f'https://sockets.streamlabs.com?token={token.get_token()}')


def connect_to_streamlabs_socket():
    print("Entered connect to streamLabs socket")
    token.set_token(token_key)
    if not token.get_connection():
        sio.connect(f'https://sockets.streamlabs.com?token={token.get_token()}')
    else:
        print("User Connected")

    print("Ended connect to streamLabs socket")



@socketio.on('xtest')
def xtest(data):
    new_donation, new_donation_len, new_donation_total_time = donation_server.add_video_data("https://www.youtube.com/watch?v=hkHCnZ5GrNc", "5", "USD", 2)
    
    socketio.emit("handle-donated-data", [new_donation, 0, "donation"])

###################################

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/view')
def view():
    return render_template('view.html')

@app.route('/review')
def review():
    return render_template('review.html')

@socketio.on('connect')
def handle_connect(data):
    print("User Connected, Visiting to the site")
    queued_data = server.get_queue()
    previous_data = server.get_history()
    current_data = server.get_current()
    donation_data = donation_server.get_queue()
    token_data = token.get_connection()

    socketio.emit('handle-queued-data', [queued_data, len(current_data)])
    socketio.emit("handle-previous-data", previous_data)
    socketio.emit("handle-current-data", current_data)
    socketio.emit("handle-streamlabs-socket", token_data)
    socketio.emit("handle-donated-data", [donation_data, 0, "donation"])
    if "URL" in current_data:
        socketio.emit("update-data", current_data["URL"])
    print("ended handle connect succefully")    

@socketio.on('add-media')
def add_media(url, duration, start_time):
    print("entered add media")
    def add_media_thread():
        data, data_len, data_total_time = server.add_video_data(url, duration, start_time)
        previous_data = server.get_history()
        current_data = server.get_current()
        socketio.emit('handle-queued-data', [data, len(current_data)])
        socketio.emit("handle-previous-data", previous_data)
    # Create a thread for the add_media_thread function
    print("ended add media succesfully")
    media_thread = threading.Thread(target=add_media_thread)
    media_thread.start()


@socketio.on('add-playlist-media')
def add_playlist_media(url):
    print("entered add_playlist ")
    server.add_playlist(url, update_playlist)
    previous_data = server.get_history()
    socketio.emit("handle-previous-data", previous_data)
    print("ended add playlist ")

@socketio.on('next-video')
def next_video(info):
    print("entered next video")
    data, queue_media, previous_media = server.play_next_video()
    current_data = server.get_current()

    socketio.emit('handle-current-data', data)
    socketio.emit('handle-queued-data', [queue_media, len(current_data)])
    socketio.emit('handle-previous-data', previous_media)
    socketio.emit('handle-resume-button', len(current_data))

    if "URL" in data:
        socketio.emit("update-data", data["URL"])
    print("ended next video ")

@socketio.on('previous-video')
def previous_video(info):
    print("entered previous video ")
    data, queue_media, previous_media, total_time = server.play_previous_video()
    current_data = server.get_current()
    socketio.emit('handle-current-data', data)
    socketio.emit('handle-queued-data', [queue_media, len(current_data)])
    socketio.emit('handle-previous-data', previous_media)
    socketio.emit('handle-resume-button', len(current_data))

    if "URL" in data:
        socketio.emit("update-data", data["URL"])
    print("ended previous video ")    

@socketio.on('remove-all-queued-video')
def remove_all_videos(info):
    current_data = server.get_current()
    queued_data, queue_total_time = server.remove_queue()
    server.remove_current()

    socketio.emit('handle-queued-data', [queued_data, len(current_data)])

@socketio.on('remove-history')
def remove_history_videos(info):
    print("entered remove  history video ")
    previous_data = server.remove_history()
    socketio.emit("handle-previous-data", previous_data)
    print("ended remove history video ")


@socketio.on('remove-video')
def remove_video(video_id):
    print("entered removed video ")
    server.remove_video_data(video_id)
    queued_data = server.get_queue()
    current_data = server.get_current()
    socketio.emit('handle-queued-data', [queued_data, len(current_data)])
    print("ended removed video ")
 
@socketio.on('read-video')
def replay(video_id):
    print("entered replay video ")
    queued_data, previous_data = server.replay(video_id)
    current_data = server.get_current()
    socketio.emit('handle-queued-data', [queued_data, len(current_data)])
    socketio.emit("handle-previous-data", previous_data)
    print("ended replay video")
 
@socketio.on('new-sequence')
def new_sequence(array):
    print("entered new sequence")
    queued_data, queued_data_len = server.change_order(array)
    current_data = server.get_current()
    socketio.emit('handle-queued-data', [queued_data, len(current_data)])
    print("ended new sequence")
    
@socketio.on('disconnect-from-streamlabs')
def disconnect_from_streamlabs_socket(socket_token):
    print("entered disconnect from stream labs")
    if token.get_connection():
        sio.disconnect()
    else:
        print("Already disconnected from Streamlabs Socket")
    print("ended disconnect from stream labs")   

@socketio.on('donation-accept')
def donation_accept(key):
    print("entered donation accept")
    current_data = server.get_current()
    queued_data, donation_data = donation_server.accept(key)
    socketio.emit('handle-queued-data', [queued_data, len(current_data)])
    socketio.emit('handle-donated-data', [donation_data, (len(queued_data) + len(current_data)) - 1 , "accept"])
    print("ended donation accept ")

@socketio.on('donation-deny')
def donation_deny(key):
    print("entered donation deny ")
    donation_data = donation_server.deny(key)
    socketio.emit('handle-donated-data', [donation_data, 0 , "deny"])
    print("ended donation deny")

@socketio.on('new-donation-sequence')
def new_donation_sequence(array):
    print("entered new donation sequence ")
    donation_data, donation_len = donation_server.change_order(array)
    socketio.emit('handle-donated-data', [donation_data, 0 , "donation"])
    print("ended new donation sequence")

# -------------------- VIEW -------------------
@socketio.on('play-signal-dash')
def play_next_video_view(info):
    print("entered play-signal-dash ")
    socketio.emit("play-signal", "PLAY")
    print("ended play-signal-dash")

@socketio.on('pause-signal-dash')
def pause_next_video_view(info):
    print("entered pause-signal-dash ")
    socketio.emit("pause-signal", "PLAY")
    print("ended pause signal dash")


@socketio.on('time-signal-dash')
def time_view(data):
    print("entered time-signal-dash ")
    socketio.emit("time-signal", data)
    print("ended time-signal-dash")

@socketio.on('volume-signal-dash')
def volume_view(data):
    print('entered volume-signal-dash')
    socketio.emit("volume-signal", data)
    print('ended volume-signal-dash')

@socketio.on("show-blank-video-dash")
def show_blank(data):
    print("entered show-blank-video-dash")
    socketio.emit("blank-signal", data)
    print("ended show-blank-video-dash")


@socketio.on('disconnect')
def handle_disconnect():
    print("entered handle disconnect")
    print('Client disconnected')
    print("ended handle disconnect")

@socketio.on('heartbeat')
def handle_heartbeat(data):
    pass


def update_playlist(queue_data, length, total_time):
    print("entered update playlist")
    current_data = server.get_current()

    socketio.emit('handle-queued-data', [queue_data, len(current_data)])
    print("ended update playlist")
