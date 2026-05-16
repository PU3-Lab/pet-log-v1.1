type ChatTypingIndicatorProps = {
  label?: string;
};

export function ChatTypingIndicator({ label = "답변 대기 중" }: ChatTypingIndicatorProps) {
  return (
    <div aria-label={label} className="mr-auto max-w-[92%]" role="status">
      <div className="pet-log-typing-bubble" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <span className="pet-log-typing-dot" key={index} style={{ animationDelay: `${index * 140}ms` }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
