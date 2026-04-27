"""
conftest.py
===========
Pytest configuration loaded *before* any test module or application code.

Purpose
-------
The device_manager module imports `os.environ["ADAFRUIT_USERNAME"]` and
`from Adafruit_IO import MQTTClient` at module level, then calls
`sync_clients()` which tries to open real MQTT connections.  This conftest
intercepts that at the earliest possible point so tests never touch external
services.

What we do here
---------------
1. Inject dummy Adafruit IO env vars (if not already set) so `os.environ[...]`
   doesn't raise KeyError.
2. Replace the `Adafruit_IO` package in sys.modules with a lightweight fake
   *before* `client.py` or `device_manager.py` are imported by pytest.
   This makes `Client.__init__` a no-op and prevents real TCP connections.
"""

import os
import sys
import unittest.mock

# ── 1. Env vars ──────────────────────────────────────────────────────────────
os.environ.setdefault("ADAFRUIT_USERNAME", "_test_user_")
os.environ.setdefault("ADAFRUIT_KEY",      "_test_key_placeholder_")

# ── 2. Fake Adafruit_IO package ──────────────────────────────────────────────

class _FakeMQTTClient:
    """No-op MQTT client. Swallows all calls without network I/O."""
    on_connect    = None
    on_disconnect = None
    on_message    = None

    def __init__(self, username: str, key: str) -> None:
        pass

    def connect(self) -> None:
        pass

    def loop_background(self) -> None:
        pass

    def subscribe(self, feed_id: str) -> None:
        pass

    def publish(self, feed_id: str, value) -> None:
        pass

    def disconnect(self) -> None:
        pass


_fake_adafruit_io_module = unittest.mock.MagicMock()
_fake_adafruit_io_module.MQTTClient = _FakeMQTTClient

# Replace before anything else can import the real package
sys.modules.setdefault("Adafruit_IO", _fake_adafruit_io_module)
