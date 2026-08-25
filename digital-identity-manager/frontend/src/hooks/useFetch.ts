import { useCallback, useEffect, useState, type DependencyList } from 'react'

import { getErrorDetail } from '../utils'

interface UseFetchResult<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<T | undefined>>
}

export function useFetch<T>(
  fetcher: (() => Promise<T>) | null,
  deps: DependencyList = [],
): UseFetchResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(Boolean(fetcher))
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!fetcher) {
      setLoading(false)
      setData(undefined)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(getErrorDetail(err))
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, ...deps])

  return { data, loading, error, refetch, setData }
}
