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

class IngestRequest(BaseModel):
    med_name: str

def chunk_text(text: str, size: int = 400, overlap: int = 50):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += size - overlap
    return chunks

async def fetch_fda_label(med_name: str) -> str:
    url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:{med_name}&limit=1"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url)
    if r.status_code != 200:
        return ""
    data = r.json()
    results = data.get("results", [])
    if not results:
        return ""
    label = results[0]
    fields = ["indications_and_usage", "warnings", "adverse_reactions",
              "drug_interactions", "dosage_and_administration", "description"]
    return " ".join(
        " ".join(label.get(f, [])) for f in fields if label.get(f)
    )

async def embed_texts(texts: list[str]) -> list[list[float]]:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{NIM_BASE}/embeddings",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "nvidia/llama-3.2-nv-embedqa-1b-v2",
                "input": texts,
                "input_type": "passage",
                "encoding_format": "float",
            }
        )
    r.raise_for_status()
    return [item["embedding"] for item in r.json()["data"]]

@router.post("/ingest")
async def ingest(req: IngestRequest):
    # Delete old chunks for this med
    supabase.table("med_chunks").delete().ilike("med_name", req.med_name).execute()

    # Fetch FDA label
    text = await fetch_fda_label(req.med_name)
    if not text:
        raise HTTPException(404, f"No FDA label found for {req.med_name}")

    # Chunk + embed
    chunks = chunk_text(text)
    embeddings = await embed_texts(chunks)

    # Store in Supabase
    rows = [
        {"med_name": req.med_name, "chunk_text": c, "embedding": e}
        for c, e in zip(chunks, embeddings)
    ]
    supabase.table("med_chunks").insert(rows).execute()

    return {"med_name": req.med_name, "chunks_stored": len(rows)}