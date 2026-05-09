import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 60000,
})

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
  return api.post(`/api/reports/${id}/generate`).then(r => r.data)
}

export function getReport(id) {
  return api.get(`/api/reports/${id}`).then(r => r.data)
}

export function sendReportByEmail(id, email) {
  return api.post(`/api/reports/${id}/email`, { email }).then(r => r.data)
}

export function getDepartmentStats() {
  return api.get('/api/map/departments').then(r => r.data)
}

export function getRelationshipData() {
  return api.get('/api/audit/relationships').then(r => r.data)
}
