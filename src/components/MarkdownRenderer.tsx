"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { CodeBlock } from "@/components/CodeBlock";

interface MarkdownRendererProps {
  content: string;
  fontSize?: "small" | "medium" | "large";
  conversationId?: string | null;
};

const textSizeMap = {
  small: "text-sm leading-6",
  medium: "text-base leading-7",
  large: "text-lg leading-8",
} as const;

const MarkdownRendererComponent = ({
  content,
  fontSize = "medium",
  conversationId,
}: MarkdownRendererProps) => {
  const textSize = textSizeMap[fontSize];

  return (
    <div
      className={`chat-message-content ${textSize} [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 leading-[inherit] last:mb-0">{children}</p>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">
              {children}
            </ul>
          ),
          li: ({ children }) => <li className="pl-1 leading-[inherit]">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-xl font-bold text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1.5 text-lg font-bold text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-base font-semibold text-white first:mt-0">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-4 border-purple-500/50 pl-3 text-white/65 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-white/10" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="text-white/90 italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a78bfa] underline underline-offset-2 hover:text-[#c4b5fd]"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/10 bg-[rgba(139,92,246,0.1)] px-3 py-1.5 text-left text-sm font-semibold text-white/90">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-1.5 text-sm text-white/80">
              {children}
            </td>
          ),
          del: ({ children }) => (
            <del className="text-white/50 line-through">{children}</del>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children ?? "").replace(/\n$/, "");
            const language = match ? match[1] : "text";
            const isBlock = Boolean(match) || code.includes("\n");

            if (isBlock) {
              return (
                <CodeBlock
                  code={code}
                  language={language}
                  conversationId={conversationId}
                />
              );
            }

            return (
              <code className="rounded bg-[rgba(139,92,246,0.15)] px-1.5 py-0.5 font-mono text-sm text-[#e2d9f3]">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}


export const MarkdownRenderer = memo(
  MarkdownRendererComponent,
  (prev, next) =>
    prev.content === next.content &&
    prev.fontSize === next.fontSize &&
    prev.conversationId === next.conversationId
);
