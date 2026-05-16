from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, time, timedelta
from pathlib import Path

SAMPLE_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3"
SAMPLE_PET_IDS = ("pet_01JCM7V8H9Q2K4N6R8T0A1B2C3", "pet_01JCM7V8H9Q2K4N6R8T0D4E5F6", "pet_01JCM7V8H9Q2K4N6R8T0G7H8J9")


def seed_database(database_path: str | Path | None = None, today: date | None = None) -> None:
    from infrastructure.database import connect

    connection = connect(database_path)
    try:
        seed_default_data(connection, today=today)
    finally:
        connection.close()


def seed_default_data(connection: sqlite3.Connection, today: date | None = None) -> None:
    base_date = today or date.today()
    connection.executemany(
        """
        INSERT OR IGNORE INTO pets (id, owner_user_id, name, breed, species, age_label, personality, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            (
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "local-user",
                "초코",
                "말티푸",
                "dog",
                "3살",
                "처음엔 낯을 가리지만 저녁 산책을 좋아해요",
                json.dumps(["아침 식사는 천천히 먹는 편", "알러지 의심 간식은 피하기"], ensure_ascii=False),
            ),
            (
                "pet_01JCM7V8H9Q2K4N6R8T0D4E5F6",
                "local-user",
                "나비",
                "코리안숏헤어",
                "cat",
                "5살",
                "조용한 공간을 좋아하고 낯선 사람에게는 신중해요",
                json.dumps(["물그릇 위치가 바뀌면 잘 안 마심", "습식 간식을 좋아함"], ensure_ascii=False),
            ),
            (
                "pet_01JCM7V8H9Q2K4N6R8T0G7H8J9",
                "local-user",
                "땅콩",
                "포메라니안",
                "dog",
                "1살",
                "호기심이 많고 장난감 공을 특히 좋아해요",
                json.dumps(["흥분하면 짖음이 늘어남", "짧은 산책을 여러 번 하는 편"], ensure_ascii=False),
            ),
        ),
    )
    connection.executemany(
        """
        INSERT OR IGNORE INTO pet_records (id, pet_id, category, title, detail, status, recorded_at, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            (
                "sample-record-meal",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "meal",
                "아침 식사",
                "사료를 평소보다 조금 더 남겼어요.",
                "notice",
                _at(base_date, time(8, 10)),
                "manual",
            ),
            (
                "sample-record-walk",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "walk",
                "저녁 산책",
                "공원에서 25분 정도 걸었고 컨디션은 좋아 보였어요.",
                "normal",
                _at(base_date - timedelta(days=1), time(19, 20)),
                "manual",
            ),
            (
                "sample-record-stool",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "stool",
                "배변 상태",
                "변이 평소보다 조금 무른 편이라 내일까지 지켜보기로 했어요.",
                "notice",
                _at(base_date - timedelta(days=2), time(9, 0)),
                "manual",
            ),
            (
                "sample-record-medical",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "medical",
                "귀 상태 확인",
                "오른쪽 귀를 자주 긁어서 붉은기가 있는지 확인했어요.",
                "notice",
                _at(base_date - timedelta(days=3), time(21, 5)),
                "manual",
            ),
            (
                "sample-record-behavior",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "behavior",
                "낯선 소리 반응",
                "초인종 소리에 잠깐 짖었지만 금방 보호자 옆에서 진정했어요.",
                "normal",
                _at(base_date - timedelta(days=4), time(17, 40)),
                "manual",
            ),
            (
                "sample-record-nabi-meal",
                "pet_01JCM7V8H9Q2K4N6R8T0D4E5F6",
                "meal",
                "습식 급여",
                "습식 사료는 잘 먹었지만 물은 평소보다 적게 마셨어요.",
                "notice",
                _at(base_date, time(7, 50)),
                "manual",
            ),
            (
                "sample-record-nabi-behavior",
                "pet_01JCM7V8H9Q2K4N6R8T0D4E5F6",
                "behavior",
                "숨는 행동",
                "청소기 소리가 난 뒤 침대 밑에 30분 정도 숨어 있었어요.",
                "notice",
                _at(base_date - timedelta(days=1), time(14, 30)),
                "manual",
            ),
            (
                "sample-record-ddang-walk",
                "pet_01JCM7V8H9Q2K4N6R8T0G7H8J9",
                "walk",
                "짧은 산책",
                "아침에 12분 정도 산책했고 다른 강아지를 보고 흥분했어요.",
                "normal",
                _at(base_date, time(9, 15)),
                "manual",
            ),
            (
                "sample-record-ddang-medical",
                "pet_01JCM7V8H9Q2K4N6R8T0G7H8J9",
                "medical",
                "예방접종 후 관찰",
                "접종 부위를 만지면 살짝 예민해했지만 식욕은 괜찮았어요.",
                "notice",
                _at(base_date - timedelta(days=2), time(18, 0)),
                "manual",
            ),
        ),
    )
    connection.executemany(
        """
        INSERT OR IGNORE INTO care_schedules (id, pet_id, category, title, due_date, repeat_label, note, is_done)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            (
                "sample-schedule-checkup",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "checkup",
                "정기 검진",
                (base_date + timedelta(days=7)).isoformat(),
                "6개월마다",
                "최근 식사량과 배변 상태를 같이 상담하기",
                0,
            ),
            (
                "sample-schedule-grooming",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "grooming",
                "미용 예약",
                (base_date + timedelta(days=3)).isoformat(),
                "필요 시",
                "발톱과 귀 상태 확인",
                0,
            ),
            (
                "sample-schedule-nabi-checkup",
                "pet_01JCM7V8H9Q2K4N6R8T0D4E5F6",
                "checkup",
                "음수량 상담",
                (base_date + timedelta(days=5)).isoformat(),
                "필요 시",
                "최근 물 마시는 양이 줄었는지 상담하기",
                0,
            ),
            (
                "sample-schedule-ddang-vaccination",
                "pet_01JCM7V8H9Q2K4N6R8T0G7H8J9",
                "vaccination",
                "추가 접종 확인",
                (base_date + timedelta(days=10)).isoformat(),
                "수의사 안내",
                "예방접종 후 상태와 다음 접종 일정 확인",
                0,
            ),
        ),
    )
    connection.executemany(
        """
        INSERT OR IGNORE INTO notifications
            (id, pet_id, category, title, detail, action, action_href, due_label, tone, dedupe_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            (
                "sample-notification-behavior-change",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "행동 변화",
                "행동 변화 관찰",
                "최근 낯선 소리 반응 기록이 이어졌습니다. 같은 상황에서 반복되는지 오늘 기록을 확인해보세요.",
                "기록 확인",
                "/timeline",
                "오늘",
                "orange",
                "sample:behavior_change:sound-reaction",
                _at(base_date, time(9, 20)),
            ),
            (
                "sample-notification-missing-record",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "기록",
                "기록 누락 알림",
                "오늘 식사, 산책, 배변 중 빠진 항목이 있는지 확인하고 짧게 기록해보세요.",
                "기록 추가",
                "/record",
                "오늘",
                "orange",
                "sample:missing_record:daily-care",
                _at(base_date, time(9, 30)),
            ),
            (
                "sample-notification-risk",
                "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "주의",
                "주의 기록 확인",
                "귀를 긁는 행동과 피부 붉어짐 기록이 있습니다. 증상이 이어지는지 오늘 한 번 더 확인해보세요.",
                "기록 확인",
                "/timeline",
                "오늘",
                "red",
                "sample:risk:ear-scratch",
                _at(base_date, time(9, 10)),
            ),
        ),
    )
    connection.executemany(
        """
        INSERT OR IGNORE INTO community_posts
            (id, board, title, body, author_name, created_at, likes, distance, location_label, feeds, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            (
                "c1",
                "행동 고민",
                "말티즈 산책 줄면 쉽게 흥분하나요?",
                "산책 시간이 줄어든 뒤 현관 앞에서 기다리거나 소리에 예민하게 반응하는 날이 늘었어요. 짧게라도 산책을 나누는 게 도움이 될까요?",
                "코코 보호자",
                _at(base_date, time(9, 20)),
                26,
                None,
                None,
                json.dumps(["인기글", "최신글"], ensure_ascii=False),
                json.dumps(["산책", "흥분", "말티즈"], ensure_ascii=False),
            ),
            (
                "c2",
                "용품 나눔",
                "소형 반려동물 하네스 나눔합니다",
                "3~5kg 소형 반려동물용 하네스입니다. 세탁해두었고 동네에서 직접 전달 가능해요.",
                "산책메이트",
                _at(base_date - timedelta(days=1), time(18, 10)),
                15,
                None,
                "동네 직거래 가능",
                json.dumps(["인기글"], ensure_ascii=False),
                json.dumps(["나눔", "하네스"], ensure_ascii=False),
            ),
            (
                "c3",
                "자유게시판",
                "분리불안 어떻게 기록하고 계세요?",
                "외출 전후 행동을 기록하고 있는데 어떤 항목을 남기면 분석에 더 도움이 되는지 궁금해요.",
                "두부네",
                _at(base_date - timedelta(days=1), time(12, 40)),
                32,
                None,
                None,
                json.dumps(["인기글"], ensure_ascii=False),
                json.dumps(["분리불안", "기록팁"], ensure_ascii=False),
            ),
            (
                "c4",
                "후기",
                "AI 제안대로 산책을 나눠본 후기",
                "저녁 산책을 한 번 길게 하던 것을 아침 10분, 저녁 20분으로 나눴더니 밤에 낑낑거리는 시간이 줄었어요.",
                "밤산책",
                _at(base_date, time(7, 50)),
                18,
                None,
                None,
                json.dumps(["최신글"], ensure_ascii=False),
                json.dumps(["AI제안", "산책"], ensure_ascii=False),
            ),
            (
                "c5",
                "유기동물",
                "근처 임시 보호 정보 공유합니다",
                "동네 보호소에서 임시 보호처를 찾는 공지가 올라왔습니다. 관심 있는 분들은 보호소 공지를 먼저 확인해주세요.",
                "동네보호자",
                _at(base_date, time(6, 30)),
                21,
                None,
                "동네 보호소 공지",
                json.dumps(["최신글"], ensure_ascii=False),
                json.dumps(["임시보호", "동네"], ensure_ascii=False),
            ),
        ),
    )
    connection.executemany(
        """
        INSERT OR IGNORE INTO community_comments (id, post_id, author_name, body, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            (
                "comment-c1-1",
                "c1",
                "밤산책",
                "흥분이 심한 날은 10분씩 두 번 나눠 걷는 게 저희 집에는 더 맞았어요.",
                _at(base_date, time(9, 42)),
            ),
            (
                "comment-c1-2",
                "c1",
                "두부네",
                "산책 전후 행동 기록을 같이 남기면 패턴 찾기가 쉬웠습니다.",
                _at(base_date, time(10, 5)),
            ),
            (
                "comment-c4-1",
                "c4",
                "코코 보호자",
                "저도 오늘부터 짧은 아침 산책을 추가해보려고요.",
                _at(base_date, time(8, 10)),
            ),
        ),
    )
    connection.commit()


def _at(day: date, value: time) -> str:
    return datetime.combine(day, value).isoformat()


if __name__ == "__main__":
    seed_database()
