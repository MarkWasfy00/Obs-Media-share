class Token:
    def __init__(self) -> None:
        self.token = ""
        self.connection = False

    def set_token(self, token):
        self.token = token

    def set_connection(self, conn):
        self.connection = conn

    def get_token(self):
        return self.token
    
    def get_connection(self):
        return self.connection