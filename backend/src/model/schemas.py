from pydantic import BaseModel
from typing import List, Optional


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class AreaCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    manager_id: Optional[int] = None


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None


class DeviceTypeCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    unit: Optional[str] = None
    max_value: Optional[float] = None
    min_value: Optional[float] = None
    category: str = "sensor"


class DeviceTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    max_value: Optional[float] = None
    min_value: Optional[float] = None
    category: Optional[str] = None


class DryerCreate(BaseModel):
    name: str
    area_id: int
    capacity: Optional[float] = None
    manager_id: Optional[int] = None
    status: Optional[str] = "off"


class DryerUpdate(BaseModel):
    name: Optional[str] = None
    area_id: Optional[int] = None
    capacity: Optional[float] = None
    manager_id: Optional[int] = None
    status: Optional[str] = None


class DeviceCreate(BaseModel):
    id: str
    name: str
    type_id: int
    power_status: Optional[str] = None
    # install_date is auto-set to today on creation


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type_id: Optional[int] = None
    power_status: Optional[str] = None
    install_date: Optional[str] = None


# ─── Crops ────────────────────────────────────────────────────────────────────

class CropCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class CropUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# ─── Schedule Virtual Devices ───────────────────────────────────────────────────

class ScheduleVirtualDeviceCreate(BaseModel):
    name: str
    device_type_id: Optional[int] = None

class ScheduleVirtualDeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type_id: Optional[int] = None


# ─── Rule Virtual Devices ──────────────────────────────────────────────────────

class RuleVirtualDeviceCreate(BaseModel):
    name: str
    device_type_id: Optional[int] = None

class RuleVirtualDeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type_id: Optional[int] = None


# ─── Schedules ────────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    name: str
    crop_id: Optional[int] = None
    virtual_devices: Optional[List[ScheduleVirtualDeviceCreate]] = []

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    crop_id: Optional[int] = None


# ─── Stages ───────────────────────────────────────────────────────────────────

class StageCreate(BaseModel):
    name: str
    start_offset: Optional[int] = 0

class StageUpdate(BaseModel):
    name: Optional[str] = None
    start_offset: Optional[int] = None


# ─── Schedule Actions ─────────────────────────────────────────────────────────

class ScheduleActionCreate(BaseModel):
    schedule_virtual_device_id: int
    value: float

class ScheduleActionUpdate(BaseModel):
    schedule_virtual_device_id: Optional[int] = None
    value: Optional[float] = None


# ─── Rules ────────────────────────────────────────────────────────────────────

class RuleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    crop_id: Optional[int] = None
    virtual_devices: Optional[List[RuleVirtualDeviceCreate]] = []

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    crop_id: Optional[int] = None


# ─── Value Pairs ──────────────────────────────────────────────────────────────

class ValuePairCreate(BaseModel):
    name: Optional[str] = ""

class ValuePairUpdate(BaseModel):
    name: Optional[str] = None


# ─── Conditions ───────────────────────────────────────────────────────────────

class ConditionCreate(BaseModel):
    operator: str  # >, <, =, >=, <=
    compare_value: float
    rule_virtual_device_id: int

class ConditionUpdate(BaseModel):
    operator: Optional[str] = None
    compare_value: Optional[float] = None
    rule_virtual_device_id: Optional[int] = None


# ─── Rule Actions ─────────────────────────────────────────────────────────

class RuleActionCreate(BaseModel):
    rule_virtual_device_id: int
    value: float

class RuleActionUpdate(BaseModel):
    rule_virtual_device_id: Optional[int] = None
    value: Optional[float] = None


# ─── Batches ──────────────────────────────────────────────────────────────────

class BatchStart(BaseModel):
    dryer_id: int
    crop_id: Optional[int] = None
    input_weight: Optional[float] = None
    runtime: Optional[int] = None  # giây, None = manual stop only


class BatchEnd(BaseModel):
    output_weight: Optional[float] = None
    rating: Optional[int] = None


class SvdDeviceMapping(BaseModel):
    schedule_virtual_device_id: int
    device_id: str


class RvdDeviceMapping(BaseModel):
    rule_virtual_device_id: int
    device_id: str


# ─── Local Schedules ─────────────────────────────────────────────────────────

class LocalScheduleCreate(BaseModel):
    name: str
    schedule_id: int
    mappings: List[SvdDeviceMapping]


class LocalScheduleUpdate(BaseModel):
    name: Optional[str] = None
    mappings: Optional[List[SvdDeviceMapping]] = None


# ─── Local Rules ──────────────────────────────────────────────────────────────

class LocalRuleCreate(BaseModel):
    name: str
    rule_id: int
    mappings: List[RvdDeviceMapping]


class LocalRuleUpdate(BaseModel):
    name: Optional[str] = None
    mappings: Optional[List[RvdDeviceMapping]] = None


# ─── Batch Schedule/Rule Control ──────────────────────────────────────────────

class BatchAddSchedules(BaseModel):
    local_schedule_ids: List[int]


class BatchAddRules(BaseModel):
    local_rule_ids: List[int]


class BatchRuleToggle(BaseModel):
    enabled: bool


class BatchScheduleToggle(BaseModel):
    enabled: bool

