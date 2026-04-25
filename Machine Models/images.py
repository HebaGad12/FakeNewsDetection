import os
import io
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image
import chromadb


# ─────────────────────────────────────────────
#  1.  Model
# ─────────────────────────────────────────────

class EmbeddingNet(nn.Module):
    def __init__(self, embedding_dim=128):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d(1)
        )
        self.fc = nn.Linear(128, embedding_dim)

    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        return F.normalize(x, p=2, dim=1)


# ─────────────────────────────────────────────
#  2.  ChromaDB store wrapper
# ─────────────────────────────────────────────

class ImageDuplicateStore:

    TRANSFORM = T.Compose([
        T.Resize((32, 32)),
        T.ToTensor(),
        T.Normalize(mean=[0.4914, 0.4822, 0.4465],
                    std=[0.2470, 0.2435, 0.2616]),
    ])

    def __init__(
        self,
        model_path: str    = "duplicate_images.pth",
        db_path: str       = "./chroma_image_db",
        threshold: float   = 0.876,
        embedding_dim: int = 128,
    ):
        self.threshold = threshold

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[store] device: {self.device}")

        self.model = EmbeddingNet(embedding_dim=embedding_dim).to(self.device)
        state = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state)
        self.model.eval()
        print(f"[store] model loaded from '{model_path}'")

        self.chroma = chromadb.PersistentClient(path=db_path)
        self.collection = self.chroma.get_or_create_collection(
            name="copyright_images",
            metadata={"hnsw:space": "cosine"},
        )
        print(f"[store] ChromaDB ready  ({self.collection.count()} images stored)\n")

    # ── internal helpers ─────────────────────────────────────────

    def _embed(self, image_path: str) -> list:
        """Embed an image from a file path."""
        img = Image.open(image_path).convert("RGB")
        tensor = self.TRANSFORM(img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            emb = self.model(tensor)
        return emb.squeeze(0).cpu().tolist()

    def _embed_from_bytes(self, image_bytes: bytes) -> list:
        """Embed an image from raw bytes (used for web image comparison)."""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = self.TRANSFORM(img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            emb = self.model(tensor)
        return emb.squeeze(0).cpu().tolist()

    def _prompt_image_path(self, prompt: str) -> str:
        """Ask the user for an image path and validate it exists."""
        while True:
            path = input(prompt).strip()
            if not path:
                print("   Path cannot be empty. Please try again.")
                continue
            if not os.path.isfile(path):
                print(f"    File not found: '{path}'. Please try again.")
                continue
            return path

    def _check_copyright(self, embedding: list) -> tuple:
        """
        Internal check: compare embedding against the store.
        Returns (is_duplicate, matches_list)
        """
        if self.collection.count() == 0:
            return False, []

        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=min(3, self.collection.count()),
        )

        matches = []
        for dist, img_id, meta in zip(
            results["distances"][0],
            results["ids"][0],
            results["metadatas"][0],
        ):
            similarity = 1.0 - dist
            if similarity >= self.threshold:
                matches.append({
                    "id":         img_id,
                    "similarity": round(similarity, 4),
                    "path":       meta.get("path", ""),
                })

        return len(matches) > 0, matches

    # ── public API ───────────────────────────────────────────────

    def store(self) -> None:
        print("\n── Store Image ─────────────────────────────────────────")
        image_path = self._prompt_image_path("  Enter image path : ")
        image_id   = input("  Enter image ID   : ").strip()

        if not image_id:
            print("   Image ID cannot be empty.")
            return

        existing = self.collection.get(ids=[image_id])
        if existing["ids"]:
            print(f"   ID '{image_id}' already exists. "
                  "Use Delete to remove it first.")
            return

        print("  Checking for copyright violations before storing...")
        embedding = self._embed(image_path)
        is_duplicate, matches = self._check_copyright(embedding)

        print("\n" + "═" * 60)
        if is_duplicate:
            print("  → COPYRIGHT VIOLATION DETECTED — image NOT stored.")
            for m in matches:
                print(f"     Matches id='{m['id']}'  "
                      f"similarity={m['similarity']:.4f}  "
                      f"path='{m['path']}'")
            print("═" * 60)
            return

        self.collection.add(
            ids=[image_id],
            embeddings=[embedding],
            metadatas=[{"path": image_path}],
        )
        print(f"  → No violation found. Image stored with id='{image_id}'")
        print("═" * 60)

    def check(self) -> dict:
        print("\n── Check Image ─────────────────────────────────────────")
        image_path = self._prompt_image_path("  Enter image path to check : ")

        if self.collection.count() == 0:
            print("  Database is empty – nothing to compare against.")
            return {"is_duplicate": False, "matches": []}

        embedding = self._embed(image_path)
        is_duplicate, matches = self._check_copyright(embedding)

        print("\n" + "═" * 60)
        print(f"  Query     : {image_path}")
        print(f"  Threshold : {self.threshold}")
        if is_duplicate:
            print("  → COPYRIGHT VIOLATION DETECTED")
            for m in matches:
                print(f"     Matched id='{m['id']}'  "
                      f"similarity={m['similarity']:.4f}  "
                      f"path='{m['path']}'")
        else:
            print("  → No duplicate found")
        print("═" * 60)

        return {"is_duplicate": is_duplicate, "matches": matches}

    def list_all(self) -> None:
        print("\n── Stored Images ───────────────────────────────────────")
        data = self.collection.get()
        if not data["ids"]:
            print("  Database is empty.")
            return
        print(f"  {len(data['ids'])} image(s) in store:\n")
        for img_id, meta in zip(data["ids"], data["metadatas"]):
            print(f"  • id='{img_id}'  path='{meta.get('path')}'")

    def delete(self) -> None:
        print("\n── Delete Image ────────────────────────────────────────")
        image_id = input("  Enter image ID to delete : ").strip()
        if not image_id:
            print("   Image ID cannot be empty.")
            return
        self.collection.delete(ids=[image_id])
        print(f"  Removed id='{image_id}'")


# ─────────────────────────────────────────────
#  3.  Interactive menu
# ─────────────────────────────────────────────

def main():
    MODEL_PATH = "duplicate_images.pth"
    DB_PATH    = "./chroma_image_db"
    THRESHOLD  = 0.876

    store = ImageDuplicateStore(
        model_path=MODEL_PATH,
        db_path=DB_PATH,
        threshold=THRESHOLD,
    )

    MENU = """
╔══════════════════════════════════════╗
║   Copyright Duplicate Detector       ║
╠══════════════════════════════════════╣
║  1 → Store an image                  ║
║  2 → Check image for duplicates      ║
║  3 → List all stored images          ║
║  4 → Delete an image                 ║
║  0 → Exit                            ║
╚══════════════════════════════════════╝
"""

    while True:
        print(MENU)
        choice = input("Select option: ").strip()

        if   choice == "1": store.store()
        elif choice == "2": store.check()
        elif choice == "3": store.list_all()
        elif choice == "4": store.delete()
        elif choice == "0":
            print("Goodbye!")
            break
        else:
            print("    Invalid option. Please enter 0-4.")


if __name__ == "__main__":
    main()