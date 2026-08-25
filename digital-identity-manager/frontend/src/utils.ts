export function cn(...values: Array<string | false | null | undefined>): string {
          return values.filter(Boolean).join(' ')
        }

        export function getErrorDetail(error: unknown): string {
          if (error instanceof Error) {
            const withDetail = error as Error & { detail?: unknown }
            if (typeof withDetail.detail === 'string' && withDetail.detail.trim()) {
              return withDetail.detail
            }
            if (error.message.trim()) {
              return error.message
            }
          }
          return 'Something went wrong.'
        }

        export function formatDate(value: string | null | undefined): string {
          if (!value) return '—'
          const date = new Date(value)
          if (Number.isNaN(date.getTime())) return value
          return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
        }

        export function formatDateTime(value: string | null | undefined): string {
          if (!value) return '—'
          const date = new Date(value)
          if (Number.isNaN(date.getTime())) return value
          return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(date)
        }

        export function formatBoolean(value: boolean): string {
          return value ? 'Yes' : 'No'
        }

        export function prettyJson(value: unknown): string {
          return JSON.stringify(value, null, 2)
        }

        export function safeParseJson(text: string): Record<string, unknown> {
          if (!text.trim()) return {}
          const parsed: unknown = JSON.parse(text)
          if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Parameters JSON must be an object.')
          }
          return parsed as Record<string, unknown>
        }

        export function splitLines(text: string): string[] {
          return text
            .split(/?
/)
            .map((entry) => entry.trim())
            .filter(Boolean)
        }

        export function joinLines(values: Array<string | null | undefined>): string {
          return values.filter((value): value is string => Boolean(value && value.trim())).join('
')
        }

        export function maybeNull(value: string): string | null {
          const trimmed = value.trim()
          return trimmed ? trimmed : null
        }

        export function toNumber(value: string, fallback = 0): number {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : fallback
        }

        export function maskPhone(value: string): string {
          const trimmed = value.trim()
          if (!trimmed) return ''
          if (trimmed.length <= 4) return '*'.repeat(trimmed.length)
          return `${'*'.repeat(Math.max(7, trimmed.length - 4))}${trimmed.slice(-4)}`
        }

        export function uid(): string {
          if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID()
          }
          return `${Date.now()}-${Math.random().toString(16).slice(2)}`
        }

        export function downloadBlob(filename: string, blob: Blob): void {
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = filename
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
