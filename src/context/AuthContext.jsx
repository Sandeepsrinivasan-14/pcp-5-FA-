import React, { createContext, useContext, useReducer, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

const initialState = {
    user: null,
    token: localStorage.getItem('token'),
    loading: true,
    error: null
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            localStorage.setItem('token', action.payload.token);
            return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
        case 'LOGOUT':
            localStorage.removeItem('token');
            return { ...state, user: null, token: null, loading: false, error: null };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const login = async (credentials) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await API.post('/auth/login', credentials);
            dispatch({ type: 'LOGIN_SUCCESS', payload: { token: response.data.data.token, user: response.data.data } });
            return true;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Login failed' });
            return false;
        }
    };

    const logout = () => {
        dispatch({ type: 'LOGOUT' });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
