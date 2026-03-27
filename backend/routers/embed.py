from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NIM_BASE = "https://integrate.api.nvidia.com/v1"

class EmbedRequest(BaseModel):
    texts: list[str]

@router.post("/embed")
async def embed(req: EmbedRequest):
    if not NVIDIA_API_KEY:
        raise HTTPException(500, "NVIDIA_API_KEY not set")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{NIM_BASE}/embeddings",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "nvidia/llama-3.2-nv-embedqa-1b-v2",
                "input": req.texts,
                "input_type": "passage",
                "encoding_format": "float",
            }
        )
    resp.raise_for_status()
    embeddings = [item["embedding"] for item in resp.json()["data"]]
    return {"embeddings": embeddings}