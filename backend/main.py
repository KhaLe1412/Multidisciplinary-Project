
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.auth import get_current_user
from src.db import insert_sensor_log
from src.api.auth.router import router as auth_router
from src.api.sensor.router import router as sensor_router
from src.api.areas.router import router as areas_router
from src.api.device_types.router import router as device_types_router
from src.api.dryers.router import router as dryers_router
from src.api.users.router import router as users_router
from src.api.policy.router import router as policy_router
from src.api.batches.router import router as batches_router
from src.api.logs.router import router as logs_router
from src.api.analytics.router import router as analytics_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
# auth_router là public (không cần token) — đăng nhập để lấy token.
# Tất cả các router còn lại yêu cầu Bearer token hợp lệ.

_auth_dep = [Depends(get_current_user)]

app.include_router(auth_router)
app.include_router(sensor_router,       dependencies=_auth_dep)
app.include_router(areas_router,        dependencies=_auth_dep)
app.include_router(device_types_router, dependencies=_auth_dep)
app.include_router(dryers_router,       dependencies=_auth_dep)
app.include_router(users_router,        dependencies=_auth_dep)
app.include_router(policy_router,       dependencies=_auth_dep)
app.include_router(batches_router,      dependencies=_auth_dep)
app.include_router(logs_router,         dependencies=_auth_dep)
app.include_router(analytics_router,    dependencies=_auth_dep)