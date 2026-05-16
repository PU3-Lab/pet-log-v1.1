import { AxiosError } from "axios";
import { apiClient, PetLogApiError, type ApiFailure, type ApiResponse } from "./api-client";
import type { CommunityBoard, CommunityComment, CommunityFeed, CommunityPost } from "./types";

export const DEFAULT_COMMUNITY_BOARD: CommunityBoard = "유기동물";
export const DEFAULT_COMMUNITY_FEED: CommunityFeed = "최신글";
export const COMMUNITY_POPULAR_LIKE_THRESHOLD = 10;
export const COMMUNITY_POST_PAGE_SIZE = 10;

type CommunityLocationGuide = {
  placeholder: string;
  helpText: string;
};

const COMMUNITY_LOCATION_GUIDES: Record<CommunityBoard, CommunityLocationGuide> = {
  유기동물: {
    placeholder: "위치 라벨 (예: 동네 보호소 공지, 마포구 보호소 근처)",
    helpText: "보호소명, 발견 장소, 임시보호 가능 동네처럼 찾는 사람이 바로 이해할 수 있는 위치를 적어주세요.",
  },
  "용품 나눔": {
    placeholder: "위치 라벨 (예: 동네 직거래 가능, 역삼역 근처)",
    helpText: "직거래 가능 동네나 역 근처처럼 약속 장소를 잡기 쉬운 위치를 적어주세요.",
  },
  자유게시판: {
    placeholder: "위치 라벨 (선택)",
    helpText: "동네 맥락이 필요한 글이라면 장소명이나 동 이름만 가볍게 남겨주세요.",
  },
  "행동 고민": {
    placeholder: "위치 라벨 (예: 집 근처 산책로)",
    helpText: "산책로, 집 주변, 병원 근처처럼 행동이 나타난 환경을 적으면 답변에 도움이 돼요.",
  },
  후기: {
    placeholder: "위치 라벨 (예: 성산동 미용실)",
    helpText: "방문한 동네나 장소명을 적으면 다른 보호자가 후기를 참고하기 쉬워요.",
  },
};

type CommunityPostQuery = {
  feed?: CommunityFeed | null;
  board?: CommunityBoard | null;
  limit?: number;
  offset?: number;
};

type CreateCommunityCommentInput = {
  postId: string;
  body: string;
  createdAt?: string;
};

type CreateCommunityPostInput = {
  board: CommunityBoard;
  title: string;
  body: string;
  authorName?: string;
  tags?: string[];
  locationLabel?: string;
  createdAt?: string;
};

export type CommunityPostDetail = CommunityPost & {
  commentItems: CommunityComment[];
  meta: string;
};

type CommunityBoardsResponse = {
  boards: CommunityBoard[];
  feeds: CommunityFeed[];
};

type CommunityPostsResponse = {
  posts: CommunityPost[];
  hasMore?: boolean;
  totalCount?: number;
};

type CommunityPostDetailResponse = {
  post: CommunityPostDetail;
};

type CommunityPostResponse = {
  post: CommunityPost;
};

type CommunityCommentResponse = {
  comment: CommunityComment;
  post: CommunityPost;
};

async function requestCommunityData<T>(request: Promise<{ data: ApiResponse<T> }>) {
  try {
    const response = await request;
    if (!response.data.ok) {
      throw new PetLogApiError(response.data.error.code, response.data.error.message);
    }
    return response.data.data;
  } catch (error) {
    if (error instanceof PetLogApiError) {
      throw error;
    }
    if (error instanceof AxiosError) {
      const data = error.response?.data as ApiFailure | undefined;
      if (data && data.ok === false) {
        throw new PetLogApiError(data.error.code, data.error.message);
      }
    }
    throw new PetLogApiError("COMMUNITY_API_FAILED", "커뮤니티 요청을 처리하지 못했습니다.");
  }
}

export function getCommunityPosts(posts: CommunityPost[], query: CommunityPostQuery) {
  return posts.filter((post) => {
    const matchesFeed = query.feed ? matchesCommunityFeed(post, query.feed) : true;
    const matchesBoard = query.board ? post.board === query.board : true;
    return matchesFeed && matchesBoard;
  });
}

function matchesCommunityFeed(post: CommunityPost, feed: CommunityFeed) {
  if (feed === "인기글") {
    return post.likes >= COMMUNITY_POPULAR_LIKE_THRESHOLD;
  }
  if (feed === "최신글") {
    return true;
  }
  return post.feeds.includes(feed);
}

export function getCommunityBoardCounts(posts: CommunityPost[]) {
  return posts.reduce<Partial<Record<CommunityBoard, number>>>((counts, post) => {
    counts[post.board] = (counts[post.board] ?? 0) + 1;
    return counts;
  }, {});
}

export function getCommunitySummaryPostCount(posts: CommunityPost[], activeBoard: CommunityBoard | null) {
  if (!activeBoard) {
    return posts.length;
  }
  return posts.filter((post) => post.board === activeBoard).length;
}

export function getCommunityDefaultPosts(posts: CommunityPost[]) {
  return getCommunityPosts(posts, { feed: DEFAULT_COMMUNITY_FEED, board: DEFAULT_COMMUNITY_BOARD });
}

