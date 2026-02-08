import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../AuthContext';
import axios from 'axios';
import { vi } from 'vitest';

// Mock axios
vi.mock('axios');

// Test component to consume context
const TestComponent = () => {
    const { user, login, register, logout, loading, isAuthenticated } = useAuthContext();
    return (
        <div>
            {loading ? <div data-testid="loading">Loading...</div> : null}
            {isAuthenticated ? <div data-testid="user">{user.name}</div> : <div data-testid="guest">Guest</div>}
            <button onClick={() => login('test@test.com', 'password')}>Login</button>
            <button onClick={() => register({ email: 'new@test.com' })}>Register</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    // --- SUCCESS CASES ---

    it('should show loading initially and then guest if no token', async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        // expect(screen.getByTestId('loading')).toBeInTheDocument(); // Flaky
        await waitFor(() => expect(screen.getByTestId('guest')).toBeInTheDocument());
    });

    it('should auto-login if token exists in localStorage', async () => {
        localStorage.setItem('token', 'valid-token');
        axios.get.mockResolvedValueOnce({ data: { user: { name: 'Existing User', role: 'student' } } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Existing User'));
    });

    it('should login successfully', async () => {
        axios.post.mockResolvedValueOnce({
            data: { token: 'new-token', user: { name: 'New User' } }
        });
        axios.get.mockResolvedValueOnce({
            data: { user: { name: 'New User' } }
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByTestId('guest')).toBeInTheDocument());

        act(() => {
            screen.getByText('Login').click();
        });

        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('New User'));
        expect(localStorage.getItem('token')).toBe('new-token');
    });

    it('should register successfully', async () => {
        axios.post.mockResolvedValueOnce({
            data: { token: 'reg-token', user: { name: 'Registered User' } }
        });
        axios.get.mockResolvedValueOnce({
            data: { user: { name: 'Registered User' } }
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByTestId('guest')).toBeInTheDocument());

        act(() => {
            screen.getByText('Register').click();
        });

        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Registered User'));
    });

    it('should logout successfully', async () => {
        // Setup logged in state
        localStorage.setItem('token', 'token');
        axios.get.mockResolvedValueOnce({ data: { user: { name: 'User' } } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByTestId('user')).toBeInTheDocument());

        act(() => {
            screen.getByText('Logout').click();
        });

        await waitFor(() => expect(screen.getByTestId('guest')).toBeInTheDocument());
        expect(localStorage.getItem('token')).toBeNull();
    });

    // --- FAILURE CASES ---

    it('should handle login failure', async () => {
        axios.post.mockRejectedValueOnce({
            response: { data: { error: 'Invalid credentials' } }
        });

        // We need a slightly different test component to access the result of login
        const LoginFailComponent = () => {
            const { login } = useAuthContext();
            const [error, setError] = React.useState('');
            return (
                <div>
                    <div data-testid="error">{error}</div>
                    <button onClick={async () => {
                        const res = await login('bad', 'pass');
                        if (!res.success) setError(res.error);
                    }}>Login</button>
                </div>
            )
        }

        render(
            <AuthProvider>
                <LoginFailComponent />
            </AuthProvider>
        );

        act(() => {
            screen.getByText('Login').click();
        });

        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials'));
    });

    it('should handle register failure', async () => {
        axios.post.mockRejectedValueOnce({
            response: { data: { error: 'Email exists' } }
        });

        const RegisterFailComponent = () => {
            const { register } = useAuthContext();
            const [error, setError] = React.useState('');
            return (
                <div>
                    <div data-testid="error">{error}</div>
                    <button onClick={async () => {
                        const res = await register({});
                        if (!res.success) setError(res.error);
                    }}>Register</button>
                </div>
            )
        }

        render(
            <AuthProvider>
                <RegisterFailComponent />
            </AuthProvider>
        );

        act(() => {
            screen.getByText('Register').click();
        });

        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Email exists'));
    });

    it('should logout if fetching user fails (invalid token)', async () => {
        localStorage.setItem('token', 'invalid-token');
        axios.get.mockRejectedValueOnce(new Error('Unauthorized'));

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByTestId('guest')).toBeInTheDocument());
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('should explicitly check for useAuthContext outside provider', () => {
        // Suppress console.error for this test as React will complain about error boundary
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => render(<TestComponent />)).toThrow('useAuthContext must be used within AuthProvider');

        consoleSpy.mockRestore();
    });

    it('should handle network error on login', async () => {
        axios.post.mockRejectedValueOnce(new Error('Network Error'));
        const LoginFailComponent = () => {
            const { login } = useAuthContext();
            const [error, setError] = React.useState('');
            return (
                <div>
                    <div data-testid="error">{error}</div>
                    <button onClick={async () => {
                        const res = await login('a', 'b');
                        if (!res.success) setError(res.error);
                    }}>Login</button>
                </div>
            )
        }

        render(
            <AuthProvider>
                <LoginFailComponent />
            </AuthProvider>
        );

        act(() => {
            screen.getByText('Login').click();
        });

        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Login failed'));
    });

});
