import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
      document.title = "Đăng Nhập  | TOOF";
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

      try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: {
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
          navigate('/admin/dashboard');
        } else if (data.user.role === 'employee') {
          navigate('/staff/dashboard');
        }
      } catch (error) {
        console.error('Login error:', error);
        setError('An error occurred during login. Please try again later.');
      }
    };

    return (
        <div className="login-wrapper">
            {/* Header Logo */}
            <div className="login-header">
                {/* Icon Logo (Có thể thay bằng thẻ <img> nếu bạn có hình logo) */}
                <div style={{ width: '40px', height: '40px', backgroundColor: '#2563EB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="login-title" style={{ margin: 0, fontSize: '32px', color: '#2563EB', fontWeight: '900', letterSpacing: '1px' }}>
                    TASKFLOW
                </h1>
            </div>

            {/* Khung Form Đăng Nhập */}
            <div className="form-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>Đăng Nhập</h2>
                <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '28px' }}>Vui lòng nhập thông tin của bạn để đăng nhập.</p>

                <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                    {error && (
                        <p className="form-error" style={{ color: '#dc2626', marginBottom: '16px' }}>
                            {error}
                        </p>
                    )}
                    
                    {/* Ô nhập Email */}
                    <div className="form-group">
                        <label className="form-label">Địa chỉ Email</label>
                        <input 
                            type="email" 
                            className="form-input" 
                            placeholder="Nhập địa chỉ email..." 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Ô nhập Mật khẩu (Có nút Ẩn/Hiện) */}
                    <div className="form-group" style={{ position: 'relative', marginBottom: '32px' }}>
                        <label className="form-label">Mật khẩu</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="form-input" 
                                placeholder="Nhập mật khẩu..." 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ paddingRight: '40px' }} /* Chừa chỗ để không bị chữ đè lên icon con mắt */
                            />
                            
                            {/* Nút Icon Mắt */}
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                ) : (
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Nút Đăng Nhập */}
                    <button type="submit" className="btn-submit">Đăng Nhập</button>

                    {/* Điều khoản sử dụng (Đã được chuyển gọn gàng xuống đáy form) */}
                    <p className="disclaimer-text" style={{ marginTop: '24px', marginBottom: 0, lineHeight: '1.5' }}>
                        Bằng cách đăng nhập, bạn đồng ý với các Điều khoản & Chính sách Bảo mật của chúng tôi.
                    </p>
                </form> 
            </div>
        </div>
    );
};

export default Login;