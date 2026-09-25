import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      if (error.response.status === 400) {
        throw new Error(error.response.data?.error || 'Bad Request');
      } else if (error.response.status >= 500) {
        throw new Error('Server error, please try again');
      }
    } else if (error.request) {
      throw new Error('Cannot connect to server');
    }
    throw error;
  }
);

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
