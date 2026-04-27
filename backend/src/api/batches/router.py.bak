"""
batches/router.py
Quản lý các mẻ sấy: chạy thủ công, theo schedule, theo rule, và kết thúc mẻ.

Thiết kế luồng nền:
- Mỗi mẻ chạy trong một daemon thread độc lập.
- _active_batches[batch_id] = threading.Event (stop_event).
- Gọi stop_event.set() để dừng mẻ sớm (từ endpoint /end).
- Khi hết runtime: tắt controllers, thread tự kết thúc.
- Khi /end được gọi: cập nhật DB, set stop_event → thread dừng, tắt controllers.

Quyết định thiết kế:
- Rule engine: chỉ thực hiện actions của value_pair đầu tiên thoả mãn (first match).
- Hết runtime: chỉ tắt controllers, KHÔNG tự ghi end_time vào DB.
- POLL_INTERVAL = 5 giây cho vòng lặp kiểm tra rule.

Tại sao dùng thread thay vì xử lý đồng bộ trong endpoint?
  FastAPI chạy trên event loop. Nếu để endpoint trực tiếp ngủ (sleep/wait) hàng
  trăm hoặc hàng nghìn giây, toàn bộ server sẽ bị chặn, không thể phục vụ
  request nào khác trong thời gian đó. Bằng cách tạo một daemon thread riêng,
  endpoint trả về ngay lập tức (HTTP 201), còn việc chờ đợi và điều khiển thiết
  bị diễn ra song song trong nền, không ảnh hưởng đến các request khác.

Tại sao dùng lock (_ab_lock) cho _active_batches?
  _active_batches là dict dùng chung giữa hai luồng chạy đồng thời:
    1. HTTP handler: thêm/xoá entry khi start/end batch.
    2. Background worker: xoá chính entry của mình khi hoàn thành.
  Trong Python, dict không phải cấu trúc thread-safe cho mọi thao tác. Nếu
  không có lock, hai luồng có thể đồng thời đọc/ghi dict và gây ra race
  condition (dữ liệu bị hỏng, KeyError, hoặc bỏ sót entry). Lock đảm bảo
  chỉ một luồng truy cập dict tại một thời điểm.
"""
import operator as op_module
import threading
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from src.auth import get_current_user
from src.db import get_db, write_system_log
from src.model.schemas import (
    BatchEnd,
    BatchStartManual,
    BatchStartRule,
    BatchStartSchedule,
)
import src.device_manager as device_manager

router = APIRouter(prefix="/api/batches", tags=["batches"])

# ─── Trạng thái mẻ đang chạy ─────────────────────────────────────────────────

# Dict ánh xạ batch_id → stop_event của thread đang chạy mẻ đó.
# Khi cần dừng mẻ sớm (endpoint /end), ta tra cứu dict này để tìm stop_event
# tương ứng rồi gọi .set() để báo hiệu cho thread nền dừng lại.
_active_batches: Dict[int, threading.Event] = {}

# Lock bảo vệ _active_batches khỏi race condition.
# Hai luồng có thể truy cập dict đồng thời:
#   - HTTP handler (start/end batch) chạy trên thread pool của FastAPI.
#   - Background worker tự xoá entry khi hoàn thành.
# Nếu không có lock, thao tác đọc-kiểm tra-ghi không còn atomic, dễ gây
# lỗi dữ liệu hoặc bỏ sót entry khi nhiều mẻ chạy cùng lúc.
_ab_lock = threading.Lock()

# Khoảng thời gian (giây) giữa mỗi lần kiểm tra rule trong _run_rule_batch.
# 5 giây là hợp lý: đủ nhanh để phản ứng kịp thời với thay đổi cảm biến,
# nhưng không quá dày để tránh truy vấn DB liên tục và làm nóng CPU.
POLL_INTERVAL = 3  # giây

# Ánh xạ chuỗi toán tử (từ DB) sang hàm so sánh Python tương ứng.
# Dùng module `operator` thay vì eval() để tránh rủi ro bảo mật: nếu giá
# trị operator từ DB bị inject mã độc, eval() sẽ thực thi nó; còn dict
# lookup chỉ trả về hàm đã biết trước, hoàn toàn an toàn.
_OP_MAP = {
    ">":  op_module.gt,   # greater than
    "<":  op_module.lt,   # less than
    "=":  op_module.eq,   # equal
    ">=": op_module.ge,   # greater than or equal
    "<=": op_module.le,   # less than or equal
}


# ─── DB helpers ───────────────────────────────────────────────────────────────

