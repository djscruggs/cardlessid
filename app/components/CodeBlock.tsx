import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeBlockProps {
  children: string;
  language?: string;
  showLineNumbers?: boolean;
}

export default function CodeBlock({
  children,
  language = 'javascript',
  showLineNumbers = false
}: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      showLineNumbers={showLineNumbers}
      customStyle={{
        borderRadius: '0.5rem',
        padding: '1rem',
        fontSize: '0.875rem',
        margin: 0,
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
}
