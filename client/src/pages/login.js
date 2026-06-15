import React, { useState , useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
      document.title = "Login | TOOF";
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin', { replace: true });
            } else if (user.role === 'employee') { 
                navigate('/staff', { replace: true });
            }
        }
    }, [navigate]);

    const handleLogin = async (e) => { 
    e.preventDefault();
    setError('');

    try{
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
        return;
      }

      localStorage.setItem('my_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        navigate('/admin');
      }
      else if (data.user.role === 'employee') 
      { 
          navigate('/staff');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again later.');
    }
  };
    return (
      <div className="login-wrapper">
        <div className="login-header">
          <img 
              src="/favicon.svg"
              alt="TaskFlow Logo"
              className="login-logo"
          />
          <h1 className="login-title">
            TASKFLOW
          </h1>
        </div>
        <div className="form-card">
          <div className="text-center mb-6">
            <h2 className="font-semibold text-lg mb-2">Welcome Back</h2>
            <p className="text-secondary text-sm">Please enter your details to sign in.</p>
          </div>
          {error && (
            <div className="alert-message error" style={{ textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            
            <div className="form-group">
              <input 
                type="email" 
                id="email" 
                className="form-input" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <input 
                type="password" 
                id="password" 
                className="form-input" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <div className="disclaimer-text">
              By signing in, you agree to our Terms & Privacy Policy.
            </div>
            
            <button type="submit" className="btn-submit">Sign In</button>
            
          </form>
        </div>
      </div>
    );
}

export default Login;