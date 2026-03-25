import random
import time
import sys
from Adafruit_IO import MQTTClient

AIO_FEED_ID = "device"
AIO_USERNAME = "khahcmut"
AIO_KEY = "aio_TCbR18tFqyyGwNnxRy1NpfK2SBR6"

def connected ( client ) :
    print ("Ket noi thanh cong ...")
    client . subscribe ( AIO_FEED_ID )
def subscribe ( client , userdata , mid , granted_qos ) :
    print (" Subcribe thanh cong ... ")

def disconnected ( client ) :
    print (" Ngat ket noi ... ")
    sys.exit (1)
def message ( client , feed_id , payload ):
    print (" Nhan du lieu : " + payload )

if __name__ == "__main__":
    client = MQTTClient ( AIO_USERNAME , AIO_KEY )
    client . on_connect = connected
    client . on_disconnect = disconnected
    client . on_message = message
    client . on_subscribe = subscribe
    client . connect ()
    client . loop_background ()

    while True :
        pass

class Reader:
    def __init__(self, feed_id, username, key, on_message=None):
        """
        feed_id   : tên feed Adafruit IO cần subscribe
        username  : AIO username
        key       : AIO key
        on_message: callback(feed_id, payload) gọi mỗi khi nhận tin nhắn mới
        """
        self.feed_id = feed_id
        self._on_message_cb = on_message
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
