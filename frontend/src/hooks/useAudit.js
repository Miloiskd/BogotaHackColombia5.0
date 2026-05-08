import { useState, useCallback } from 'react'
import { auditContract, getAudit } from '../services/api'

export function useAudit() {
  const [auditData, setAuditData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runAudit = useCallback(async (idContrato, force = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await auditContract(idContrato, force)
      setAuditData(data)
      return data
    } catch (err) {
      const msg = err.response?.data?.detail || err.message
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAudit = useCallback(async (idContrato) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAudit(idContrato)
      setAuditData(data)
      return data
    } catch (err) {
      setAuditData(null)
      if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { auditData, loading, error, runAudit, fetchAudit, setAuditData }
}
