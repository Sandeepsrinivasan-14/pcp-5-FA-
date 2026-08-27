import axios from 'axios';

/**
 * Where the API lives.
 *
 * - Single-service deployment (the backend also serves this build): leave
 *   REACT_APP_API_URL unset and requests go to /api on the same origin.
 * - Split deployment (SPA on a static host, API elsewhere): set
 *   REACT_APP_API_URL to the full API base, e.g. https://api.example.com/api
 * - Local development: defaults to the dev server on port 5000.
 */
const resolveBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL.replace(/\/$/, '');
    }
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:5000/api';
    }
    return '/api';
};

const API = axios.create({
    baseURL: resolveBaseUrl(),
    timeout: 30000,
});

API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        // An expired or revoked token should drop the session rather than leave
        // the app in a half-authenticated state — but never bounce a failed
        // login attempt, which legitimately returns 401.
        const isLoginRequest = error.config?.url?.includes('/auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default API;
