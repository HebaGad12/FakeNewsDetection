"""
recommender.py
Content-Based Filtering recommendation engine for FakeNewsDetection social platform.

Features used per post:
  - Title + Content + Tags  →  TF-IDF text vector
  - CommunityId             →  community membership boost
  - CreatedAt               →  recency decay score
  - has_media               →  media preference boost

Interaction weights (from InteractionType C# enum):
  Like    →  1.0  (positive)
  Share   →  1.5  (strongest positive)
  Comment →  0.8  (positive)
  Report  → -1.0  (negative — user disliked this content)
"""

import math
from datetime import datetime, timezone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


# ── Interaction weights (must match InteractionType C# enum exactly) ─────────
INTERACTION_WEIGHTS: dict[str, float] = {
    "Like":    1.0,
    "Share":   1.5,
    "Comment": 0.8,
    "Report": -1.0,
}

# ── Boost constants ──────────────────────────────────────────────────────────
COMMUNITY_BOOST        = 0.30   # post is in a community the user joined
FOLLOWEE_BOOST         = 0.20   # post author is followed by the user
MEDIA_BOOST            = 0.10   # post has media AND user tends to like media posts
RECENCY_HALF_LIFE_DAYS = 7      # post score halves every 7 days


# ── Dict shapes expected by this module ─────────────────────────────────────
#
# PostData:
#   id           : str   (Guid as string)
#   title        : str
#   content      : str
#   tags         : list[str]
#   community_id : str | None
#   author_id    : str
#   created_at   : str   (ISO-8601 UTC, e.g. "2026-05-10T14:30:00Z")
#   has_media    : bool
#
# InteractionData:
#   post_id : str
#   type    : str   ("Like" | "Share" | "Comment" | "Report")
#
# UserContext:
#   community_ids : list[str]   (community IDs the user is a member of)
#   followee_ids  : list[str]   (author IDs the user follows)


def _recency_score(created_at_iso: str) -> float:
    """
    Exponential decay based on post age.
    Today = 1.0 | 7 days old = 0.5 | 14 days old = 0.25
    """
    try:
        created = datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age_days = max((now - created).total_seconds() / 86400, 0)
        return math.pow(0.5, age_days / RECENCY_HALF_LIFE_DAYS)
    except Exception:
        return 0.5


def _build_document(post: dict) -> str:
    """
    Merge title + content + tags into a single string for TF-IDF.
    Tags are repeated to give them extra weight without a custom tokenizer.
    """
    title   = post.get("title") or ""
    content = post.get("content") or ""
    tags    = " ".join(post.get("tags") or [])
    return f"{title} {content} {tags} {tags}".strip()


def _user_prefers_media(interactions: list[dict], post_map: dict) -> bool:
    """
    Returns True if > 40% of the user's positive interactions were on media posts.
    Used to decide whether to apply the media boost.
    """
    positive = [i for i in interactions if INTERACTION_WEIGHTS.get(i["type"], 0) > 0]
    if not positive:
        return False
    media_count = sum(
        1 for i in positive
        if post_map.get(i["post_id"], {}).get("has_media", False)
    )
    return (media_count / len(positive)) > 0.4


