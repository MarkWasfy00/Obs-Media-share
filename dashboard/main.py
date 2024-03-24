from flask import Flask, render_template
from flask_socketio import SocketIO
from backend.module import Backend


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
def handle_connect():
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
    data = server.add_video_data(url, duration, start_time)
    previous_data = server.get_history()
    socketio.emit('handle-queued-data', data)
    socketio.emit("handle-previous-data", previous_data)

@socketio.on('next-video')
def next_video(info):
    data, queue_media, previous_media = server.play_next_video()
    
    data_send = { "current_video": data, "queued_media": queue_media, "previous_media": previous_media }
    socketio.emit('handle-video', data_send)
    socketio.emit("update-data", data["URL"])
    if "URL" in data:
        socketio.emit("update-data", data["URL"])


@socketio.on('previous-video')
def previous_video(info):
    data, queue_media, previous_media = server.play_previous_video()
    data_send = { "current_video": data, "queued_media": queue_media, "previous_media": previous_media }
    socketio.emit('handle-video', data_send)
    if "URL" in data:
        socketio.emit("update-data", data["URL"])


@socketio.on('remove-all-queued-video')
def previous_video(info):
    queue_media = server.remove_queue()
    socketio.emit('handle-queued-data', queue_media)
 




# -------------------- VIEW -------------------
@socketio.on('play-signal-dash')
def play_next_video_view(info):
    socketio.emit("play-signal", "PLAY")

@socketio.on('pause-signal-dash')
def play_next_video_view(info):
    socketio.emit("pause-signal", "PLAY")


@socketio.on('time-signal-dash')
def time_view(data):
    socketio.emit("time-signal", data)


@socketio.on('volume-signal-dash')
def volume_view(data):
    socketio.emit("volume-signal", data)


#-------------------------------------



@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')




if __name__ == '__main__':
    host = "0.0.0.0"
    port = 9090

    print(f"Flask is running at http://{host}:{port}")
    
    # Assuming you have created the Flask app and initialized the SocketIO object
    # socketio.run() should be called after the Flask app and SocketIO object are initialized
    socketio.run(app, host=host, port=port, debug=True, allow_unsafe_werkzeug=True)

    
