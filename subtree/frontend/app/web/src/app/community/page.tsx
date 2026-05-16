"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { Card, Pill, SectionHeader } from "@/components/ui";
import {
  DEFAULT_COMMUNITY_BOARD,
  DEFAULT_COMMUNITY_FEED,
  COMMUNITY_POST_PAGE_SIZE,
  fetchCommunityBoards,
  fetchCommunityPostDetail,
  fetchCommunityPosts,
  formatCommunityCreatedAt,
  getCommunityBoardCounts,
  getCommunityDefaultPosts,
  getCommunityLocationGuide,
  getCommunityPostDetail,
  getCommunityPosts,
  getCommunitySummaryPostCount,
  parseCommunityTags,
  resolveCommunityDraftBoard,
  resolveCommunityFetchQuery,
  resolveCommunitySelectedPostId,
  shouldShowCommunityLocationBox,
  submitCommunityComment,
  submitCommunityPost,
  submitCommunityReaction,
  type CommunityPostDetail,
} from "@/lib/community";
import { communityBoards, communityComments, communityPosts } from "@/lib/mock-data";
import type { CommunityBoard, CommunityFeed, CommunityPost } from "@/lib/types";

const feedFilters: CommunityFeed[] = ["인기글", "최신글"];

const boardStyles: Record<CommunityBoard, { marker: string; text: string; bg: string }> = {
  유기동물: { marker: "bg-[#be4c3c]", text: "text-[#be4c3c]", bg: "bg-[#fff7f5]" },
  "용품 나눔": { marker: "bg-[#bb721e]", text: "text-[#a4651a]", bg: "bg-[#fffaf0]" },
  자유게시판: { marker: "bg-[#16804b]", text: "text-[#16804b]", bg: "bg-[#edf8ed]" },
  "행동 고민": { marker: "bg-[#7256b8]", text: "text-[#7256b8]", bg: "bg-[#f5f1ff]" },
  후기: { marker: "bg-[#356aa8]", text: "text-[#356aa8]", bg: "bg-[#f6f9ff]" },
};

const boardIcons: Record<CommunityBoard, "heart" | "shopping" | "community" | "behavior" | "check"> = {
  유기동물: "heart",
  "용품 나눔": "shopping",
  자유게시판: "community",
  "행동 고민": "behavior",
  후기: "check",
};

const feedIcons: Record<CommunityFeed, "sparkle" | "timeline"> = {
  인기글: "sparkle",
  최신글: "timeline",
};

