from __future__ import annotations


def message_content_to_text(value: object) -> str:
    content = getattr(value, "content", value)
    if isinstance(content, str):
        text = content.strip()
    elif isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        text = "\n".join(parts).strip()
    else:
        text = str(content).strip()

    if not text:
        raise RuntimeError("LLM response did not include answer text.")
    return text
