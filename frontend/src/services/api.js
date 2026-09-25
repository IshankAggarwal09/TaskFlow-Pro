import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api'
});

export const getBoard = async () => {
  const response = await api.get('/board');
  return response.data;
};

export const createTask = async (data) => {
  const response = await api.post('/tasks', data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await api.patch(`/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

export const addDependency = async (taskId, predecessorId, aiSuggested = false) => {
  const response = await api.post(`/tasks/${taskId}/dependencies`, { predecessorId, aiSuggested });
  return response.data;
};

export const removeDependency = async (taskId, depId) => {
  const response = await api.delete(`/tasks/${taskId}/dependencies/${depId}`);
  return response.data;
};

export const getAiSuggestions = async (taskId) => {
  const response = await api.post(`/tasks/${taskId}/ai-suggestions`);
  return response.data;
};