export default function CommunityPage() {
  const initialPosts = getCommunityDefaultPosts(communityPosts);
  const [boards, setBoards] = useState<CommunityBoard[]>(communityBoards);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>(communityPosts);
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [activeBoard, setActiveBoard] = useState<CommunityBoard | null>(DEFAULT_COMMUNITY_BOARD);
  const [activeFeed, setActiveFeed] = useState<CommunityFeed | null>(DEFAULT_COMMUNITY_FEED);
  const [selectedPostId, setSelectedPostId] = useState(initialPosts[0]?.id ?? "");
  const [selectedDetail, setSelectedDetail] = useState<CommunityPostDetail | null>(() =>
    initialPosts[0] ? getCommunityPostDetail(initialPosts[0], communityComments) : null,
  );
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draftBoard, setDraftBoard] = useState<CommunityBoard>("자유게시판");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftAuthorName, setDraftAuthorName] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftLocationLabel, setDraftLocationLabel] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReactingPost, setIsReactingPost] = useState(false);
  const [communityError, setCommunityError] = useState("");

  const visiblePosts = useMemo(() => getCommunityPosts(posts, { feed: activeFeed, board: activeBoard }), [activeBoard, activeFeed, posts]);
  const boardCounts = useMemo(() => getCommunityBoardCounts(allPosts), [allPosts]);
  const summaryPostCount = useMemo(() => getCommunitySummaryPostCount(allPosts, activeBoard), [activeBoard, allPosts]);
  const draftLocationGuide = getCommunityLocationGuide(draftBoard);

  useEffect(() => {
    let ignore = false;

    fetchCommunityBoards()
      .then(({ boards }) => {
        if (!ignore) {
          setBoards(boards);
        }
      })
      .catch(() => {
        if (!ignore) {
          setCommunityError("게시판 목록을 불러오지 못했습니다.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchCommunityPosts()
      .then(({ posts }) => {
        if (!ignore) {
          setAllPosts(posts);
        }
      })
      .catch(() => {
        if (!ignore) {
          setCommunityError("커뮤니티 글 수를 불러오지 못했습니다.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    setIsLoadingPosts(true);
    fetchCommunityPosts(resolveCommunityFetchQuery({ feed: activeFeed, board: activeBoard, limit: COMMUNITY_POST_PAGE_SIZE, offset: 0 }))
      .then(({ posts, hasMore }) => {
        if (ignore) {
          return;
        }
        setPosts(posts);
        setHasMorePosts(Boolean(hasMore));
        setSelectedPostId((current) => resolveCommunitySelectedPostId(posts, current));
        setCommunityError("");
      })
      .catch(() => {
        if (!ignore) {
          setCommunityError("커뮤니티 글을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingPosts(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeBoard, activeFeed]);

  useEffect(() => {
    let ignore = false;

    if (!selectedPostId || !posts.some((post) => post.id === selectedPostId)) {
      setSelectedDetail(null);
      return () => {
        ignore = true;
      };
    }

    fetchCommunityPostDetail(selectedPostId)
      .then(({ post }) => {
        if (!ignore) {
          setSelectedDetail(post);
        }
      })
      .catch(() => {
        if (!ignore) {
          const fallbackPost = posts.find((post) => post.id === selectedPostId);
          setSelectedDetail(fallbackPost ? getCommunityPostDetail(fallbackPost, []) : null);
          setCommunityError("글 상세를 불러오지 못했습니다.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [posts, selectedPostId]);

  async function addComment() {
    if (!selectedDetail || !commentDraft.trim() || isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { comment, post } = await submitCommunityComment({ postId: selectedDetail.id, body: commentDraft });
      setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
      setAllPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
      setSelectedDetail((current) =>
        current && current.id === post.id ? getCommunityPostDetail(post, [...current.commentItems, comment]) : current,
      );
      setCommentDraft("");
      setCommunityError("");
    } catch {
      setCommunityError("댓글을 등록하지 못했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function submitPost() {
    if (!draftTitle.trim() || !draftBody.trim() || isSubmittingPost) {
      return;
    }

    setIsSubmittingPost(true);
    try {
      const { post } = await submitCommunityPost({
        board: draftBoard,
        title: draftTitle,
        body: draftBody,
        authorName: draftAuthorName,
        tags: parseCommunityTags(draftTags),
        locationLabel: draftLocationLabel,
      });
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setAllPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setSelectedPostId(post.id);
      setSelectedDetail(getCommunityPostDetail(post, []));
      setActiveBoard(draftBoard);
      setActiveFeed("최신글");
      setDraftTitle("");
      setDraftBody("");
      setDraftAuthorName("");
      setDraftTags("");
      setDraftLocationLabel("");
      setIsComposerOpen(false);
      setCommunityError("");
    } catch {
      setCommunityError("글을 등록하지 못했습니다.");
    } finally {
      setIsSubmittingPost(false);
    }
  }

  async function reactToPost() {
    if (!selectedDetail || isReactingPost) {
      return;
    }

    setIsReactingPost(true);
    try {
      const { post } = await submitCommunityReaction(selectedDetail.id);
      setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
      setAllPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
      setSelectedDetail((current) => (current && current.id === post.id ? getCommunityPostDetail(post, current.commentItems) : current));
      setCommunityError("");
    } catch {
      setCommunityError("공감을 반영하지 못했습니다.");
    } finally {
      setIsReactingPost(false);
    }
  }

  function toggleSavedPost(postId: string) {
    setSavedPostIds((current) => (current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]));
  }

  async function loadMorePosts() {
    if (isLoadingMorePosts || !hasMorePosts) {
      return;
    }

    setIsLoadingMorePosts(true);
    try {
      const { posts: nextPosts, hasMore } = await fetchCommunityPosts(
        resolveCommunityFetchQuery({
          feed: activeFeed,
          board: activeBoard,
          limit: COMMUNITY_POST_PAGE_SIZE,
          offset: posts.length,
        }),
      );
      setPosts((current) => {
        const existingIds = new Set(current.map((post) => post.id));
        return [...current, ...nextPosts.filter((post) => !existingIds.has(post.id))];
      });
      setHasMorePosts(Boolean(hasMore));
      setCommunityError("");
    } catch {
      setCommunityError("추가 글을 불러오지 못했습니다.");
    } finally {
      setIsLoadingMorePosts(false);
    }
  }

  function toggleComposer() {
    setIsComposerOpen((current) => {
      const next = !current;
      if (next) {
        setDraftBoard(resolveCommunityDraftBoard(activeBoard));
      }
      return next;
    });
  }

  return (
    <AppShell subtitle="커뮤니티" title="커뮤니티">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#f6f9ff]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#356aa8]">
              <PetIcon className="h-4 w-4" name="community" />
              동네 보호자 피드
            </p>
            <h2 className="mt-1 text-lg font-black text-[#1f2922]">
              {activeBoard ? `${activeBoard} 중심으로 보기` : "필요한 게시판을 빠르게 찾기"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#667262]">
              {summaryPostCount}개 글 · 저장 {savedPostIds.length}개 · {activeFeed ?? "전체글"}
            </p>
          </div>
          <div className="mt-4 flex justify-end border-t border-[#e0e6da] pt-3">
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#16804b] px-3 text-sm font-black text-white"
              onClick={toggleComposer}
              type="button"
            >
              <PetIcon className="h-4 w-4" name={isComposerOpen ? "close" : "plus"} />
              {isComposerOpen ? "닫기" : "글쓰기"}
            </button>
          </div>
        </Card>

        {communityError ? (
          <p className="rounded-xl bg-[#fff7f5] px-3 py-2 text-sm font-bold text-[#be4c3c]" role="status">
            {communityError}
          </p>
        ) : null}

        {isComposerOpen ? (
          <Card>
            <div className="grid grid-cols-2 gap-2">
              {boards.map((board) => (
                <Pill active={draftBoard === board} className="w-full px-2 text-xs" key={board} onClick={() => setDraftBoard(board)}>
                  <span className="inline-flex items-center gap-1.5">
                    <PetIcon className="h-3.5 w-3.5" name={boardIcons[board]} />
                    {board}
                  </span>
                </Pill>
              ))}
            </div>
            <input
              className="mt-3 h-11 w-full rounded-xl border border-[#dce7d7] bg-[#fbfdf8] px-3 text-sm font-bold text-[#1f2922] outline-none focus:border-[#16804b]"
              onChange={(event) => setDraftAuthorName(event.target.value)}
              placeholder="닉네임 (비우면 랜덤)"
              value={draftAuthorName}
            />
            <input
              className="mt-3 h-11 w-full rounded-xl border border-[#dce7d7] bg-[#fbfdf8] px-3 text-sm font-bold text-[#1f2922] outline-none focus:border-[#16804b]"
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="제목"
              value={draftTitle}
            />
            <textarea
              className="mt-3 min-h-28 w-full resize-none rounded-xl border border-[#dce7d7] bg-[#fbfdf8] p-3 text-sm font-semibold leading-6 text-[#1f2922] outline-none focus:border-[#16804b]"
              onChange={(event) => setDraftBody(event.target.value)}
              placeholder="내용을 입력하세요"
              value={draftBody}
            />
            <input
              className="mt-3 h-11 w-full rounded-xl border border-[#dce7d7] bg-[#fbfdf8] px-3 text-sm font-bold text-[#1f2922] outline-none focus:border-[#16804b]"
              onChange={(event) => setDraftTags(event.target.value)}
              placeholder="#입양 #임시보호"
              value={draftTags}
            />
            <input
              className="mt-3 h-11 w-full rounded-xl border border-[#dce7d7] bg-[#fbfdf8] px-3 text-sm font-bold text-[#1f2922] outline-none focus:border-[#16804b]"
              onChange={(event) => setDraftLocationLabel(event.target.value)}
              placeholder={draftLocationGuide.placeholder}
              value={draftLocationLabel}
            />
            <p className="mt-2 rounded-xl bg-[#f6f9ff] px-3 py-2 text-xs font-semibold leading-5 text-[#667262]">
              {draftLocationGuide.helpText}
            </p>
            <button
              className="mt-3 h-11 w-full rounded-xl bg-[#16804b] text-sm font-black text-white disabled:bg-[#cfd8ca]"
              disabled={!draftTitle.trim() || !draftBody.trim() || isSubmittingPost}
              onClick={submitPost}
              type="button"
            >
              <PetIcon className="mr-1 inline h-4 w-4" name="send" />
              {isSubmittingPost ? "게시 중" : "게시하기"}
            </button>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {boards.map((item) => {
            const active = activeBoard === item;
            const postCount = boardCounts[item] ?? 0;
            const style = boardStyles[item];
            return (
              <button
                aria-pressed={active}
                className={`min-h-20 rounded-2xl border p-3 text-left shadow-[0_8px_22px_rgba(49,65,44,0.06)] transition ${
                  active ? "border-[#16804b] bg-[#16804b] text-white" : `border-[#e0e6da] ${style.bg} text-[#4a5547]`
                }`}
                key={item}
                onClick={() => setActiveBoard(active ? null : item)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-xl ${active ? "bg-white/15 text-white" : `${style.bg} ${style.text}`}`}>
                    <PetIcon className="h-4 w-4" name={boardIcons[item]} />
                  </span>
                  <span className={`text-[11px] font-black ${active ? "text-white/85" : style.text}`}>{postCount}개</span>
                </div>
                <p className={`mt-3 break-keep text-sm font-black ${active ? "text-white" : "text-[#1f2922]"}`}>{item}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {feedFilters.map((filter) => (
            <Pill active={activeFeed === filter} className="w-full px-2 text-xs" key={filter} onClick={() => setActiveFeed(filter)}>
              <span className="inline-flex items-center gap-1.5">
                <PetIcon className="h-3.5 w-3.5" name={feedIcons[filter]} />
                {filter}
              </span>
            </Pill>
          ))}
        </div>

        <section>
          <SectionHeader
            action={
              activeFeed ? (
                <button
                  className="text-xs font-bold text-[#16804b]"
                  onClick={() => {
                    setActiveFeed(null);
                  }}
                  type="button"
                >
                  전체 보기
                </button>
              ) : null
            }
            title={activeBoard ? `${activeBoard} ${activeFeed ?? "전체글"}` : activeFeed ?? "전체글"}
          />
          <div className="space-y-3">
            {isLoadingPosts ? <p className="px-1 text-sm font-bold text-[#667262]">커뮤니티 글을 불러오는 중입니다.</p> : null}
            {visiblePosts.map((post) => (
              <button
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-[0_10px_28px_rgba(49,65,44,0.1)] transition ${
                  selectedPostId === post.id ? "border-[#16804b]" : "border-[#cdd8c6]"
                }`}
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16804b]">
                      <PetIcon className="h-3.5 w-3.5" name={boardIcons[post.board]} />
                      {post.board}
                    </p>
                    <h2 className="mt-2 text-sm font-black leading-5 text-[#1f2922]">{post.title}</h2>
                  </div>
                  {savedPostIds.includes(post.id) ? (
                    <span className="rounded-full bg-[#fff2dd] px-2 py-1 text-[11px] font-black text-[#a4651a]">저장됨</span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#667262]">{post.body}</p>
                <p className="mt-2 text-xs font-semibold text-[#7c8777]">
                  {post.authorName} · 댓글 {post.comments} · 공감 {post.likes}
                  {post.locationLabel ? ` · 위치 ${post.locationLabel}` : ""}
                </p>
              </button>
            ))}
            {visiblePosts.length === 0 ? (
              <Card className="p-5 text-center">
                <h2 className="text-sm font-bold text-[#1f2922]">표시할 글이 없습니다.</h2>
                <p className="mt-2 text-sm leading-6 text-[#667262]">게시판이나 글 필터를 바꿔보세요.</p>
              </Card>
            ) : null}
            {hasMorePosts ? (
              <button
                className="h-11 w-full rounded-xl border border-[#cdd8c6] bg-white text-sm font-black text-[#16804b] disabled:text-[#9aa393]"
                disabled={isLoadingMorePosts}
                onClick={loadMorePosts}
                type="button"
              >
                {isLoadingMorePosts ? "불러오는 중" : "더 보기"}
              </button>
            ) : null}
          </div>
        </section>

        {selectedDetail ? (
          <section>
            <SectionHeader title="상세" />
            <Card>
              <p className="text-xs font-bold text-[#16804b]">{selectedDetail.meta}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-xs font-semibold text-[#7c8777]">
                    {selectedDetail.authorName} · {formatCommunityCreatedAt(selectedDetail.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    aria-label={`공감 ${selectedDetail.likes}`}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-[#fff2dd] px-2 text-[11px] font-black text-[#a4651a] disabled:opacity-60"
                    disabled={isReactingPost}
                    onClick={reactToPost}
                    type="button"
                  >
                    <PetIcon className="h-3 w-3" name="heart" />
                    <span>{selectedDetail.likes}</span>
                  </button>
                  <button
                    aria-label={savedPostIds.includes(selectedDetail.id) ? "저장됨" : "저장"}
                    aria-pressed={savedPostIds.includes(selectedDetail.id)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black ${
                      savedPostIds.includes(selectedDetail.id) ? "bg-[#fff2dd] text-[#a4651a]" : "bg-[#edf8ed] text-[#16804b]"
                    }`}
                    onClick={() => toggleSavedPost(selectedDetail.id)}
                    type="button"
                  >
                    <PetIcon className="h-3 w-3" name={savedPostIds.includes(selectedDetail.id) ? "check" : "bookmark"} />
                  </button>
                </div>
              </div>
              <div className="mt-3 border-b border-[#e0e6da] pb-3">
                <h2 className="text-lg font-black leading-6 text-[#1f2922]">{selectedDetail.title}</h2>
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[#4d594b]">{selectedDetail.body}</p>
              {shouldShowCommunityLocationBox(selectedDetail) ? (
                <div className="mt-4 rounded-xl border border-[#dce7d7] bg-[#fbfdf8] p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-black text-[#16804b]">
                    <PetIcon className="h-3.5 w-3.5" name="hospital" />
                    참고 위치
                  </p>
                  <p className="mt-2 text-sm font-black text-[#1f2922]">{selectedDetail.locationLabel}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#667262]">정확한 주소가 아닌 작성자 입력 위치입니다.</p>
                </div>
              ) : null}
              {selectedDetail.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDetail.tags.map((tag) => (
                    <span className="rounded-full bg-[#f0f3ed] px-3 py-1 text-xs font-bold text-[#667262]" key={tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
          </section>
        ) : null}

        {selectedDetail ? (
          <section>
            <SectionHeader title={`댓글 ${selectedDetail.commentItems.length}`} />
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#cdd8c6] bg-white p-3 shadow-[0_10px_28px_rgba(49,65,44,0.1)]">
                <textarea
                  className="min-h-20 w-full resize-none rounded-xl border border-[#dce7d7] bg-[#fbfdf8] p-3 text-sm font-semibold leading-6 text-[#1f2922] outline-none focus:border-[#16804b]"
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="댓글을 입력하세요"
                  value={commentDraft}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#16804b] px-4 text-sm font-black text-white disabled:bg-[#cfd8ca]"
                    disabled={!commentDraft.trim() || isSubmittingComment}
                    onClick={addComment}
                    type="button"
                  >
                    <PetIcon className="h-4 w-4" name="send" />
                    {isSubmittingComment ? "등록 중" : "댓글 등록"}
                  </button>
                </div>
              </div>

              {selectedDetail.commentItems.map((comment) => (
                <Card className="p-3" key={comment.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#1f2922]">
                      <PetIcon className="h-4 w-4 text-[#16804b]" name="profile" />
                      {comment.authorName}
                    </p>
                    <p className="text-xs font-semibold text-[#9aa393]">{formatCommunityCreatedAt(comment.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#5c6758]">{comment.body}</p>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </AppShell>
  );
}
