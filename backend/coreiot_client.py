"""
coreiot_client.py
MQTT Client cho CoreIoT (ThingsBoard-based platform).
Interface tương đương client.py (Adafruit IO).

Xác thực: Device Access Token làm username, password để trống.
Broker   : app.coreiot.io:1883

Topics:
  Publish telemetry  : v1/devices/me/telemetry          (JSON: {"key": value})
  Subscribe RPC      : v1/devices/me/rpc/request/+      (nhận lệnh từ server)
  Shared attributes  : v1/devices/me/attributes         (nhận cấu hình từ server)
"""
import json
import sys
import threading
from typing import Callable, Optional

import paho.mqtt.client as mqtt

_BROKER = "app.coreiot.io"
_PORT   = 1883

# Topics
_TOPIC_TELEMETRY  = "v1/devices/me/telemetry"
_TOPIC_RPC_SUB    = "v1/devices/me/rpc/request/+"
_TOPIC_ATTR_SUB   = "v1/devices/me/attributes"


class CoreIoTClient:
    """
    MQTT client cho CoreIoT với interface giống client.py (Adafruit IO).

    Parameters
    ----------
    feed_id      : tên key telemetry (tương đương feed_id của Adafruit)
    access_token : Device Access Token lấy từ CoreIoT dashboard
    on_message   : callback(feed_id, payload_str) – gọi khi nhận RPC/attribute
    on_write     : callback(feed_id, value_str) – gọi sau khi write thành công
    broker       : địa chỉ broker (mặc định app.coreiot.io)
    port         : cổng MQTT (mặc định 1883)
    """

    def __init__(
        self,
        feed_id: str,
        access_token: str,
        on_message: Optional[Callable[[str, str], None]] = None,
        on_write: Optional[Callable[[str, str], None]] = None,
        broker: str = _BROKER,
        port: int = _PORT,
    ):
        self.feed_id = feed_id
        self._access_token = access_token
        self._on_message_cb = on_message
        self._on_write_cb = on_write
        self._broker = broker
        self._port = port

        self.client = mqtt.Client()
        # Access token làm username, password để trống
        self.client.username_pw_set(access_token, password="")

        self.client.on_connect    = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message    = self._on_message

        self.client.connect(broker, port, keepalive=60)
        # Non-blocking loop (tương đương loop_background() của Adafruit)
        self.client.loop_start()

    # ── Callbacks MQTT ──────────────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"[CoreIoT] Kết nối thành công ({self._broker})")
            # Subscribe RPC và shared attributes để nhận lệnh điều khiển
            client.subscribe(_TOPIC_RPC_SUB)
            client.subscribe(_TOPIC_ATTR_SUB)
        else:
            print(f"[CoreIoT] Kết nối thất bại, rc={rc}")
            sys.exit(1)

    def _on_disconnect(self, client, userdata, rc):
        print(f"[CoreIoT] Ngắt kết nối (rc={rc})")

    def _on_message(self, client, userdata, msg):
        """Nhận RPC request hoặc shared attribute update từ server."""
        try:
            payload = msg.payload.decode("utf-8")
            print(f"[CoreIoT] ← {msg.topic}: {payload}")

            # Parse JSON nếu có thể, lấy giá trị key tương ứng feed_id
            value = payload
            try:
                data = json.loads(payload)
                # RPC: {"method": "setValue", "params": 75}
                if "params" in data:
                    value = str(data["params"])
                # Attribute: {"temperature": 70}
                elif self.feed_id in data:
                    value = str(data[self.feed_id])
            except json.JSONDecodeError:
                pass

            if self._on_message_cb:
                self._on_message_cb(self.feed_id, value)
        except Exception as e:
            print(f"[CoreIoT] Lỗi xử lý message: {e}")

    # ── API công khai (giống client.py) ────────────────────────────────────

    def write(self, value: str) -> None:
        """
        Gửi giá trị telemetry lên CoreIoT.
        Payload JSON: {"<feed_id>": value}
        """
        payload = json.dumps({self.feed_id: value})
        result = self.client.publish(_TOPIC_TELEMETRY, payload, qos=1)
        result.wait_for_publish()
        print(f"[CoreIoT] → {self.feed_id} = {value}")
        if self._on_write_cb:
            self._on_write_cb(self.feed_id, value)

    def disconnect(self) -> None:
        """Ngắt kết nối MQTT."""
        self.client.loop_stop()
        self.client.disconnect()
