from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from application.agents.shopping import ShoppingAgent
from domain.models import PetProfile, PetRecord
from infrastructure.shopping import NaverShoppingClient, NaverShoppingConfig, ShoppingRecommendationProvider
from middleware import ShoppingFallbackMiddleware


PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0SM0K3"


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    print("[manual smoke] naver shopping")
    print()
    smoke_naver_shopping_client()
    print()
    smoke_shopping_agent()


def smoke_naver_shopping_client() -> None:
    config = NaverShoppingConfig.from_env()
    client = NaverShoppingClient(config)
    items = client.search("반려견 사료", reason="manual smoke client search", source_record_ids=("manual-smoke",))

    print("[NaverShoppingClient]")
    print("credentials configured:", config.has_credentials)
    print("query:", "반려견 사료")
    print("result count:", len(items))
    _print_items(items)


def smoke_shopping_agent() -> None:
    agent = ShoppingAgent(ShoppingFallbackMiddleware(ShoppingRecommendationProvider(NaverShoppingClient())))
    record = PetRecord(
        id="record-shopping-smoke-1",
        pet_id=PET_ID,
        category="stool",
        title="배변 기록",
        detail="산책 중 배변해서 배변봉투가 필요해요.",
        status="normal",
        recorded_at="2026-05-11T08:00:00Z",
        source="manual",
    )
    recommendations = agent.recommend(
        PetProfile(id=PET_ID, name="초코", species="dog"),
        "산책 중 배변해서 배변봉투가 필요해요.",
        (record,),
    )

    print("[ShoppingAgent]")
    print("expected query:", "반려견 배변봉투")
    print("result count:", len(recommendations))
    print("source record ids:", tuple(recommendations[0].source_record_ids) if recommendations else ())
    _print_items(recommendations)


def _print_items(items) -> None:
    for index, item in enumerate(items, start=1):
        print(
            f"{index}. {item.title} | price={item.lowest_price} | mall={item.mall_name} | "
            f"query={item.query} | url={item.product_url}"
        )


if __name__ == "__main__":
    main()
