import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import contracts, audit, reports, infographic, map

app = FastAPI(title="Oculus Auditor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("pdfs", exist_ok=True)
app.mount("/pdfs", StaticFiles(directory="pdfs"), name="pdfs")

app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(infographic.router, prefix="/api/infographic", tags=["infographic"])
app.include_router(map.router, prefix="/api/map", tags=["map"])


@app.get("/")
async def root():
    return {"name": "Oculus Auditor API", "version": "1.0.0", "status": "running"}
