import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import CodeBlock from './CodeBlock'

// Schéma de nettoyage : le HTML « inoffensif » (br, details, tableaux...) reste
// autorisé, mais scripts, iframes, gestionnaires d'évènements et styles en ligne
// sont retirés. Indispensable pour les conversations partagées par lien.
const SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ['className', /^language-./, 'math-inline', 'math-display']],
    div: [...(defaultSchema.attributes?.div || []), ['className', 'math', 'math-display']],
    span: [...(defaultSchema.attributes?.span || []), ['className', 'math', 'math-inline']],
  },
}

export default function Markdown({ content }) {
  return (
    <div className="prose-obedgpt">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SCHEMA], rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-([\w-]+)/.exec(className || '')
            const lang = (match?.[1] || '').toLowerCase()
            const code = String(children).replace(/\n$/, '')
            if (!inline && (match || code.includes('\n'))) return <CodeBlock lang={lang} code={code} htmlProps={props} />
            return <code className={className} {...props}>{children}</code>
          },
        }}
      >{content}</ReactMarkdown>
    </div>
  )
}

