import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tasks
export const getTasks = () => api.get('/tasks');
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const moveTask = (id, data) => api.patch(`/tasks/${id}/move`, data);

// Dependencies
export const getDependencies = () => api.get('/dependencies');
export const createDependency = (data) => api.post('/dependencies', data);
export const deleteDependency = (predecessorId, successorId) =>
  api.delete(`/dependencies/${predecessorId}/${successorId}`);

export default api;
