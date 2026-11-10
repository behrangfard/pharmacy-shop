import { Fragment } from "react";

/**
 * رندر متن ساده با نشانه‌گذاری سبک؛ همان قالب مقاله‌های فروشگاه.
 *
 * نشانه‌های پشتیبانی‌شده: «## سرتیتر»، «### زیرتیتر»، «- لیست»، «> نقل‌قول»
 * و «**پررنگ**». متن بدون نشانه به‌صورت پاراگراف (با حفظ خطوط) نمایش داده
 * می‌شود.
 */
function renderInline(content: string, keyPrefix: string) {
  return content.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${index}`} className="font-black text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>;
  });
}

function renderContent(content: string) {
  const blocks = content.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  return blocks.map((block, index) => {
    const trimmed = block.trim();

    if (trimmed === "") return null;

    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={index}
          className="mt-7 text-base font-black leading-8 text-ink"
        >
          {renderInline(trimmed.slice(4), `h3-${index}`)}
        </h3>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="mt-8 border-r-4 border-brand-400 pr-3 text-lg font-black leading-9 text-ink"
        >
          {renderInline(trimmed.slice(3), `h2-${index}`)}
        </h2>
      );
    }

    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="my-5 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm leading-8 text-ink-soft"
        >
          {renderInline(trimmed.slice(2), `quote-${index}`)}
        </blockquote>
      );
    }

    const lines = trimmed.split("\n").map((line) => line.trim());

    const isList = lines.every(
      (line) => line.startsWith("- ") || line.startsWith("* "),
    );

    if (isList) {
      return (
        <ul
          key={index}
          className="my-5 list-disc space-y-2 pr-5 text-sm leading-8 text-ink-soft marker:text-brand-400"
        >
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>
              {renderInline(line.slice(2), `li-${index}-${lineIndex}`)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={index}
        className="mt-4 whitespace-pre-line text-sm leading-8 text-ink-soft sm:text-[15px] sm:leading-9"
      >
        {renderInline(trimmed, `p-${index}`)}
      </p>
    );
  });
}

function RichTextContent({ content }: { content: string }) {
  return <>{renderContent(content)}</>;
}

export default RichTextContent;
