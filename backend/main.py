from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, embed, search

app = FastAPI(title="MedCompanion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,   prefix="/api")
app.include_router(embed.router,  prefix="/api")
app.include_router(search.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}