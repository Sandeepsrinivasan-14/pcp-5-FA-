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
    let newState;
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            localStorage.setItem('token', action.payload.token);
            newState = { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
            break;
        case 'LOGOUT':
            localStorage.removeItem('token');
            newState = { ...state, user: null, token: null, loading: false, error: null };
            break;
        case 'SET_LOADING':
            newState = { ...state, loading: action.payload };
            break;
        case 'SET_ERROR':
            newState = { ...state, error: action.payload, loading: false };
            break;
        default:
            newState = state;
    }
    
    if (!window.appState) {
        window.appState = {
            authUser: null,
            token: null,
            users: [],
            projects: [],
            issues: [],
            comments: [],
            filters: {},
            analytics: {}
        };
    }
    window.appState.authUser = newState.user;
    window.appState.token = newState.token;
    
    return newState;
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        if (!window.appState) {
            window.appState = {
                authUser: null,
                token: null,
                users: [],
                projects: [],
                issues: [],
                comments: [],
                filters: {},
                analytics: {}
            };
        }
        window.appState.authUser = state.user;
        window.appState.token = state.token;
    }, [state]);

    const { token, user } = state;

    useEffect(() => {
        const checkUser = async () => {
            if (token && !user) {
                dispatch({ type: 'SET_LOADING', payload: true });
                try {
                    const response = await API.get('/auth/me');
                    dispatch({ 
                        type: 'LOGIN_SUCCESS', 
                        payload: { token, user: response.data.data } 
                    });
                } catch (error) {
                    dispatch({ type: 'LOGOUT' });
                }
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        checkUser();
    }, [token, user]);

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
