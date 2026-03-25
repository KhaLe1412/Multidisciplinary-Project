from test_reader import Reader as ReaderClass
from test_writer import Writer as WriterClass
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
#from pydantic import BaseModel

app = FastAPI()

# Cấu hình CORS để cho phép frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Shared state ─────────────────────────────────────────────────────────────
temp_value: dict = {}

# ─── Callback: gọi mỗi khi Reader nhận tin nhắn mới từ feed ──────────────────
def on_feed_message(feed_id: str, payload: str) -> None:
    """Cập nhật temp_value khi Adafruit IO gửi dữ liệu mới."""
    temp_value[feed_id] = payload
    print(f"[temp_value] {feed_id} = {payload}")

# ─── Khởi tạo Reader và Writer ────────────────────────────────────────────────
sensor_list = ["dyer-project.ss-temp", "dyer-project.ss-hum", "dyer-project.ss-pir"]
actuator_list = ["dyer-project.fan", "dyer-project.relay"]
_username = "pnthcmut"
_key      = "aio_krSz94hmnsEBPwt0OCqcWj0zLTfy"

# Truyền callback vào Reader → temp_value tự động cập nhật khi feed thay đổi
reader = {feed_id: ReaderClass(feed_id, _username, _key, on_message=on_feed_message) for feed_id in sensor_list}
writer = {feed_id: WriterClass(feed_id, _username, _key) for feed_id in actuator_list}

@app.get("/api/device/{feed_id}")
def get_device(feed_id: str):
    """Lấy dữ liệu thiết bị theo feed_id."""
    if feed_id not in temp_value:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"feed_id": feed_id, "value": temp_value[feed_id]}

@app.post("/api/device/{feed_id}")
def update_device(feed_id: str, value: str):
    """Cập nhật giá trị thiết bị theo feed_id."""
    if feed_id not in writer:
        raise HTTPException(status_code=404, detail="Device not found")
    writer[feed_id].write(value)
    temp_value[feed_id] = value
    print(f"[temp_value] {feed_id} = {value}")
    return {"feed_id": feed_id, "value": value}
