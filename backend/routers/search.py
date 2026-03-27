from fastapi import APIRouter
router = APIRouter()

# Placeholder — pgvector search comes in Session 2
@router.get("/search")
def search():
    return {"status": "not implemented yet"}