def _get_dryer_controllers(dryer_id: int) -> List[str]:
    """
    Lấy danh sách device_id (chuỗi) của tất cả thiết bị loại 'controller'
    thuộc máy sấy dryer_id.

    Controller là thiết bị có thể nhận lệnh điều khiển (quạt, nhiệt, v.v.).
    Hàm này được gọi trước khi tắt máy sấy để biết cần gửi lệnh tắt đến
    thiết bị nào.

    Dùng JOIN với device_types để lọc theo category = 'controller', tránh
    tắt nhầm các sensor (chỉ đọc dữ liệu, không điều khiển được).
    """
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT d.id FROM devices d
               JOIN device_types dt ON dt.id = d.type_id
               WHERE d.dryer_id = %s AND dt.category = 'controller'""",
            (dryer_id,),
        )
        # Trả về list device_id (cột đầu tiên của mỗi row)
        return [row[0] for row in cur.fetchall()]
    finally:
        # Đóng kết nối DB trong finally để đảm bảo không bị leak dù có
        # exception xảy ra bên trong try.
        conn.close()


def _turn_off_dryer(dryer_id: int) -> None:
    """
    Tắt toàn bộ controller của máy sấy bằng cách set giá trị về 0.

    Đây là bước dọn dẹp bắt buộc khi mẻ kết thúc (dù tự nhiên hay bị dừng
    sớm). Mục đích: đảm bảo thiết bị vật lý (quạt, bộ gia nhiệt, ...) không
    tiếp tục hoạt động khi không còn mẻ nào giám sát chúng.

    Exception được bắt từng thiết bị (không để ngoại lệ lan ra ngoài) để
    một controller bị lỗi không ngăn các controller còn lại bị tắt.
    """
    for device_id in _get_dryer_controllers(dryer_id):
        try:
            ok = device_manager.set_device_value(device_id, 0.0)
            if not ok:
                # set_device_value trả về False khi device chưa được đăng ký
                # với device_manager (chưa kết nối hoặc chưa khởi tạo).
                print(f"[batches] Không thể tắt {device_id} (chưa đăng ký)")
        except Exception as e:
            # Bắt mọi exception để tiếp tục tắt các controller còn lại.
            print(f"[batches] Lỗi tắt {device_id}: {e}")


def _get_stages_with_actions(schedule_id: int) -> List[dict]:
    """
    Lấy toàn bộ stages của một schedule, kèm theo danh sách actions của mỗi
    stage. Kết quả được sắp xếp theo start_offset tăng dần.

    Cấu trúc trả về (mỗi phần tử):
      {
        "id": int,
        "start_offset": int,   # giây tính từ lúc bắt đầu mẻ
        "name": str,
        "actions": [
          {"schedule_virtual_device_id": int, "value": ...},
          ...
        ]
      }

    Dùng hai query riêng (không JOIN) để tránh nhân bội dòng khi một stage
    có nhiều actions: JOIN sẽ trả N*M dòng thay vì N stage + M action riêng.
    """
    conn = get_db()
    try:
        # dictionary=True → cursor trả về dict thay vì tuple, dễ đọc hơn.
        cur = conn.cursor(dictionary=True)

        # Lấy tất cả stages, ORDER BY start_offset để đảm bảo thứ tự thực hiện
        # đúng theo tiến trình thời gian của schedule.
        cur.execute(
            "SELECT id, start_offset, name FROM stages WHERE schedule_id = %s ORDER BY start_offset",
            (schedule_id,),
        )
        stages = cur.fetchall()

        # Với mỗi stage, truy vấn thêm danh sách actions rồi gắn vào dict stage.
        for stage in stages:
            cur.execute(
                "SELECT schedule_virtual_device_id, value FROM schedule_actions WHERE stage_id = %s",
                (stage["id"],),
            )
            stage["actions"] = cur.fetchall()

        return stages
    finally:
        conn.close()


def _get_rule_value_pairs(rule_id: int) -> List[dict]:
    """
    Lấy toàn bộ value_pairs của một rule, kèm conditions và actions của từng
    pair. Pairs được sắp xếp theo id (thứ tự ưu tiên kiểm tra).

    Mỗi value_pair đại diện cho một tập hợp điều kiện (conditions) và hành
    động tương ứng (actions). Rule engine sẽ duyệt theo thứ tự id và thực
    hiện actions của pair đầu tiên có tất cả conditions thoả mãn (first match).

    Cấu trúc trả về (mỗi phần tử):
      {
        "id": int,
        "conditions": [
          {"rule_virtual_device_id": int, "operator": str, "compare_value": ...},
          ...
        ],
        "actions": [
          {"rule_virtual_device_id": int, "value": ...},
          ...
        ]
      }
    """
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        # ORDER BY id đảm bảo thứ tự ưu tiên: pair có id nhỏ hơn được kiểm tra
        # trước (first match). Người dùng sắp xếp priority bằng cách thêm pair
        # theo thứ tự mong muốn.
        cur.execute(
            "SELECT id, name FROM value_pairs WHERE rule_id = %s ORDER BY id",
            (rule_id,),
        )
        pairs = cur.fetchall()

        for pair in pairs:
            # Lấy tất cả conditions của pair này (liên kết AND với nhau).
            cur.execute(
                "SELECT rule_virtual_device_id, operator, compare_value FROM conditions WHERE value_pair_id = %s",
                (pair["id"],),
            )
            pair["conditions"] = cur.fetchall()

            # Lấy tất cả actions sẽ thực hiện khi pair này thoả mãn.
            cur.execute(
                "SELECT rule_virtual_device_id, value FROM rule_actions WHERE value_pair_id = %s",
                (pair["id"],),
            )
            pair["actions"] = cur.fetchall()

        return pairs
    finally:
        conn.close()


# ─── Condition evaluator ──────────────────────────────────────────────────────

def _check_conditions(
    conditions: List[dict],
    rvd_to_device: Dict[int, str],
    latest: Dict[str, Optional[float]],
) -> bool:
    """
    Kiểm tra toàn bộ conditions của một value_pair theo logic AND.

    Trả về True chỉ khi TẤT CẢ conditions đều thoả mãn.
    Trả về False ngay khi gặp bất kỳ condition nào thất bại (short-circuit).

    Args:
        conditions:    Danh sách conditions từ DB, mỗi phần tử chứa
                       rule_virtual_device_id, operator, compare_value.
        rvd_to_device: Ánh xạ rule_virtual_device_id → device_id thực tế,
                       do người dùng cung cấp khi bắt đầu mẻ.
        latest:        Giá trị đọc được gần nhất từ DB cho mỗi device_id.

    Tại sao trả về False khi conditions rỗng?
        Một pair không có condition nào nghĩa là luôn thoả mãn, dễ gây ra
        hành vi không mong muốn (actions chạy liên tục). Trả về False để
        buộc người dùng phải định nghĩa ít nhất một condition.
    """
    # Pair không có condition → coi như không thoả mãn để tránh actions
    # chạy liên tục không kiểm soát.
    if not conditions:
        return False

    for cond in conditions:
        # Tra cứu device_id thực tế từ rule_virtual_device_id.
        # Nếu không tìm thấy mapping → người dùng chưa cung cấp thiết bị
        # cho virtual device này → không thể đánh giá condition → False.
        dev_id = rvd_to_device.get(cond["rule_virtual_device_id"])
        if dev_id is None:
            return False

        # Lấy giá trị mới nhất của thiết bị đã đọc từ DB.
        # None nghĩa là chưa có dữ liệu đo nào → không thể so sánh → False.
        val = latest.get(dev_id)
        if val is None:
            return False

        # Lấy hàm so sánh tương ứng với operator (ví dụ: ">" → operator.gt).
        # Nếu operator không hợp lệ → False để tránh lỗi.
        compare_fn = _OP_MAP.get(cond["operator"])
        if compare_fn is None or not compare_fn(val, float(cond["compare_value"])):
            return False

    # Tất cả conditions đều thoả mãn.
    return True


# ─── Background workers ───────────────────────────────────────────────────────

def _run_manual_batch(
    batch_id: int,
    dryer_id: int,
    runtime: int,
    stop_event: threading.Event,
) -> None:
    """
    Worker thread cho mẻ sấy thủ công.

    Logic hoạt động:
      1. Chờ tối đa `runtime` giây, hoặc cho đến khi stop_event được set.
      2. Tắt toàn bộ controller của dryer.
      3. Xoá mẻ khỏi _active_batches để giải phóng bộ nhớ.

    Hàm này chạy trong daemon thread (không phải main thread của FastAPI),
    nên nó có thể block bao lâu cũng được mà không ảnh hưởng đến server.

    Tại sao dùng stop_event.wait(runtime) thay vì time.sleep(runtime)?
      stop_event.wait(timeout) vừa ngủ vừa lắng nghe tín hiệu dừng. Nếu
      endpoint /end gọi stop_event.set() trong lúc này, .wait() trả về ngay
      lập tức (trả về True) thay vì phải ngủ đủ `runtime` giây. Dùng
      time.sleep() sẽ không thể bị ngắt giữa chừng như vậy.
    """
    # Chờ hết runtime hoặc đến khi nhận tín hiệu dừng sớm từ endpoint /end.
    # .wait() trả về True nếu event được set (dừng sớm), False nếu hết timeout.
    stop_event.wait(runtime)

    # Xoá mẻ khỏi dict dưới lock để tránh race condition với endpoint /end
    # (có thể đang đồng thời cố pop cùng key này).
    # Dùng pop(key, None) thay vì del để tránh KeyError nếu /end đã xoá trước.
    with _ab_lock:
        _active_batches.pop(batch_id, None)

    print(f"[batches] Batch {batch_id} (manual) kết thúc sau {runtime}s")


def _run_schedule_batch(
    batch_id: int,
    dryer_id: int,
    schedule_id: int,
    runtime: int,
    svd_to_device: Dict[int, str],
    stop_event: threading.Event,
) -> None:
    """
    Worker thread cho mẻ sấy theo schedule.

    Mỗi stage trong schedule có một start_offset (giây tính từ lúc bắt đầu
    mẻ). Thread này duyệt lần lượt qua từng stage, chờ đến đúng thời điểm
    start_offset rồi thực hiện tất cả actions của stage đó.

    Logic hoạt động:
      - Với mỗi stage: tính thời gian cần chờ thêm, dùng stop_event.wait()
        để vừa chờ vừa lắng nghe tín hiệu dừng sớm.
      - Sau khi qua hết các stage: chờ nốt phần runtime còn lại (để giữ mẻ
        đang chạy cho đến đúng runtime, tránh tắt thiết bị quá sớm).
      - Cuối cùng: tắt controllers và dọn dẹp.

    Tại sao dùng time.monotonic() thay vì time.time()?
      time.time() có thể nhảy lùi nếu đồng hồ hệ thống được điều chỉnh (NTP,
      múi giờ, DST). time.monotonic() luôn tăng đều, đảm bảo tính toán thời
      gian chờ không bị âm hoặc sai lệch đột ngột.
    """
    # Lấy toàn bộ stages ngay khi bắt đầu, tránh truy vấn DB lặp lại trong vòng lặp.
    stages = _get_stages_with_actions(schedule_id)

    # Ghi lại mốc thời gian bắt đầu để tính elapsed time chính xác.
    batch_start = time.monotonic()

    for stage in stages:
        write_system_log("schedule_stage", "info",
                         f"Bắt đầu stage '{stage['name']}' của schedule_id={schedule_id} | batch_id={batch_id}",
                         user_id=None, dryer_id=dryer_id)
        offset = stage["start_offset"]
        now = time.monotonic()
        elapsed = now - batch_start

        # Nếu đã vượt quá runtime trước khi đến stage này → dừng vòng lặp.
        if elapsed >= runtime:
            break

        # Tính số giây cần chờ trước khi thực hiện stage:
        #   - (offset - elapsed): thời gian còn lại đến khi đến start_offset của stage.
        #   - (runtime - elapsed): thời gian còn lại của toàn bộ mẻ.
        # Lấy min để không chờ quá hết runtime; lấy max(0.0) để không chờ âm
        # (trường hợp stage đã bị trễ so với schedule).
        wait_sec = max(0.0, min(offset - elapsed, runtime - elapsed))

        # Chờ đến thời điểm thực hiện stage, hoặc nhận tín hiệu dừng sớm.
        triggered = stop_event.wait(wait_sec)
        if triggered:
            # Endpoint /end đã gọi → thoát ngay, không thực hiện stage này.
            break

        # Kiểm tra lại sau khi .wait() trả về (stop_event không bị set nhưng
        # có thể vừa hết runtime đúng lúc wait kết thúc).
        if time.monotonic() - batch_start >= runtime:
            break

        # Thực hiện tất cả actions của stage: gửi lệnh đến từng thiết bị.
        # svd_to_device dùng để chuyển từ virtual device ID (trong schedule)
        # sang device_id thực tế của phần cứng.
        for action in stage["actions"]:
            svd_id = action["schedule_virtual_device_id"]
            device_id = svd_to_device.get(svd_id)
            if device_id:
                try:
                    device_manager.set_device_value(device_id, float(action["value"]))
                    write_system_log("schedule_action", "info",
                                     f"Lịch trình {schedule_id} thiết lập giá trị thiết bị {device_id} = {action['value']} | batch_id={batch_id}",
                                     user_id= None, dryer_id=dryer_id)
                except Exception as e:
                    # Bắt lỗi từng action để một thiết bị lỗi không làm gián
                    # đoạn các action còn lại của cùng stage.
                    print(f"[batches] Lỗi stage action {device_id}: {e}")
        print(f"[batches] Batch {batch_id} stage '{stage['name']}' @ offset {offset}s")

    # Sau khi qua hết stages, chờ nốt phần runtime còn lại.
    # Điều này đảm bảo thiết bị không bị tắt sớm khi stage cuối cùng kết thúc
    # trước khi hết runtime (ví dụ: schedule chỉ có 2 stage nhưng runtime = 1 giờ).
    remaining = max(0.0, runtime - (time.monotonic() - batch_start))
    if remaining > 0 and not stop_event.is_set():
        stop_event.wait(remaining)

    # Xoá khỏi _active_batches dưới lock để tránh race condition.
    with _ab_lock:
        _active_batches.pop(batch_id, None)

    print(f"[batches] Batch {batch_id} (schedule) kết thúc")


def _run_rule_batch(
    batch_id: int,
    dryer_id: int,
    rule_id: int,
    runtime: int,
    rvd_to_device: Dict[int, str],
    stop_event: threading.Event,
) -> None:
    """
    Worker thread cho mẻ sấy điều khiển theo rule.

    Mỗi POLL_INTERVAL giây, thread đọc giá trị cảm biến mới nhất từ DB,
    duyệt qua các value_pairs theo thứ tự và thực hiện actions của pair
    đầu tiên có tất cả conditions thoả mãn (first match).

    Tại sao dùng vòng lặp polling thay vì event-driven?
      Cảm biến gửi dữ liệu định kỳ vào DB (qua MQTT gateway). Không có cơ
      chế callback trực tiếp khi giá trị DB thay đổi, nên cách thực tế nhất
      là đọc DB định kỳ để kiểm tra điều kiện.

    Tại sao POLL_INTERVAL = 5 giây?
      Đủ nhanh để phản ứng kịp thời (thiết bị sấy không thay đổi trạng thái
      quá nhanh), nhưng không quá dày để tránh query DB liên tục và tiêu tốn
      tài nguyên.
    """
    # Tải toàn bộ rule pairs một lần khi bắt đầu để không phải query DB
    # lặp lại trong mỗi vòng lặp (rule không thay đổi trong lúc mẻ chạy).
    pairs = _get_rule_value_pairs(rule_id)
    batch_start = time.monotonic()

    while True:
        # Tính thời gian còn lại của mẻ.
        remaining = runtime - (time.monotonic() - batch_start)
        if remaining <= 0:
            # Đã hết runtime → thoát vòng lặp.
            break

        # Chờ min(POLL_INTERVAL, remaining) giây:
        #   - Không chờ quá POLL_INTERVAL để polling đúng tần suất.
        #   - Không chờ quá remaining để thoát đúng khi hết runtime.
        #   - Nếu stop_event được set (endpoint /end gọi) → .wait() trả về
        #     True ngay lập tức → thoát vòng lặp sớm.
        triggered = stop_event.wait(min(POLL_INTERVAL, remaining))
        if triggered:
            break

        # Đọc giá trị mới nhất từ DB cho từng device được mapping.
        # Dùng set(rvd_to_device.values()) để loại bỏ trùng lặp: nhiều virtual
        # device có thể map đến cùng một device vật lý.
        latest: Dict[str, Optional[float]] = {
            dev_id: device_manager.get_latest_db_value(dev_id)
            for dev_id in set(rvd_to_device.values())
        }

        # Duyệt qua các pairs theo thứ tự id (đã sắp xếp khi load).
        # Chỉ thực hiện actions của pair ĐẦU TIÊN thoả mãn (first match),
        # sau đó break để không áp dụng thêm pair nào khác trong cùng chu kỳ.
        # Thiết kế này giúp người dùng định nghĩa thứ tự ưu tiên qua id.
        for pair in pairs:
            if _check_conditions(pair["conditions"], rvd_to_device, latest):
                for action in pair["actions"]:
                    dev_id = rvd_to_device.get(action["rule_virtual_device_id"])
                    if dev_id:
                        try:
                            last_val = latest.get(dev_id)
                            if float(action["value"]) != last_val:
                                device_manager.set_device_value(dev_id, float(action["value"]))
                                pair_name = pair.get("name") or f"C\u1eb7p {pair['id']}"
                                write_system_log("rule_alert", "warning",
                                 f"Rule {rule_id} \u2013 \"{pair_name}\" được kích hoạt | batch_id={batch_id}",
                                 user_id=None, dryer_id=dryer_id)
                                write_system_log("rule_action", "info",
                                                f"Rule {rule_id} thiết lập giá trị thiết bị {dev_id} = {action['value']} | batch_id={batch_id}",
                                                user_id=None, dryer_id=dryer_id)
                        except Exception as e:
                            # Bắt lỗi từng action để không làm gián đoạn
                            # các action còn lại của cùng pair.
                            print(f"[batches] Lỗi rule action {dev_id}: {e}")
                break  # first match only - không kiểm tra các pair tiếp theo

    # Xoá khỏi _active_batches dưới lock để tránh race condition.
    with _ab_lock:
        _active_batches.pop(batch_id, None)

    print(f"[batches] Batch {batch_id} (rule) kết thúc")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/manual", status_code=201)
def start_manual_batch(body: BatchStartManual, current_user: dict = Depends(get_current_user)):
    """
    Bắt đầu mẻ sấy thủ công.

    Endpoint này:
      1. Kiểm tra dryer và crop tồn tại trong DB.
      2. Tạo bản ghi batch mới trong DB.
      3. Tạo daemon thread để chờ hết runtime rồi tắt thiết bị.
      4. Trả về ngay lập tức với HTTP 201 (không chờ mẻ kết thúc).
    """
    conn = get_db()
    try:
        cur = conn.cursor()

        # Xác minh dryer tồn tại trước khi tạo batch để tránh dữ liệu rác.
        cur.execute("SELECT id FROM dryers WHERE id = %s", (body.dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")

        # crop_id là tuỳ chọn (có thể None), chỉ kiểm tra nếu được cung cấp.
        if body.crop_id is not None:
            cur.execute("SELECT id FROM crops WHERE id = %s", (body.crop_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Crop not found")

        # Tạo bản ghi batch với start_time = NOW() (thời gian server).
        # end_time, output_weight, rating sẽ được ghi sau khi mẻ kết thúc.
        cur.execute(
            "INSERT INTO batches (input_weight, start_time, dryer_id, crop_id) VALUES (%s, NOW(), %s, %s)",
            (body.input_weight, body.dryer_id, body.crop_id),
        )
        conn.commit()
        batch_id = cur.lastrowid  # ID tự tăng vừa được DB gán cho batch mới
    finally:
        conn.close()

    # Tạo Event để có thể ra lệnh dừng sớm cho thread từ endpoint /end.
    # threading.Event là cơ chế giao tiếp thread-safe: một thread gọi .set(),
    # thread khác đang .wait() sẽ được đánh thức ngay lập tức.
    stop_event = threading.Event()

    # Đăng ký stop_event vào _active_batches TRƯỚC khi start thread.
    # Cần lock vì endpoint /end có thể được gọi ngay sau khi batch được tạo,
    # trước khi thread kịp khởi động → cần dict nhất quán ngay từ đầu.
    with _ab_lock:
        _active_batches[batch_id] = stop_event

    # Tạo daemon thread để chạy mẻ trong nền.
    # daemon=True: thread sẽ tự dừng khi process chính (server) tắt, tránh
    # trường hợp server không thể thoát vì còn thread non-daemon đang chạy.
    # name=... giúp nhận biết thread khi debug (hiển thị trong stack trace).
    threading.Thread(
        target=_run_manual_batch,
        args=(batch_id, body.dryer_id, body.runtime, stop_event),
        daemon=True,
        name=f"batch-manual-{batch_id}",
    ).start()

    write_system_log("batch_start", "info",
                     f"Bắt đầu mẻ thủ công batch_id = {batch_id} tại dryer_id={body.dryer_id} runtime={body.runtime}s",
                     user_id=current_user["id"], dryer_id=body.dryer_id)

    # Trả về ngay lập tức. Client nhận được batch_id để có thể gọi /end sau.
    return {
        "id": batch_id,
        "dryer_id": body.dryer_id,
        "crop_id": body.crop_id,
        "input_weight": body.input_weight,
        "runtime": body.runtime,
        "status": "running",
    }


@router.put("/{batch_id}/end")
def end_batch(batch_id: int, body: BatchEnd, current_user: dict = Depends(get_current_user)):
    """
    Kết thúc mẻ sấy: ghi nhận kết quả và tắt thiết bị.

    Endpoint này xử lý hai tình huống:
      A) Dừng sớm (mẻ vẫn đang chạy trong thread nền): ghi end_time vào DB,
         báo hiệu thread dừng, tắt controllers ngay.
      B) Ghi nhận kết quả (mẻ đã tự kết thúc, thread đã dừng): chỉ cần cập
         nhật output_weight/rating và ghi end_time vào DB.

    Trong cả hai tình huống, endpoint luôn cố tắt controllers một lần nữa
    để đảm bảo an toàn (idempotent - gọi set_device_value(0) nhiều lần
    không gây hại).
    """
    conn = get_db()
    try:
        # Lấy toàn bộ thông tin batch để kiểm tra tồn tại và trạng thái.
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM batches WHERE id = %s", (batch_id,))
        batch = cur.fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Ngăn gọi /end hai lần: nếu end_time đã có → batch đã kết thúc trước đó.
        if batch["end_time"] is not None:
            raise HTTPException(status_code=400, detail="Batch already ended")

        # Ghi kết quả và đánh dấu thời điểm kết thúc.  end_time = NOW() để
        # đảm bảo timestamp chính xác theo đồng hồ DB server.
        cur.execute(
            "UPDATE batches SET output_weight = %s, rating = %s, end_time = NOW() WHERE id = %s",
            (body.output_weight, body.rating, batch_id),
        )
        conn.commit()
        dryer_id = batch["dryer_id"]
    finally:
        conn.close()

    # Dừng background worker nếu đang chạy.
    # Dùng lock để đảm bảo atomic: vừa lấy event vừa xoá khỏi dict trong một
    # thao tác không thể bị gián đoạn giữa chừng bởi thread nền.
    # pop(..., None) trả về None nếu batch không còn trong dict (thread đã tự
    # dọn dẹp sau khi hết runtime) → không cần kiểm tra KeyError.
    with _ab_lock:
        ev = _active_batches.pop(batch_id, None)
    if ev:
        # Báo hiệu cho thread nền dừng ngay lập tức.
        # Thread đang .wait() sẽ bị đánh thức và tiến hành dọn dẹp.
        ev.set()

    # Tắt controllers ngay lập tức từ chính HTTP handler, không chờ thread.
    # Điều này đảm bảo thiết bị tắt ngay khi client nhận phản hồi, dù thread
    # nền có thể còn mất thêm vài mili-giây để phản ứng với stop_event.
    _turn_off_dryer(dryer_id)
    write_system_log("device_control", "info",
                     f"Tắt thiết bị của dryer_id={dryer_id} khi kết thúc batch_id={batch_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)
    write_system_log("batch_end", "info",
                     f"Kết thúc mẻ batch_id={batch_id} dryer_id={dryer_id}",
                     user_id=current_user["id"], dryer_id=dryer_id)


    return {"id": batch_id, "status": "ended"}


@router.post("/schedule", status_code=201)
def start_schedule_batch(body: BatchStartSchedule, current_user: dict = Depends(get_current_user)):
    """
    Bắt đầu mẻ sấy theo schedule.

    Schedule là một kịch bản sấy được lập trình trước: gồm nhiều stage, mỗi
    stage kích hoạt ở một thời điểm xác định (start_offset tính từ đầu mẻ)
    và thực hiện một tập hợp lệnh điều khiển thiết bị.

    Body cần cung cấp `mappings`: danh sách ánh xạ từ virtual device ID
    (định nghĩa trong schedule) sang device_id vật lý thực tế.  Điều này
    cho phép tái sử dụng cùng một schedule cho các máy sấy khác nhau.
    """
    conn = get_db()
    try:
        cur = conn.cursor()

        # Xác minh các entity liên quan tồn tại trước khi tạo batch.
        cur.execute("SELECT id FROM dryers WHERE id = %s", (body.dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        cur.execute("SELECT id FROM schedules WHERE id = %s", (body.schedule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        if body.crop_id is not None:
            cur.execute("SELECT id FROM crops WHERE id = %s", (body.crop_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Crop not found")

        # Tạo bản ghi batch.
        cur.execute(
            "INSERT INTO batches (input_weight, start_time, dryer_id, crop_id) VALUES (%s, NOW(), %s, %s)",
            (body.input_weight, body.dryer_id, body.crop_id),
        )
        conn.commit()
        batch_id = cur.lastrowid

        # Lưu mapping vào DB để có thể truy vết sau này (audit trail):
        # thiết bị nào đã được dùng cho schedule nào trong mẻ nào.
        for m in body.mappings:
            cur.execute(
                """INSERT INTO batch_schedule_device_mapping
                   (batch_id, schedule_id, schedule_virtual_device_id, device_id)
                   VALUES (%s, %s, %s, %s)""",
                (batch_id, body.schedule_id, m.schedule_virtual_device_id, m.device_id),
            )
        conn.commit()
    finally:
        conn.close()

    # Chuyển mapping từ list (request body) sang dict để tra cứu O(1) trong thread.
    svd_to_device = {m.schedule_virtual_device_id: m.device_id for m in body.mappings}

    # Tạo stop_event và đăng ký vào _active_batches (xem giải thích ở start_manual_batch).
    stop_event = threading.Event()
    with _ab_lock:
        _active_batches[batch_id] = stop_event

    # Daemon thread chạy schedule trong nền (xem giải thích ở start_manual_batch).
    threading.Thread(
        target=_run_schedule_batch,
        args=(batch_id, body.dryer_id, body.schedule_id, body.runtime, svd_to_device, stop_event),
        daemon=True,
        name=f"batch-schedule-{batch_id}",
    ).start()

    write_system_log("batch_start", "info",
                     f"Bắt đầu mẻ batch_id = {batch_id} theo lịch schedule_id={body.schedule_id} tại dryer_id={body.dryer_id}",
                     user_id=current_user["id"], dryer_id=body.dryer_id)

    return {
        "id": batch_id,
        "dryer_id": body.dryer_id,
        "crop_id": body.crop_id,
        "schedule_id": body.schedule_id,
        "input_weight": body.input_weight,
        "runtime": body.runtime,
        "status": "running",
    }


@router.post("/rule", status_code=201)
def start_rule_batch(body: BatchStartRule, current_user: dict = Depends(get_current_user)):
    """
    Bắt đầu mẻ sấy điều khiển theo rule.

    Rule là tập hợp các value_pairs, mỗi pair gồm:
      - conditions: tập điều kiện dựa trên giá trị cảm biến (AND logic).
      - actions: lệnh điều khiển thiết bị khi conditions thoả mãn.

    Thread nền sẽ polling mỗi POLL_INTERVAL giây, đọc giá trị cảm biến từ
    DB và áp dụng first-match trong danh sách value_pairs.

    Body cần cung cấp `mappings`: ánh xạ từ rule_virtual_device_id sang
    device_id thực tế (tương tự schedule batch, cho phép tái sử dụng rule).
    """
    conn = get_db()
    try:
        cur = conn.cursor()

        # Xác minh các entity liên quan tồn tại.
        cur.execute("SELECT id FROM dryers WHERE id = %s", (body.dryer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Dryer not found")
        cur.execute("SELECT id FROM rules WHERE id = %s", (body.rule_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rule not found")
        if body.crop_id is not None:
            cur.execute("SELECT id FROM crops WHERE id = %s", (body.crop_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Crop not found")

        # Tạo bản ghi batch.
        cur.execute(
            "INSERT INTO batches (input_weight, start_time, dryer_id, crop_id) VALUES (%s, NOW(), %s, %s)",
            (body.input_weight, body.dryer_id, body.crop_id),
        )
        conn.commit()
        batch_id = cur.lastrowid

        # Lưu mapping vào DB (audit trail: rule virtual device nào → device thực nào).
        for m in body.mappings:
            cur.execute(
                """INSERT INTO batch_rule_device_mapping
                   (batch_id, rule_id, rule_virtual_device_id, device_id)
                   VALUES (%s, %s, %s, %s)""",
                (batch_id, body.rule_id, m.rule_virtual_device_id, m.device_id),
            )
        conn.commit()
    finally:
        conn.close()

    # Chuyển mapping sang dict để tra cứu O(1) trong thread nền.
    rvd_to_device = {m.rule_virtual_device_id: m.device_id for m in body.mappings}

    # Tạo stop_event và đăng ký vào _active_batches (xem giải thích ở start_manual_batch).
    stop_event = threading.Event()
    with _ab_lock:
        _active_batches[batch_id] = stop_event

    # Daemon thread chạy rule engine trong nền (xem giải thích ở start_manual_batch).
    threading.Thread(
        target=_run_rule_batch,
        args=(batch_id, body.dryer_id, body.rule_id, body.runtime, rvd_to_device, stop_event),
        daemon=True,
        name=f"batch-rule-{batch_id}",
    ).start()

    write_system_log("batch_start", "info",
                     f"Bắt đầu mẻ batch_id = {batch_id} theo rule rule_id={body.rule_id} tại dryer_id={body.dryer_id}",
                     user_id=current_user["id"], dryer_id=body.dryer_id)

    return {
        "id": batch_id,
        "dryer_id": body.dryer_id,
        "crop_id": body.crop_id,
        "rule_id": body.rule_id,
        "input_weight": body.input_weight,
        "runtime": body.runtime,
        "status": "running",
    }
