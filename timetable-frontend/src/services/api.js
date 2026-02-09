import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin APIs
export const adminAPI = {
  // Academic Calendar
  createAcademicCalendar: (data) => api.post('/admin/academic-calendar', data),
  getAcademicCalendars: () => api.get('/admin/academic-calendar'),
  updateAcademicCalendar: (id, data) => api.put(`/admin/academic-calendar/${id}`, data),
  deleteAcademicCalendar: (id) => api.delete(`/admin/academic-calendar/${id}`),

  // Time Slots
  createTimeSlot: (data) => api.post('/admin/time-slot', data),
  getTimeSlots: () => api.get('/admin/time-slot'),
  updateTimeSlot: (id, data) => api.put(`/admin/time-slot/${id}`, data),
  deleteTimeSlot: (id) => api.delete(`/admin/time-slot/${id}`),

  // Courses
  createCourse: (data) => api.post('/admin/course', data),
  getCourses: (params) => api.get('/admin/course', { params }),
  updateCourse: (id, data) => api.put(`/admin/course/${id}`, data),
  deleteCourse: (id) => api.delete(`/admin/course/${id}`),

  // Faculty
  createFaculty: (data) => api.post('/admin/faculty', data),
  getFaculty: (params) => api.get('/admin/faculty', { params }),
  updateFaculty: (id, data) => api.put(`/admin/faculty/${id}`, data),
  deleteFaculty: (id) => api.delete(`/admin/faculty/${id}`),

  // Rooms
  createRoom: (data) => api.post('/admin/room', data),
  getRooms: (params) => api.get('/admin/room', { params }),
  updateRoom: (id, data) => api.put(`/admin/room/${id}`, data),
  deleteRoom: (id) => api.delete(`/admin/room/${id}`),

  // Workload Rules
  createWorkloadRule: (data) => api.post('/admin/workload-rule', data),
  getWorkloadRules: () => api.get('/admin/workload-rule'),
  updateWorkloadRule: (id, data) => api.put(`/admin/workload-rule/${id}`, data),

  // Leave Management
  getPendingLeaves: () => api.get('/admin/leave/pending'),
  approveLeave: (id) => api.put(`/admin/leave/${id}/approve`),
  rejectLeave: (id, reason) => api.put(`/admin/leave/${id}/reject`, { rejectionReason: reason }),

  // Timetable Control
  lockTimetable: (academicCalendarId) => api.post('/admin/timetable/lock', { academicCalendarId }),
  unlockTimetable: (academicCalendarId) => api.post('/admin/timetable/unlock', { academicCalendarId }),
};

// Faculty APIs
export const facultyAPI = {
  getProfile: () => api.get('/faculty/profile'),
  updateProfile: (data) => api.put('/faculty/profile', data),
  getAvailableCourses: (params) => api.get('/faculty/courses', { params }),
  submitPreferences: (data) => api.post('/faculty/preferences', data),
  getPreferences: (params) => api.get('/faculty/preferences', { params }),
  updateAvailability: (data) => api.put('/faculty/availability', data),
  applyLeave: (data) => api.post('/faculty/leave', data),
  getLeaveHistory: (params) => api.get('/faculty/leave', { params }),
  cancelLeave: (id) => api.delete(`/faculty/leave/${id}`),
};

// Student APIs
export const studentAPI = {
  viewTimetable: (params) => api.get('/student/timetable', { params }),
  getFormattedTimetable: (params) => api.get('/student/timetable/formatted', { params }),
};

// Timetable APIs
export const timetableAPI = {
  generateTimetable: (academicCalendarId) => api.post('/timetable/generate', { academicCalendarId }),
  getTimetable: (params) => api.get('/timetable', { params }),
  getStatistics: (params) => api.get('/timetable/statistics', { params }),
  getConflicts: (params) => api.get('/timetable/conflicts', { params }),
  getConflicts: (params) => api.get('/timetable/conflicts', { params }),
  getFacultyTimetable: (params) => api.get('/timetable/faculty', { params }),
  getActiveCalendar: () => api.get('/timetable/active-calendar'),
};

export default api;