import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuthContext();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    facultyId: '',
    department: '',
    designation: 'Assistant Professor',
    studentId: '',
    year: 1,
    section: 'A'
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(loginData.email, loginData.password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...userData } = registerData;
    // const { register } = useAuthContext(); // Removed invalid hook call
    const result = await register(userData);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Schedulix</h1>
          <p className="text-gray-600">Automated College Timetable Scheduler</p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="flex mb-6 border-b">
            <button
              className={`flex-1 py-2 text-center font-medium ${isLogin ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 text-center font-medium ${!isLogin ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <ErrorMessage message={error} onClose={() => setError('')} />

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  className="input-field"
                  value={registerData.role}
                  onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {registerData.role === 'faculty' && (
                <>
                  <div>
                    <label className="label">Faculty ID</label>
                    <input
                      type="text"
                      className="input-field"
                      value={registerData.facultyId}
                      onChange={(e) => setRegisterData({ ...registerData, facultyId: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <input
                      type="text"
                      className="input-field"
                      value={registerData.department}
                      onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Designation</label>
                    <select
                      className="input-field"
                      value={registerData.designation}
                      onChange={(e) => setRegisterData({ ...registerData, designation: e.target.value })}
                    >
                      <option value="Professor">Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Lecturer">Lecturer</option>
                    </select>
                  </div>
                </>
              )}

              {registerData.role === 'student' && (
                <>
                  <div>
                    <label className="label">Student ID</label>
                    <input
                      type="text"
                      className="input-field"
                      value={registerData.studentId}
                      onChange={(e) => setRegisterData({ ...registerData, studentId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Year</label>
                      <select
                        className="input-field"
                        value={registerData.year}
                        onChange={(e) => setRegisterData({ ...registerData, year: parseInt(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Section</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registerData.section}
                        onChange={(e) => setRegisterData({ ...registerData, section: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full shadow-lg hover:shadow-primary-200 transition-all duration-300" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : 'Register'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo Credentials:</p>
            <p className="text-xs mt-1">Admin: admin@test.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;