/**
 * GraphTutor V3.0 - 师徒关系 API
 */

import api from '../api.js';

export async function applyMentor(masterId) {
  const res = await api.post('/v3/mentor/apply', { masterId });
  return res.data;
}

export async function getMentorRelations(params = {}) {
  const res = await api.get('/v3/mentor/relations', { params });
  return res.data;
}

export async function getMentorApplications() {
  const res = await api.get('/v3/mentor/applications');
  return res.data;
}

export async function acceptMentorApplication(relationId) {
  const res = await api.put(`/v3/mentor/relations/${relationId}/accept`);
  return res.data;
}

export async function rejectMentorApplication(relationId) {
  const res = await api.put(`/v3/mentor/relations/${relationId}/reject`);
  return res.data;
}
