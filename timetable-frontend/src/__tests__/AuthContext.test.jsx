import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthProvider, useAuthContext } from '../context/AuthContext';

const Consumer = () => {
  const ctx = useAuthContext();
  return <div data-testid="role">{ctx.userRole || 'no-role'}</div>;
};

describe('AuthContext', () => {
  it('throws when used outside provider', () => {
    const renderOutside = () => render(<Consumer />);
    expect(renderOutside).toThrow();
  });

  it('provides context inside AuthProvider', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(getByTestId('role').textContent).toBe('no-role');
  });
});