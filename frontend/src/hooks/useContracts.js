import { useState, useCallback, useRef } from 'react'
import { getContracts, getAllAudits } from '../services/api'

export function useContracts() {
  const [contracts, setContracts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({})
  const filtersRef = useRef({})
  const debounceRef = useRef(null)
  const cachedAuditsRef = useRef(null)

  const fetchContracts = useCallback(async (p = 1, f = {}) => {
    setLoading(true)
    setPage(p)

    const apiParams = { page: p, page_size: 20 }
    for (const [k, v] of Object.entries(f)) {
      if (v !== undefined && v !== '' && k !== 'auditado') {
        apiParams[k] = v
      }
    }

    try {
      const [data] = await Promise.all([
        getContracts(apiParams),
        // Warm the audit cache if not yet loaded
        !cachedAuditsRef.current
          ? getAllAudits()
              .then(audits => { cachedAuditsRef.current = new Set(audits.map(a => a.id_contrato)) })
              .catch(() => { cachedAuditsRef.current = new Set() })
          : Promise.resolve(),
      ])

      const auditIds = cachedAuditsRef.current ?? new Set()
      let result = (data.contracts || []).map(c => ({
        ...c,
        _has_audit: c._has_audit || auditIds.has(c.id_contrato),
      }))

      if (f.auditado === 'si') {
        result = result.filter(c => c._has_audit)
        setTotal(result.length)
        setPages(1)
      } else if (f.auditado === 'no') {
        result = result.filter(c => !c._has_audit)
        setTotal(result.length)
        setPages(1)
      } else {
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      }

      setContracts(result)
    } catch (err) {
      console.error('Error fetching contracts:', err)
      setContracts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const updateFilters = useCallback((partial) => {
    const next = { ...filtersRef.current, ...partial }
    Object.keys(next).forEach(k => {
      if (next[k] === undefined || next[k] === '') delete next[k]
    })
    filtersRef.current = next
    setFilters(next)
    cachedAuditsRef.current = null
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchContracts(1, filtersRef.current)
    }, 400)
  }, [fetchContracts])

  const goToPage = useCallback((p) => {
    fetchContracts(p, filtersRef.current)
  }, [fetchContracts])

  return { contracts, total, page, pages, loading, filters, updateFilters, goToPage, fetchContracts }
}
