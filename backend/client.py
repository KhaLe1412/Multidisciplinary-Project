import time
import  sys
from  Adafruit_IO import  MQTTClient

class Client:
    def __init__(self, feed_id, username, key, on_message=None, on_write=None):
        """
        feed_id   : tên feed Adafruit IO cần subscribe
        username  : AIO username
        key       : AIO key
        on_message: callback(feed_id, payload) gọi mỗi khi nhận tin nhắn mới
        on_write  : callback(feed_id, value) gọi mỗi khi có lệnh viết mới
        """
        self.feed_id = feed_id
        self._on_message_cb = on_message
        self._on_write_cb = on_write
        self.client = MQTTClient(username, key)
        self.client.on_connect    = self.connected
        self.client.on_disconnect = self.disconnected
        self.client.on_message    = self.message
        self.client.connect()
        self.client.loop_background()
    
    def connected(self, client):
        print("Ket noi thanh cong...")
        client.subscribe(self.feed_id)

    def disconnected(self, client):
        print("Ngat ket noi...")
        sys.exit(1)

    def message(self, client, feed_id, payload):
        print("Nhan du lieu: " + payload)
        if self._on_message_cb:
            self._on_message_cb(feed_id, payload)

    def write(self, value):
        print("Cap nhat:", value)
        self.client.publish(self.feed_id, value)
        if self._on_write_cb:
            self._on_write_cb(self.feed_id, value)