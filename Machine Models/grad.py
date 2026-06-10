import os
from fastapi import FastAPI, HTTPException, File, UploadFile, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from pydantic import BaseModel
from typing import Optional
from toxic import predict_toxicity
from FactChecker import FactChecker
from images import ImageDuplicateStore
from searchimages import search_similar_images, check_web_similarity
from chat import ChatAnalyzer          # ← NEW
from fastapi import APIRouter
from recommender import recommender

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

# -- Fact Checker (original — untouched) --
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

# -- Chat Analysis (NEW) --
class ChatRequest(BaseModel):
    text: str
    mode: str  # "grammar" or "factcheck"

class ChatResponse(BaseModel):
    text: str
    mode: str
    analysis: str

# -- Images --
class ImageStoreResponse(BaseModel):
    status: str
    image_id: str
    message: str
    local_matches: list = []
    web_matches: list = []

class ImageCheckResponse(BaseModel):
    is_duplicate: bool
    checked_web: bool
    local_matches: list = []
    web_matches: list = []

class ImageListResponse(BaseModel):
    count: int
    images: list = []

class ImageDeleteRequest(BaseModel):
    image_id: str

class ImageDeleteResponse(BaseModel):
    status: str
    image_id: str

# -- Web Search --
class WebSearchResponse(BaseModel):
    count: int
    results: list[dict]


class PostData(BaseModel):
    """Represents one post sent from the C# backend."""
    id:           str
    title:        str
    content:      str
    tags:         list[str]         = []
    community_id: Optional[str]     = None
    author_id:    str
    created_at:   str               # ISO-8601 UTC, e.g. "2026-05-10T14:30:00Z"
    has_media:    bool              = False
 
 
class InteractionData(BaseModel):
    """One interaction the user made — matches InteractionType C# enum."""
    post_id: str
    type:    str    # "Like" | "Share" | "Comment" | "Report"
 
 
class UserContext(BaseModel):
    """Communities and authors the user is connected to."""
    community_ids: list[str] = []   # community IDs the user is a member of
    followee_ids:  list[str] = []   # author IDs the user follows
 
 
class RecommendRequest(BaseModel):
    """
    Full payload sent by C# backend to get a ranked feed for one user.
    
    candidate_posts    : all posts eligible to be shown (approved, not banned)
    user_interactions  : everything this user has ever liked/shared/commented/reported
    user_context       : user's community memberships + followed authors
    top_n              : how many post IDs to return (default 20)
    """
    candidate_posts:   list[PostData]        = []
    user_interactions: list[InteractionData] = []
    user_context:      UserContext           = UserContext()
    top_n:             int                   = 20
 
 
class RecommendResponse(BaseModel):
    """Ordered list of post IDs — best recommendation first."""
    ranked_post_ids: list[str]
    total_candidates: int
    total_interactions: int
 

# ── Shared resources ────────────────────────────────────────────────────────

image_store = ImageDuplicateStore(
    model_path="duplicate_images.pth",
    db_path="./chroma_image_db",
    threshold=0.876,
)

chat_analyzer = ChatAnalyzer(api_key=FACT_CHECK_API_KEY)   # ← NEW


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Graduation Project API",
    description="Toxicity detection, fact checking, image copyright detection, and chat analysis.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    return predict_toxicity(req.text, return_probabilities=req.return_probabilities)


# ── Fact-checking endpoints (original — untouched) ──────────────────────────

@app.post("/fact-check", response_model=FactCheckResponse)
def fact_check(req: FactCheckRequest):
    if not req.article.strip():
        raise HTTPException(status_code=422, detail="Article must not be empty.")
    try:
        checker = FactChecker(api_key=FACT_CHECK_API_KEY)
        result = checker.check(req.article)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fact-check failed: {e}")

    lines = result.strip().splitlines()
    verdict = lines[-1].strip().upper() if lines else "UNKNOWN"
    analysis = "\n".join(lines[:-1]).strip() if len(lines) > 1 else result.strip()
    return FactCheckResponse(article=req.article, analysis=analysis, verdict=verdict)