class ContentBasedRecommender:
    """
    Stateless recommender — recomputes TF-IDF per request.
    This is intentional for news: posts expire fast, so a cached model
    goes stale quickly. TF-IDF on thousands of short news posts is fast (<1s).
    """

    def recommend(
        self,
        candidate_posts: list[dict],    # all available posts to rank
        user_interactions: list[dict],  # this user's interaction history
        user_context: dict,             # community_ids + followee_ids
        top_n: int = 20,
    ) -> list[str]:
        """
        Returns a ranked list of post IDs (best first), length <= top_n.

        Algorithm:
          1. Remove posts the user already interacted with.
          2. Cold-start guard: if no history → return newest posts.
          3. Build TF-IDF matrix over corpus (history posts + candidates).
          4. Build weighted user profile vector from interaction history.
          5. Score each candidate = cosine_similarity × recency + boosts.
          6. Sort descending, return top_n IDs.
        """

        if not candidate_posts:
            return []

        # ── Step 1: exclude already-interacted posts ──────────────────────────
        interacted_ids = {i["post_id"] for i in user_interactions}
        candidates = [p for p in candidate_posts if p["id"] not in interacted_ids]

        if not candidates:
            return []

        # ── Step 2: cold-start fallback ───────────────────────────────────────
        if not user_interactions:
            return self._recency_fallback(candidates, top_n)

        # ── Step 3: build TF-IDF corpus ───────────────────────────────────────
        # Include history posts (for profile building) + candidate posts (for scoring)
        all_post_map = {p["id"]: p for p in candidate_posts}

        history_posts = [
            all_post_map[i["post_id"]]
            for i in user_interactions
            if i["post_id"] in all_post_map
        ]

        # Deduplicated combined corpus
        corpus_map: dict[str, dict] = {}
        for p in history_posts + candidates:
            corpus_map[p["id"]] = p
        corpus = list(corpus_map.values())

        if len(corpus) < 2:
            return self._recency_fallback(candidates, top_n)

        documents = [_build_document(p) for p in corpus]
        post_ids  = [p["id"] for p in corpus]

        vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),    # unigrams + bigrams capture phrases like "fake news"
            sublinear_tf=True,     # log(tf) dampens very frequent terms
            min_df=1,
            stop_words="english",
        )

        try:
            tfidf_matrix = vectorizer.fit_transform(documents)  # (n_posts, n_features)
        except ValueError:
            # All docs empty or only stop words
            return self._recency_fallback(candidates, top_n)

        id_to_idx = {pid: idx for idx, pid in enumerate(post_ids)}

        # ── Step 4: build user profile vector ────────────────────────────────
        n_features   = tfidf_matrix.shape[1]
        profile_vec  = np.zeros(n_features)
        total_weight = 0.0

        for interaction in user_interactions:
            pid    = interaction["post_id"]
            weight = INTERACTION_WEIGHTS.get(interaction["type"], 0.0)

            if pid not in id_to_idx or weight == 0:
                continue

            idx      = id_to_idx[pid]
            post_vec = tfidf_matrix[idx].toarray().flatten()
            profile_vec  += weight * post_vec
            total_weight += abs(weight)

        if total_weight == 0:
            return self._recency_fallback(candidates, top_n)

        profile_vec = profile_vec / total_weight  # L1 normalize

        # ── Step 5: score each candidate ─────────────────────────────────────
        user_community_ids = set(user_context.get("community_ids") or [])
        user_followee_ids  = set(user_context.get("followee_ids") or [])

        # For media preference check, build a quick lookup
        post_meta_map = {p["id"]: p for p in candidate_posts}
        prefers_media = _user_prefers_media(user_interactions, post_meta_map)

        scored: list[tuple[str, float]] = []

        for post in candidates:
            pid = post["id"]

            # Base score: cosine similarity between user profile and post vector
            if pid in id_to_idx:
                idx      = id_to_idx[pid]
                post_vec = tfidf_matrix[idx].toarray()
                base     = float(
                    cosine_similarity(profile_vec.reshape(1, -1), post_vec)[0][0]
                )
            else:
                base = 0.0

            # Recency multiplier (newer posts score higher)
            recency = _recency_score(post.get("created_at", ""))

            # Additive context boosts
            boost = 0.0
            if post.get("community_id") and post["community_id"] in user_community_ids:
                boost += COMMUNITY_BOOST
            if post.get("author_id") and post["author_id"] in user_followee_ids:
                boost += FOLLOWEE_BOOST
            if prefers_media and post.get("has_media", False):
                boost += MEDIA_BOOST

            final_score = (base * recency) + boost
            scored.append((pid, final_score))

        # ── Step 6: sort and return ───────────────────────────────────────────
        scored.sort(key=lambda x: x[1], reverse=True)
        return [pid for pid, _ in scored[:top_n]]

    def _recency_fallback(self, posts: list[dict], top_n: int) -> list[str]:
        """Cold-start: rank purely by recency (newest first)."""
        sorted_posts = sorted(
            posts,
            key=lambda p: p.get("created_at", ""),
            reverse=True,
        )
        return [p["id"] for p in sorted_posts[:top_n]]


# ── Module-level singleton (import this in grad.py) ──────────────────────────
recommender = ContentBasedRecommender()