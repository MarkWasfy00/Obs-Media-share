from flask import Flask, render_template
from flask_socketio import SocketIO
from backend.module import Backend
import threading


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
server = Backend()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/view')
def view():
    return render_template('view.html')

@socketio.on('connect')
def handle_connect(data):
    queued_data = server.get_queue()
    previous_data = server.get_history()
    current_data = server.get_current()

    socketio.emit('handle-queued-data', queued_data)
    socketio.emit("handle-previous-data", previous_data)
    socketio.emit("handle-current-data", current_data)
    if "URL" in current_data:
        socketio.emit("update-data", current_data["URL"])

@socketio.on('add-media')
def add_media(url, duration, start_time):
    def add_media_thread():
        data = server.add_video_data(url, duration, start_time)
        previous_data = server.get_history()
        socketio.emit('handle-queued-data', data)
        socketio.emit("handle-previous-data", previous_data)

    # Create a thread for the add_media_thread function
    media_thread = threading.Thread(target=add_media_thread)
    media_thread.start()

@socketio.on('add-playlist-media')
def add_playlist_media(url):
    server.add_playlist(url, update_playlist)
    previous_data = server.get_history()
    socketio.emit("handle-previous-data", previous_data)

@socketio.on('next-video')
def next_video(info):
    data, queue_media, previous_media = server.play_next_video()
    socketio.emit('handle-current-data', data)
    socketio.emit('handle-queued-data', queue_media)
    socketio.emit('handle-previous-data', previous_media)
    if "URL" in data:
        socketio.emit("update-data", data["URL"])

@socketio.on('previous-video')
def previous_video(info):
    data, queue_media, previous_media, total_time = server.play_previous_video()
    socketio.emit('handle-current-data', data)
    socketio.emit('handle-queued-data', queue_media)
    socketio.emit('handle-previous-data', previous_media)
    if "URL" in data:
        socketio.emit("update-data", data["URL"])

@socketio.on('remove-all-queued-video')
def remove_all_videos(info):
    queued_data = server.remove_queue()
    server.remove_current()

    socketio.emit('handle-queued-data', queued_data)


@socketio.on('remove-history')
def remove_history_videos(info):
    previous_data = server.remove_history()
    socketio.emit("handle-previous-data", previous_data)
 
@socketio.on('remove-video')
def remove_video(video_id):
    server.remove_video_data(video_id)
    queued_data = server.get_queue()
    socketio.emit('handle-queued-data', queued_data)
 
@socketio.on('new-sequence')
def new_sequence(array):
    queued_data = server.change_order(array)
    socketio.emit('handle-queued-data', queued_data)
 


# -------------------- VIEW -------------------
@socketio.on('play-signal-dash')
def play_next_video_view(info):
    socketio.emit("play-signal", "PLAY")

@socketio.on('pause-signal-dash')
def pause_next_video_view(info):
    socketio.emit("pause-signal", "PLAY")

@socketio.on('time-signal-dash')
def time_view(data):
    socketio.emit("time-signal", data)

@socketio.on('volume-signal-dash')
def volume_view(data):
    socketio.emit("volume-signal", data)

@socketio.on("show-blank-video-dash")
def show_blank(data):
    socketio.emit("blank-signal", data)



@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


def update_playlist(queue_data, length, total_time):
    socketio.emit('handle-queued-data', queue_data)


if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)

    