export function resolveCommunityFetchQuery(query: CommunityPostQuery): CommunityPostQuery {
  return {
    ...(query.feed ? { feed: query.feed } : {}),
    ...(query.board ? { board: query.board } : {}),
    ...(typeof query.limit === "number" ? { limit: query.limit } : {}),
    ...(typeof query.offset === "number" ? { offset: query.offset } : {}),
  };
}

export function resolveCommunitySelectedPostId(posts: CommunityPost[], currentPostId: string) {
  return posts.some((post) => post.id === currentPostId) ? currentPostId : posts[0]?.id ?? "";
}

export function resolveCommunityDraftBoard(activeBoard: CommunityBoard | null) {
  return activeBoard ?? "자유게시판";
}

export function getCommunityLocationGuide(board: CommunityBoard) {
  return COMMUNITY_LOCATION_GUIDES[board];
}

export function shouldShowCommunityLocationBox(post: Pick<CommunityPost, "board" | "locationLabel">) {
  return Boolean(post.locationLabel?.trim()) && (post.board === "유기동물" || post.board === "용품 나눔");
}

export function formatCommunityCreatedAt(createdAt: string, now = new Date()) {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return createdAt;
  }

  const diffMs = Math.max(0, now.getTime() - createdDate.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;

  if (diffMs < minuteMs) {
    return "방금";
  }
  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}분 전`;
  }

  const timeLabel = `${String(createdDate.getHours()).padStart(2, "0")}:${String(createdDate.getMinutes()).padStart(2, "0")}`;
  if (isSameLocalDate(createdDate, now)) {
    return `오늘 ${timeLabel}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDate(createdDate, yesterday)) {
    return `어제 ${timeLabel}`;
  }

  return `${createdDate.getMonth() + 1}/${createdDate.getDate()} ${timeLabel}`;
}

export function parseCommunityTags(value: string) {
  const tags: string[] = [];
  for (const segment of value.split(/[\s,]+/)) {
    const tag = segment.trim().replace(/^#+/, "").trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

function isSameLocalDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function getCommunityPostDetail(post: CommunityPost, comments: CommunityComment[]) {
  const commentItems = comments.filter((comment) => comment.postId === post.id);
  const locationLabel = post.locationLabel ? ` · 위치 ${post.locationLabel}` : "";

  return {
    ...post,
    commentItems,
    meta: `${post.board} · 댓글 ${post.comments} · 공감 ${post.likes}${locationLabel}`,
  };
}

export function fetchCommunityBoards() {
  return requestCommunityData<CommunityBoardsResponse>(apiClient.get("/community/boards"));
}

export function fetchCommunityPosts(query: CommunityPostQuery = {}) {
  const params = {
    ...(query.feed ? { feed: query.feed } : {}),
    ...(query.board ? { board: query.board } : {}),
    ...(typeof query.limit === "number" ? { limit: query.limit } : {}),
    ...(typeof query.offset === "number" ? { offset: query.offset } : {}),
  };
  return requestCommunityData<CommunityPostsResponse>(apiClient.get("/community/posts", { params }));
}

export function fetchCommunityPostDetail(postId: string) {
  return requestCommunityData<CommunityPostDetailResponse>(apiClient.get(`/community/posts/${encodeURIComponent(postId)}`));
}

export function submitCommunityPost(input: CreateCommunityPostInput) {
  const authorName = input.authorName?.trim();
  const tags = input.tags?.filter((tag) => tag.trim());
  const locationLabel = input.locationLabel?.trim();
  return requestCommunityData<CommunityPostResponse>(
    apiClient.post("/community/posts", {
      board: input.board,
      title: input.title,
      body: input.body,
      ...(authorName ? { authorName } : {}),
      ...(tags?.length ? { tags } : {}),
      ...(locationLabel ? { locationLabel } : {}),
    }),
  );
}

export function submitCommunityComment({ postId, body }: CreateCommunityCommentInput) {
  return requestCommunityData<CommunityCommentResponse>(
    apiClient.post(`/community/posts/${encodeURIComponent(postId)}/comments`, { body }),
  );
}

export function submitCommunityReaction(postId: string) {
  return requestCommunityData<CommunityPostResponse>(
    apiClient.post(`/community/posts/${encodeURIComponent(postId)}/reactions`),
  );
}

export function createCommunityComment({ postId, body, createdAt = "방금" }: CreateCommunityCommentInput): CommunityComment {
  return {
    id: `comment-${postId}-${Date.now()}`,
    postId,
    authorName: "나",
    body: body.trim(),
    createdAt,
  };
}

export function createCommunityPost({
  board,
  title,
  body,
  authorName,
  tags,
  locationLabel,
  createdAt = "방금",
}: CreateCommunityPostInput): CommunityPost {
  const id = `community-${Date.now()}`;

  return {
    id,
    board,
    title: title.trim(),
    body: body.trim(),
    authorName: authorName?.trim() || "나",
    createdAt,
    comments: 0,
    likes: 0,
    feeds: ["최신글"],
    ...(locationLabel?.trim() ? { locationLabel: locationLabel.trim() } : {}),
    tags: tags?.length ? tags : ["새 글"],
  };
}
