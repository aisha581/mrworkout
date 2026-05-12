import type { MDXComponents } from 'mdx/types'
import { DownloadCTA } from '@/components/DownloadCTA'
import { DownloadAppButton } from '@/components/DownloadAppButton'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    DownloadCTA,
    DownloadAppButton,
  }
}
