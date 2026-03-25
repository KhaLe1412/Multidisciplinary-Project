"""
Adafruit IO MQTT Gateway
- Subscribe nhiều feed, cache giá trị mới nhất
- Publish lệnh từ web lên Adafruit IO feed
"""
import threading
from typing import Dict, Optional
from Adafruit_IO import MQTTClient


class AdafruitGateway:
    """
    Quản lý kết nối MQTT đến Adafruit IO.
    Chạy vòng lặp nền (loop_background), thread-safe qua Lock.
    """

    def __init__(self, username: str, key: str):
        self.username = username
        self.key = key
        self._cache: Dict[str, Optional[str]] = {}   # feed_id → giá trị mới nhất
        self._lock = threading.Lock()
        self._client: Optional[MQTTClient] = None
        self._connected = False

    # ── Callbacks MQTT ────────────────────────────────────────────────────────

    def _on_connected(self, client):
        self._connected = True
        print(f"[AIO] Đã kết nối Adafruit IO ({self.username})")
        # Re-subscribe tất cả feed đã đăng ký trước đó
        with self._lock:
            feeds = list(self._cache.keys())
        for feed_id in feeds:
            client.subscribe(feed_id)

    def _on_disconnected(self, client):
        self._connected = False
        print("[AIO] Mất kết nối Adafruit IO")

    def _on_message(self, client, feed_id: str, payload: str):
        with self._lock:
            self._cache[feed_id] = payload
        print(f"[AIO] Nhận ← {feed_id}: {payload}")

    def _on_subscribe(self, client, userdata, mid, granted_qos):
        print(f"[AIO] Subscribe thành công (mid={mid})")

    # ── Kết nối ───────────────────────────────────────────────────────────────

    def connect(self) -> None:
        """Kết nối đến Adafruit IO và chạy vòng lặp MQTT ở background."""
        self._client = MQTTClient(self.username, self.key)
        self._client.on_connect    = self._on_connected
        self._client.on_disconnect = self._on_disconnected
        self._client.on_message    = self._on_message
        self._client.on_subscribe  = self._on_subscribe
        self._client.connect()
        self._client.loop_background()

    def disconnect(self) -> None:
        if self._client:
            try:
                self._client.disconnect()
            except Exception:
                pass
            self._client = None
            self._connected = False

    # ── Quản lý feed ──────────────────────────────────────────────────────────

    def subscribe(self, feed_id: str) -> None:
        """Đăng ký nhận dữ liệu từ một feed."""
        with self._lock:
            if feed_id not in self._cache:
                self._cache[feed_id] = None
        if self._connected and self._client:
            self._client.subscribe(feed_id)

    def publish(self, feed_id: str, value: str) -> None:
        """Gửi giá trị lên một feed Adafruit IO."""
        if not self._connected or self._client is None:
            raise RuntimeError("Chưa kết nối đến Adafruit IO")
        self._client.publish(feed_id, value)
        print(f"[AIO] Gửi  → {feed_id}: {value}")

    # ── Đọc cache ─────────────────────────────────────────────────────────────

    def get_latest(self, feed_id: str) -> Optional[str]:
        """Trả về giá trị mới nhất đã cache của một feed. None nếu chưa nhận."""
        with self._lock:
            return self._cache.get(feed_id)

    def get_all(self) -> Dict[str, Optional[str]]:
        """Trả về toàn bộ cache {feed_id: value}."""
        with self._lock:
            return dict(self._cache)

    @property
    def is_connected(self) -> bool:
        return self._connected
