import asyncio
import logging
from app.core.database import SessionLocal
from app.services.ai_service import search_stories_semantic, recommend_stories_for_user
from app.schemas.ai import AISemanticSearchRequest

logging.basicConfig(level=logging.DEBUG)

async def main():
    db = SessionLocal()
    try:
        print("Testing Search...")
        req = AISemanticSearchRequest(query="kiếm hiệp", semantic=True)
        res = await search_stories_semantic(db, req)
        print("Search Fallback:", res.fallback)
        print("Search Results count:", len(res.results))
        if res.results:
            print("Search Reason:", res.results[0].ai_reason)

        print("\nTesting Recommend...")
        res_rec = await recommend_stories_for_user(db, "anonymous")
        print("Recommend Fallback:", res_rec.fallback)
        print("Recommend Results count:", len(res_rec.results))
        if res_rec.results:
            print("Recommend Reason:", res_rec.results[0].reason)
            print("Recommend Source:", res_rec.results[0].source)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
