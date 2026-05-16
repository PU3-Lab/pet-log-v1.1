import type {
  CareSchedule,
  CommunityBoard,
  CommunityComment,
  CommunityPost,
  PetProfile,
  RecordEntry,
} from "./types";

export const petProfile: PetProfile = {
  name: "코코",
  breed: "말티즈",
  age: "3살",
  sex: "중성화 남아",
  weight: "4.2kg",
  birthday: "2021.02.10",
  personality: "활발하고 사람을 좋아해요",
  notes: ["분리불안 있음", "닭고기 알러지 의심", "실내 배변 선호"],
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export const records: RecordEntry[] = [
  {
    id: "r1",
    date: daysAgo(0),
    time: "09:00",
    category: "meal",
    title: "아침 50g, 간식 조금",
    detail: "사료를 평소보다 천천히 먹었고 10g 정도 남겼어요.",
    status: "notice",
  },
  {
    id: "r2",
    date: daysAgo(0),
    time: "10:30",
    category: "walk",
    title: "산책 20분",
    detail: "평소보다 자주 멈췄지만 컨디션은 안정적이에요.",
    status: "notice",
  },
  {
    id: "r3",
    date: daysAgo(0),
    time: "21:30",
    category: "stool",
    title: "정상, 1회",
    detail: "색과 형태가 평소 범위 안에 있어요.",
    status: "normal",
  },
  {
    id: "r4",
    date: daysAgo(1),
    time: "14:20",
    category: "medical",
    title: "심장사상충 약 복용",
    detail: "월간 복용 기록이 정상적으로 추가됐어요.",
    status: "normal",
  },
  {
    id: "r5",
    date: daysAgo(1),
    time: "20:10",
    category: "behavior",
    title: "현관 앞에서 기다림",
    detail: "보호자가 외출 준비를 시작하자 낑낑거림이 8분 정도 지속됐어요.",
    status: "alert",
  },
];

export const schedules: CareSchedule[] = [
  {
    id: "schedule-vaccine",
    category: "vaccination",
    title: "종합백신 접종",
    dueDate: "2026-05-02",
    repeatLabel: "매년",
    note: "최근 컨디션 기록을 함께 확인하기",
    isDone: false,
  },
  {
    id: "schedule-heartworm",
    category: "medication",
    title: "심장사상충 약",
    dueDate: "2026-05-15",
    repeatLabel: "매월",
    note: "저녁 식사 후 복용",
    isDone: false,
  },
  {
    id: "schedule-grooming",
    category: "grooming",
    title: "눈가 미용",
    dueDate: "2026-05-25",
    repeatLabel: "필요할 때",
    note: "눈물 자국 상태 확인",
    isDone: false,
  },
];

export const communityBoards: CommunityBoard[] = ["유기동물", "용품 나눔", "자유게시판", "행동 고민", "후기"];

export const communityPosts: CommunityPost[] = [
  {
    id: "c1",
    board: "행동 고민",
    title: "말티즈 산책 줄면 쉽게 흥분하나요?",
    body: "산책 시간이 줄어든 뒤 현관 앞에서 기다리거나 소리에 예민하게 반응하는 날이 늘었어요. 짧게라도 산책을 나누는 게 도움이 될까요?",
    authorName: "코코 보호자",
    createdAt: "오늘 09:20",
    comments: 8,
    likes: 26,
    feeds: ["인기글", "최신글"],
    tags: ["산책", "흥분", "말티즈"],
  },
  {
    id: "c2",
    board: "용품 나눔",
    title: "소형견 하네스 나눔합니다",
    body: "3~5kg 소형견용 하네스입니다. 세탁해두었고 동네에서 직접 전달 가능해요.",
    authorName: "산책메이트",
    createdAt: "어제 18:10",
    comments: 3,
    likes: 15,
    locationLabel: "동네 직거래 가능",
    feeds: ["인기글"],
    tags: ["나눔", "하네스"],
  },
  {
    id: "c3",
    board: "자유게시판",
    title: "분리불안 어떻게 기록하고 계세요?",
    body: "외출 전후 행동을 기록하고 있는데 어떤 항목을 남기면 분석에 더 도움이 되는지 궁금해요.",
    authorName: "두부네",
    createdAt: "어제 12:40",
    comments: 12,
    likes: 32,
    feeds: ["인기글"],
    tags: ["분리불안", "기록팁"],
  },
  {
    id: "c4",
    board: "후기",
    title: "AI 제안대로 산책을 나눠본 후기",
    body: "저녁 산책을 한 번 길게 하던 것을 아침 10분, 저녁 20분으로 나눴더니 밤에 낑낑거리는 시간이 줄었어요.",
    authorName: "밤산책",
    createdAt: "오늘 07:50",
    comments: 5,
    likes: 18,
    feeds: ["최신글"],
    tags: ["AI제안", "산책"],
  },
  {
    id: "c5",
    board: "유기동물",
    title: "근처 임시 보호 정보 공유합니다",
    body: "동네 보호소에서 임시 보호처를 찾는 공지가 올라왔습니다. 관심 있는 분들은 보호소 공지를 먼저 확인해주세요.",
    authorName: "동네보호자",
    createdAt: "오늘 06:30",
    comments: 4,
    likes: 21,
    locationLabel: "동네 보호소 공지",
    feeds: ["최신글"],
    tags: ["임시보호", "동네"],
  },
];

export const communityComments: CommunityComment[] = [
  {
    id: "comment-c1-1",
    postId: "c1",
    authorName: "밤산책",
    body: "흥분이 심한 날은 10분씩 두 번 나눠 걷는 게 저희 집에는 더 맞았어요.",
    createdAt: "오늘 09:42",
  },
  {
    id: "comment-c1-2",
    postId: "c1",
    authorName: "두부네",
    body: "산책 전후 행동 기록을 같이 남기면 패턴 찾기가 쉬웠습니다.",
    createdAt: "오늘 10:05",
  },
  {
    id: "comment-c4-1",
    postId: "c4",
    authorName: "코코 보호자",
    body: "저도 오늘부터 짧은 아침 산책을 추가해보려고요.",
    createdAt: "오늘 08:10",
  },
];
