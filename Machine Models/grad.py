import os
from urllib.parse import unquote, urlparse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import your model code
from toxic import predict_toxicity
from FactChecker import FactChecker
from images import ImageDuplicateStore


# ── Request / Response schemas ──────────────────────────────────────────────

# -- Toxicity --
class PredictRequest(BaseModel):
    text: str
    return_probabilities: bool = False

class PredictResponse(BaseModel):
    input_text: str
    processed_text: str
    predicted_label: str
    prediction_int: int
    confidence_non_toxic: float | None = None
    confidence_toxic: float | None = None

# -- Fact Checker --
from dotenv import load_dotenv
load_dotenv()
FACT_CHECK_API_KEY = os.getenv("GEMINI_API_KEY")
if not FACT_CHECK_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file.")

class FactCheckRequest(BaseModel):
    article: str

class FactCheckResponse(BaseModel):
    article: str
    analysis: str
    verdict: str

# -- Images --
class ImageStoreRequest(BaseModel):
    image_path: str
    image_id: str

class ImageCheckRequest(BaseModel):
    image_path: str

class ImageDeleteRequest(BaseModel):
    image_id: str

class ImageStoreResponse(BaseModel):
    status: str
    image_id: str
    message: str
    matches: list = []

class ImageCheckResponse(BaseModel):
    is_duplicate: bool
    matches: list = []

class ImageListResponse(BaseModel):
    count: int
    images: list = []

class ImageDeleteResponse(BaseModel):
    status: str
    image_id: str


# ── Shared resources ────────────────────────────────────────────────────────

image_store = ImageDuplicateStore(
    model_path="duplicate_images.pth",
    db_path="./chroma_image_db",
    threshold=0.876,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def resolve_image_path(image_path: str) -> str:
    path = image_path.strip()
    if path.startswith("file://"):
        parsed = urlparse(path)
        path = unquote(parsed.path)

    path = os.path.expanduser(path)
    if os.path.isabs(path):
        return os.path.abspath(path)

    return os.path.abspath(os.path.join(BASE_DIR, path))


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Graduation Project API",
    description="Toxicity detection, fact checking, and image copyright detection.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:7044",
        "http://localhost:5263",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Toxicity endpoints ──────────────────────────────────────────────────────

@app.post("/istoxic", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="Text must not be empty.")

    result = predict_toxicity(req.text, return_probabilities=req.return_probabilities)
    return result


# ── Fact-checking endpoints ─────────────────────────────────────────────────

@app.post("/fact-check", response_model=FactCheckResponse)
def fact_check(req: FactCheckRequest):
    if not req.article.strip():
        raise HTTPException(status_code=422, detail="Article must not be empty.")

    try:
        checker = FactChecker(api_key=FACT_CHECK_API_KEY)
        result = checker.check(req.article)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fact-check failed: {e}")

    # Parse verdict from last line
    lines = result.strip().splitlines()
    verdict = lines[-1].strip().upper() if lines else "UNKNOWN"
    analysis = "\n".join(lines[:-1]).strip() if len(lines) > 1 else result.strip()

    return FactCheckResponse(article=req.article, analysis=analysis, verdict=verdict)


# ── Image copyright endpoints ──────────────────────────────────────────────

@app.post("/images/store", response_model=ImageStoreResponse)
def store_image(req: ImageStoreRequest):
    if not req.image_id.strip():
        raise HTTPException(status_code=422, detail="image_id must not be empty.")
    if not req.image_path.strip():
        raise HTTPException(status_code=422, detail="image_path must not be empty.")
    resolved_path = resolve_image_path(req.image_path)
    if not os.path.isfile(resolved_path):
        raise HTTPException(
            status_code=404,
            detail=(
                f"File not found on server filesystem: '{req.image_path}' "
                f"(resolved to '{resolved_path}')."
            ),
        )

    # Check if ID already exists
    existing = image_store.collection.get(ids=[req.image_id])
    if existing["ids"]:
        raise HTTPException(
            status_code=409,
            detail=f"ID '{req.image_id}' already exists. Delete it first.",
        )

    embedding = image_store._embed(resolved_path)
    is_duplicate, matches = image_store._check_copyright(embedding)

    if is_duplicate:
        return ImageStoreResponse(
            status="rejected",
            image_id=req.image_id,
            message="Copyright violation detected — image NOT stored.",
            matches=matches,
        )

    image_store.collection.add(
        ids=[req.image_id],
        embeddings=[embedding],
        metadatas=[{"path": resolved_path}],
    )
    return ImageStoreResponse(
        status="stored",
        image_id=req.image_id,
        message=f"Image stored with id='{req.image_id}'.",
    )


@app.post("/images/check", response_model=ImageCheckResponse)
def check_image(req: ImageCheckRequest):
    if not req.image_path.strip():
        raise HTTPException(status_code=422, detail="image_path must not be empty.")
    resolved_path = resolve_image_path(req.image_path)
    if not os.path.isfile(resolved_path):
        raise HTTPException(
            status_code=404,
            detail=(
                f"File not found on server filesystem: '{req.image_path}' "
                f"(resolved to '{resolved_path}')."
            ),
        )

    if image_store.collection.count() == 0:
        return ImageCheckResponse(is_duplicate=False, matches=[])

    embedding = image_store._embed(resolved_path)
    is_duplicate, matches = image_store._check_copyright(embedding)
    return ImageCheckResponse(is_duplicate=is_duplicate, matches=matches)


@app.get("/images/list", response_model=ImageListResponse)
def list_images():
    data = image_store.collection.get()
    images = []
    for img_id, meta in zip(data["ids"], data["metadatas"]):
        images.append({"id": img_id, "path": meta.get("path", "")})
    return ImageListResponse(count=len(images), images=images)


@app.delete("/images/delete", response_model=ImageDeleteResponse)
def delete_image(req: ImageDeleteRequest):
    if not req.image_id.strip():
        raise HTTPException(status_code=422, detail="image_id must not be empty.")

    existing = image_store.collection.get(ids=[req.image_id])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail=f"Image '{req.image_id}' not found.")

    image_store.collection.delete(ids=[req.image_id])
    return ImageDeleteResponse(status="deleted", image_id=req.image_id)


if __name__ == "__main__":
    uvicorn.run("grad:app", host="0.0.0.0", port=8000, reload=True)
