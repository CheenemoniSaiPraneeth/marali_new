from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json, os, datetime
from pathlib import Path

app = FastAPI()

DATA_FILE = Path(os.environ.get("DATA_PATH", "habit_data.json"))

HABITS = [
    "dsa", "research", "bus_time", "gym", "walk",
    "no_social", "no_junk", "no_chat", "no_tt", "no_phone_am",
    "wake_early", "sleep_early"
]

def load_data():
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text())
        except:
            pass
    return {}

def save_data(data):
    tmp = str(DATA_FILE) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, str(DATA_FILE))

class DayEntry(BaseModel):
    date: str
    dsa: bool = False
    research: bool = False
    bus_time: bool = False
    gym: bool = False
    walk: bool = False
    no_social: bool = False
    no_junk: bool = False
    no_chat: bool = False
    no_tt: bool = False
    no_phone_am: bool = False
    wake_early: bool = False
    sleep_early: bool = False

@app.get("/api/data")
def get_data():
    data = load_data()
    entries = sorted(data.values(), key=lambda x: x["date"])
    return {"entries": entries}

@app.post("/api/log")
def log_day(entry: DayEntry):
    data = load_data()
    d = entry.dict()
    d["score"] = sum(d[h] for h in HABITS)
    data[entry.date] = d
    save_data(data)
    return {"ok": True, "score": d["score"]}

@app.get("/api/entry/{date}")
def get_entry(date: str):
    data = load_data()
    return data.get(date, {})

@app.delete("/api/entry/{date}")
def delete_entry(date: str):
    data = load_data()
    if date in data:
        del data[date]
        save_data(data)
    return {"ok": True}

# Serve React build
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
