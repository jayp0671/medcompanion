from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NIM_BASE = "https://integrate.api.nvidia.com/v1"

class ChatRequest(BaseModel):
    question: str
    med_names: list[str] = []

@router.post("/chat")
async def chat(req: ChatRequest):
    if not NVIDIA_API_KEY:
        raise HTTPException(500, "NVIDIA_API_KEY not set")

    # Placeholder — full RAG chain comes in Session 3
    # For now: direct LLM call so Chat.jsx works immediately
    system_prompt = (
        "You are MedCompanion, a helpful medication assistant. "
        "Answer questions about medications clearly and safely. "
        "Always remind users to consult their doctor for medical advice. "
        f"The user's medications are: {', '.join(req.med_names) or 'unknown'}."
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{NIM_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "meta/llama-3.3-70b-instruct",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": req.question},
                ],
                "max_tokens": 512,
                "temperature": 0.2,
            }
        )
    resp.raise_for_status()
    return {"answer": resp.json()["choices"][0]["message"]["content"]}