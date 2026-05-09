import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

function absoluteUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${BASE_URL}${url}`
}

export function getContracts(params = {}) {
  return api.get('/api/contracts', { params }).then(r => r.data)
}

export function getContract(id) {
  return api.get(`/api/contracts/${id}`).then(r => r.data)
}

export function getFilterOptions() {
  return api.get('/api/contracts/filters/options').then(r => r.data)
}

export function auditContract(id, force = false) {
  return api.post(`/api/audit/${id}`, { force }).then(r => r.data)
}

export function getAudit(id) {
  return api.get(`/api/audit/${id}`).then(r => r.data)
}

export function getAllAudits() {
  return api.get('/api/audit').then(r => r.data)
}

export function generateInfographic(id) {
  return api.post(`/api/infographic/${id}`).then(r => r.data)
}

export function getInfographic(id) {
  return api.get(`/api/infographic/${id}`).then(r => r.data)
}

export function generateReport(id) {
  return api.post(`/api/reports/${id}/generate`).then(r => ({
    ...r.data,
    url: absoluteUrl(r.data.url),
  }))
}

export function getReport(id) {
  return api.get(`/api/reports/${id}`).then(r => ({
    ...r.data,
    url: absoluteUrl(r.data.url),
  }))
}

export function sendReportByEmail(id, email) {
  return api.post(`/api/reports/${id}/email`, { email }).then(r => r.data)
}

export function getDepartmentStats() {
  return api.get('/api/map/departments').then(r => r.data)
}
