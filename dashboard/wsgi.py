from app import app, socketio, connect_to_streamlabs_socket

# Ensure the Streamlabs socket is connected when the server starts
connect_to_streamlabs_socket()

if __name__ == "__main__":
    socketio.run(app)

