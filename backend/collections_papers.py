from typing import Any


def store_paper_in_collection(
    supabase_client: Any,
    *,
    user_id: str,
    collection_id: str,
    paper_name: str,
    paper_path: str,
) -> Any:
    return supabase_client.table("collection_papers").upsert(
        {
            "user_id": user_id,
            "collection_id": collection_id,
            "paper_name": paper_name,
            "paper_path": paper_path,
        },
        on_conflict="user_id,collection_id,paper_path",
    )
