import { ReactNode } from 'react';

interface MarkdownProps {
  content: string;
}

const renderInline = (text: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // 处理加粗 **text**
  const boldRegex = /\*\*(.+?)\*\*/g;
  let boldMatch = boldRegex.exec(remaining);

  while (boldMatch) {
    const before = remaining.slice(0, boldMatch.index);
    if (before) {
      parts.push(<span key={key++}>{renderInlineText(before)}</span>);
    }
    parts.push(<strong key={key++} className="text-gold-300 font-semibold">{renderInlineText(boldMatch[1])}</strong>);
    remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    boldRegex.lastIndex = 0;
    boldMatch = boldRegex.exec(remaining);
  }

  if (remaining) {
    parts.push(<span key={key++}>{renderInlineText(remaining)}</span>);
  }

  return parts;
};

const renderInlineText = (text: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // 处理斜体 *text*
  const italicRegex = /\*(.+?)\*/g;
  let italicMatch = italicRegex.exec(remaining);

  while (italicMatch) {
    const before = remaining.slice(0, italicMatch.index);
    if (before) {
      parts.push(before);
    }
    parts.push(<em key={key++}>{italicMatch[1]}</em>);
    remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
    italicRegex.lastIndex = 0;
    italicMatch = italicRegex.exec(remaining);
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
};

export default function Markdown({ content }: MarkdownProps) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-3 text-silver-300">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (trimmed === '') {
      flushList();
      i++;
      continue;
    }

    // 标题 ###
    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push(
        <h3 key={key++} className="text-lg font-serif font-bold text-gold-300 mt-6 mb-3 first:mt-0">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // 标题 ##
    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2 key={key++} className="text-xl font-serif font-bold text-gold-400 mt-6 mb-3 first:mt-0">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // 标题 #
    if (trimmed.startsWith('# ')) {
      flushList();
      blocks.push(
        <h1 key={key++} className="text-2xl font-serif font-bold gold-gradient mt-6 mb-4 first:mt-0">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // 无序列表 -
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      i++;
      continue;
    }

    // 有序列表 1.
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      listItems.push(orderedMatch[1]);
      i++;
      continue;
    }

    // 分割线 ---
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      blocks.push(<hr key={key++} className="my-6 border-gold-500/20" />);
      i++;
      continue;
    }

    // 引用 >
    if (trimmed.startsWith('> ')) {
      flushList();
      let quoteContent = trimmed.slice(2);
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteContent += '\n' + lines[i].trim().slice(2);
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-4 border-gold-500/50 pl-4 my-4 text-silver-400 italic">
          {renderInline(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // 普通段落
    flushList();
    let paragraph = trimmed;
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('- ') && !lines[i].trim().startsWith('* ') && !lines[i].trim().match(/^\d+\.\s+/) && lines[i].trim() !== '---' && lines[i].trim() !== '***' && !lines[i].trim().startsWith('> ')) {
      paragraph += ' ' + lines[i].trim();
      i++;
    }
    blocks.push(
      <p key={key++} className="my-3 text-silver-300 leading-relaxed">
        {renderInline(paragraph)}
      </p>
    );
  }

  flushList();

  return <div className="prose-content">{blocks}</div>;
}
