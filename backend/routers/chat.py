import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

router = APIRouter()
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
SUPABASE_URL   = os.getenv("SUPABASE_URL")
SUPABASE_KEY   = os.getenv("SUPABASE_KEY")
NIM_BASE       = "https://integrate.api.nvidia.com/v1"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class ChatRequest(BaseModel):
    question: str
    med_names: list[str] = []

async def embed_question(question: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{NIM_BASE}/embeddings",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "nvidia/llama-3.2-nv-embedqa-1b-v2",
                "input": [question],
                "input_type": "query",
                "encoding_format": "float",
            }
        )
    r.raise_for_status()
    return r.json()["data"][0]["embedding"]

async def retrieve_chunks(question: str, med_names: list[str]) -> list[str]:
    embedding = await embed_question(question)
    all_chunks = []
    search_meds = med_names if med_names else ["%%"]
    for med in search_meds:
        result = supabase.rpc("match_med_chunks", {
            "query_embedding": embedding,
            "match_med": med if med_names else "%%",
            "match_count": 5,
        }).execute()
        if result.data:
            all_chunks.extend([row["chunk_text"] for row in result.data])
    if not all_chunks:
        return []
    return all_chunks[:3]

@router.post("/chat")
async def chat(req: ChatRequest):
    if not NVIDIA_API_KEY:
        raise HTTPException(500, "NVIDIA_API_KEY not set")
    chunks = await retrieve_chunks(req.question, req.med_names)
    if chunks:
        context = "\n\n---\n\n".join(chunks)
        system_prompt = f"""You are MedCompanion, a helpful medication assistant.
Answer the user's question using ONLY the FDA label information provided below.
If the answer isn't in the provided context, say so and recommend consulting a doctor.
Always remind users this is not medical advice.

The user's medications: {', '.join(req.med_names) or 'unknown'}

FDA LABEL CONTEXT:
{context}"""
    else:
        system_prompt = f"""You are MedCompanion, a helpful medication assistant.
Answer questions about medications clearly and safely.
Always remind users to consult their doctor for medical advice.
The user's medications are: {', '.join(req.med_names) or 'unknown'}."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{NIM_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": req.question},
                ],
                "max_tokens": 512,
                "temperature": 0.2,
            }
        )
    r.raise_for_status()
    raw_answer = r.json()["choices"][0]["message"]["content"]
    answer = re.sub(r'<think>.*?</think>', '', raw_answer, flags=re.DOTALL).strip()
    return {
        "answer": answer,
        "sources": len(chunks),
        "rag_used": len(chunks) > 0,
    }