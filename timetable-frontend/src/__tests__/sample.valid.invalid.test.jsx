import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import Login from '../pages/Login';
import Sidebar from '../components/common/Sidebar';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

describe('Sample Frontend Tests (5 valid, 5 invalid)', () => {
  beforeEach(() => {
    // Clear before each test
  });

  test('valid 1 - Sidebar renders provided tab labels', () => {
    const tabs = [
      { id: 1, label: 'Dashboard' },
      { id: 2, label: 'Settings' }
    ];
    render(
      <AuthProvider>
        <Sidebar tabs={tabs} activeTab={1} setActiveTab={() => {}} />
      </AuthProvider>
    );
    // header and button both contain Dashboard; ensure the button exists
    const dashboardButtons = screen.getAllByRole('button', { name: 'Dashboard' });
    expect(dashboardButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Settings' }).length).toBeGreaterThan(0);
  });

  test('valid 2 - Sidebar activeTab styling applies correct class', () => {
    const tabs = [
      { id: 1, label: 'Dashboard' },
      { id: 2, label: 'Settings' }
    ];
    render(
      <AuthProvider>
        <Sidebar tabs={tabs} activeTab={1} setActiveTab={() => {}} />
      </AuthProvider>
    );
    const dashboardBtn = screen.getAllByRole('button', { name: 'Dashboard' })[0];
    expect(dashboardBtn).toHaveClass('bg-primary-600');
  });

  test('valid 3 - Login component renders email and password input fields', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  test('valid 4 - Login tab switching displays register text', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    fireEvent.click(screen.getAllByText('Register')[0]);
    expect(screen.getByText(/Full Name/i)).toBeInTheDocument();
  });

  test('valid 5 - integration: Sidebar button click triggers setActiveTab callback', () => {
    let clickedTab = null;
    const setActiveTab = (id) => { clickedTab = id; };
    const tabs = [
      { id: 1, label: 'Dashboard' },
      { id: 2, label: 'Settings' }
    ];
    render(
      <AuthProvider>
        <Sidebar tabs={tabs} activeTab={1} setActiveTab={setActiveTab} />
      </AuthProvider>
    );
    const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });
    for (const btn of settingsButtons) {
      fireEvent.click(btn);
      if (clickedTab === 2) break;
    }
    expect(clickedTab).toBe(2);
  });

  test.skip('invalid 1 - Sidebar fails to render without tabs', () => {
    render(
      <AuthProvider>
        <Sidebar tabs={[]} activeTab={0} setActiveTab={() => {}} />
      </AuthProvider>
    );
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  test.skip('invalid 2 - Sidebar activeTab styling uses wrong class', () => {
    const tabs = [{ id: 1, label: 'Dashboard' }];
    render(
      <AuthProvider>
        <Sidebar tabs={tabs} activeTab={1} setActiveTab={() => {}} />
      </AuthProvider>
    );
    const dashboardBtn = screen.getByText('Dashboard').closest('button');
    expect(dashboardBtn).toHaveClass('bg-red-600');
  });

  test.skip('invalid 3 - Login renders nonexistent input placeholder', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText('wrong@email.com')).toBeInTheDocument();
  });

  test.skip('invalid 4 - Login register tab not implemented', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText('Register'));
    expect(screen.queryByText(/Full Name/i)).toBeNull();
  });

  test.skip('invalid 5 - Button click does not invoke callback', () => {
    let clickedTab = null;
    const setActiveTab = (id) => { clickedTab = id; };
    const tabs = [{ id: 1, label: 'Dashboard' }];
    render(
      <AuthProvider>
        <Sidebar tabs={tabs} activeTab={1} setActiveTab={setActiveTab} />
      </AuthProvider>
    );
    fireEvent.click(screen.getByText('Dashboard'));
    expect(clickedTab).toBeNull();
  });
});