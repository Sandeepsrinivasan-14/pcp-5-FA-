import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// The app persists its session in localStorage; each test starts signed out
// unless it says otherwise.
beforeEach(() => {
    window.localStorage.clear();
});

describe('App routing', () => {
    it('sends an unauthenticated visitor to the sign-in screen', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('login-card')).toBeInTheDocument();
        });

        expect(screen.getByTestId('email-input')).toBeInTheDocument();
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    it('does not expose the protected navigation while signed out', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('login-card')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    });

    it('does not advertise demo credentials in a production build', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('login-card')).toBeInTheDocument();
        });

        // The hint is opt-in via REACT_APP_SHOW_DEMO_ACCOUNTS. Under test,
        // NODE_ENV is "test", so it must stay hidden.
        expect(screen.queryByTestId('demo-accounts-info')).not.toBeInTheDocument();
    });
});