# ── Chat analysis endpoint (NEW) ─────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Analyse text with one of two modes:

    - **grammar**   – detailed grammar, spelling, punctuation, and style review.
    - **factcheck** – deep fact-check report with per-claim verdicts and
                      an overall accuracy label (uses Google Search grounding).

    Both modes return a rich, human-readable analysis — not a simple true/false.
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty.")

    mode = req.mode.strip().lower()
    if mode not in ChatAnalyzer.MODES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid mode '{req.mode}'. Allowed values: {list(ChatAnalyzer.MODES)}",
        )

    try:
        analysis = chat_analyzer.analyse(req.text, mode=mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    return ChatResponse(text=req.text, mode=mode, analysis=analysis)


# ── Image copyright endpoints ───────────────────────────────────────────────

@app.post("/images/store", response_model=ImageStoreResponse)
async def store_image(
    image: UploadFile = File(..., description="Image file to store (JPEG, PNG, WEBP, etc.)"),
    image_id: str = Form(..., description="Unique ID to assign to this image"),
    check_web: bool = Query(
        default=False,
        description=(
            "If true: after passing the local DB check, also search the web for "
            "3 similar images and compare against the uploaded image. "
            "Rejects if similarity >= threshold."
        ),
    ),
):
    """
    Store an image in the copyright DB after running duplicate checks.

    - check_web=false (default): local DB check only before storing.
    - check_web=true: local DB check + web similarity check before storing.
      Rejected if either check finds a duplicate.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    if not image_id.strip():
        raise HTTPException(status_code=422, detail="image_id must not be empty.")

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Max 20 MB.")

    # ── Check ID uniqueness ─────────────────────────────────────
    existing = image_store.collection.get(ids=[image_id])
    if existing["ids"]:
        raise HTTPException(
            status_code=409,
            detail=f"ID '{image_id}' already exists. Delete it first.",
        )

    # ── Step 1: local DB check ──────────────────────────────────
    embedding = image_store._embed_from_bytes(image_bytes)
    local_duplicate, local_matches = image_store._check_copyright(embedding)

    if local_duplicate:
        raise HTTPException(
            status_code=409,
            detail={
                "status": "rejected",
                "reason": "local_db",
                "message": "Copyright violation detected in local DB — image NOT stored.",
                "local_matches": local_matches,
                "web_matches": [],
            },
        )

    # ── Step 2: web check (only if requested and local passed) ──
    if check_web:
        web_duplicate, web_matches = await check_web_similarity(
            image_bytes=image_bytes,
            embed_fn=image_store._embed_from_bytes,
            threshold=image_store.threshold,
            web_limit=3,
        )
        if web_duplicate:
            raise HTTPException(
                status_code=409,
                detail={
                    "status": "rejected",
                    "reason": "web",
                    "message": "Copyright violation detected on the web — image NOT stored.",
                    "local_matches": [],
                    "web_matches": web_matches,
                },
            )

    # ── All checks passed: store ────────────────────────────────
    image_store.collection.add(
        ids=[image_id],
        embeddings=[embedding],
        metadatas=[{"id": image_id}],
    )
    return ImageStoreResponse(
        status="stored",
        image_id=image_id,
        message=f"Image stored with id='{image_id}'.",
    )


@app.post("/images/check", response_model=ImageCheckResponse)
async def check_image(
    image: UploadFile = File(..., description="Image file to check (JPEG, PNG, WEBP, etc.)"),
    check_web: bool = Query(
        default=False,
        description=(
            "If true: after passing the local DB check, also search the web for "
            "3 similar images and compare against the uploaded image. "
            "Flags as duplicate if similarity >= threshold."
        ),
    ),
):
    """
    Check whether an uploaded image is a copyright duplicate.

    - check_web=false (default): local vector DB check only.
    - check_web=true: local DB check first. If no local match,
      fetch 3 web images via SerpAPI, embed and compare each.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Max 20 MB.")

    # ── Step 1: local DB check ──────────────────────────────────
    if image_store.collection.count() == 0:
        local_duplicate, local_matches = False, []
    else:
        embedding = image_store._embed_from_bytes(image_bytes)
        local_duplicate, local_matches = image_store._check_copyright(embedding)

    if local_duplicate:
        return ImageCheckResponse(
            is_duplicate=True,
            checked_web=False,
            local_matches=local_matches,
        )

    # ── Step 2: web check (only if requested and local passed) ──
    if not check_web:
        return ImageCheckResponse(
            is_duplicate=False,
            checked_web=False,
        )

    web_duplicate, web_matches = await check_web_similarity(
        image_bytes=image_bytes,
        embed_fn=image_store._embed_from_bytes,
        threshold=image_store.threshold,
        web_limit=3,
    )

    return ImageCheckResponse(
        is_duplicate=web_duplicate,
        checked_web=True,
        web_matches=web_matches,
    )


@app.get("/images/list", response_model=ImageListResponse)
def list_images():
    data = image_store.collection.get()
    images = [{"id": img_id} for img_id in data["ids"]]
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


# ── Web image search endpoint ───────────────────────────────────────────────

@app.post("/images/search-web", response_model=WebSearchResponse)
async def search_web(
    image: UploadFile = File(..., description="Image file to search (JPEG, PNG, WEBP, etc.)"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results to return"),
):
    """
    Upload an image and find visually similar images from the web via SerpAPI Google Lens.
    Requires SERPAPI_KEY in your .env file.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Max 20 MB.")

    results = await search_similar_images(image_bytes, limit=limit)
    return WebSearchResponse(count=len(results), results=results)


@app.post("/recommend/feed", response_model=RecommendResponse)
def get_feed(req: RecommendRequest):
    """
    Content-Based Filtering recommendation endpoint.
 
    The C# backend sends:
      - All approved posts (candidate pool)
      - The requesting user's full interaction history
      - The user's community memberships + followed authors
 
    Returns a ranked list of post IDs tailored to this user.
 
    Cold-start behaviour:
      - New user (no interactions) → returns newest posts first.
      - New post (no interactions on it) → still appears in ranking via TF-IDF similarity.
    """
    # Convert Pydantic models to plain dicts for the recommender
    candidate_posts    = [p.model_dump() for p in req.candidate_posts]
    user_interactions  = [i.model_dump() for i in req.user_interactions]
    user_context       = req.user_context.model_dump()
 
    ranked_ids = recommender.recommend(
        candidate_posts=candidate_posts,
        user_interactions=user_interactions,
        user_context=user_context,
        top_n=req.top_n,
    )
 
    return RecommendResponse(
        ranked_post_ids=ranked_ids,
        total_candidates=len(candidate_posts),
        total_interactions=len(user_interactions),
    )
if __name__ == "__main__":
    uvicorn.run("grad:app", host="0.0.0.0", port=8000, reload=True)