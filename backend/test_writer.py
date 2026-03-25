import random
import time
import  sys
from  Adafruit_IO import  MQTTClient

AIO_FEED_ID = "device"
AIO_USERNAME = "khahcmut"
AIO_KEY = "aio_TCbR18tFqyyGwNnxRy1NpfK2SBR6"

def  connected(client):
    print("Ket noi thanh cong...")
    client.subscribe(AIO_FEED_ID)

def  subscribe(client , userdata , mid , granted_qos):
    print("Subscribe thanh cong...")

def  disconnected(client):
    print("Ngat ket noi...")
    sys.exit (1)

def  message(client , feed_id , payload):
    print("Nhan du lieu: " + payload)

if __name__ == "__main__":
    client = MQTTClient(AIO_USERNAME , AIO_KEY)
    client.on_connect = connected
    client.on_disconnect = disconnected
    client.on_message = message
    client.on_subscribe = subscribe
    client.connect()
    client.loop_background()

    while True:
        # Nhập giá trị mới từ người dùng
        value = input("Nhập giá trị mới: ")
        print("Cap nhat:", value)
        client.publish(AIO_FEED_ID, value)


class Writer:
    def __init__(self, feed_id, username, key):
        self.feed_id = feed_id
        self.client = MQTTClient(username, key)
        self.client.on_connect = self.connected
        self.client.on_disconnect = self.disconnected
        self.client.connect()
        self.client.loop_background()

    def connected(self, client):
        print("Ket noi thanh cong...")

    def disconnected(self, client):
        print("Ngat ket noi...")
        sys.exit(1)

    def write(self, value):
        print("Cap nhat:", value)
        self.client.publish(self.feed_id, value)