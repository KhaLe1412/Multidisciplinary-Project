import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Factory, Mail, Lock, AlertCircle } from 'lucide-react';

export function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    const success = await login(email, password);
    if (success) navigate('/control');
    else setError('Email hoặc mật khẩu không đúng!');
  };

  const handleGmail = async () => {
    const success = await login('admin@test.com', 'admin123');
    if (success) navigate('/control');
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { setError('Vui lòng nhập email!'); return; }
    setForgotSent(true);
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1583736902935-6b52b2b2359e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/80" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Factory size={26} />
            </div>
            <div>
              <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>DryerControl</h1>
              <p className="text-slate-400 text-sm">Hệ thống quản lý máy sấy</p>
            </div>
          </div>
          <h2 className="text-3xl text-white mb-4" style={{ fontWeight: 700, lineHeight: '1.3' }}>
            Quản lý thông minh<br />máy sấy công nghiệp
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Giám sát, điều khiển và phân tích hiệu suất toàn bộ hệ thống máy sấy trong nhà máy của bạn theo thời gian thực.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { num: '9', label: 'Máy sấy' },
              { num: '3', label: 'Tầng' },
              { num: '6', label: 'Phòng' },
              { num: '99.2%', label: 'Uptime' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl text-blue-300" style={{ fontWeight: 700 }}>{item.num}</div>
                <div className="text-slate-400 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Factory size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl text-slate-900" style={{ fontWeight: 700 }}>DryerControl</h1>
              <p className="text-slate-500 text-xs">Hệ thống quản lý máy sấy</p>
            </div>
          </div>

          {view === 'login' ? (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl text-slate-900 mb-1" style={{ fontWeight: 700 }}>Đăng nhập</h2>
              <p className="text-slate-500 text-sm mb-6">Nhập thông tin tài khoản để tiếp tục</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1" style={{ fontWeight: 600 }}>Email / Tên đăng nhập</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin@factory.vn"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1" style={{ fontWeight: 600 }}>Mật khẩu</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setView('forgot'); setError(''); }}
                    className="text-sm text-blue-600 hover:text-blue-700">
                    Quên mật khẩu?
                  </button>
                </div>
                <button type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm transition-colors"
                  style={{ fontWeight: 600 }}>
                  Đăng nhập
                </button>
              </form>

              {/* Demo accounts hint */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
                <p style={{ fontWeight: 600 }} className="text-slate-600">💡 Tài khoản demo:</p>
                <p><span className="text-blue-600 font-mono">admin@test.com</span> / <span className="font-mono">admin123</span> — Quản trị viên</p>
                <p><span className="text-blue-600 font-mono">staff@test.com</span> / <span className="font-mono">staff123</span> — Nhân viên</p>
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">hoặc tiếp tục với</span>
                </div>
              </div>

              <button onClick={handleGmail}
                className="w-full flex items-center justify-center gap-3 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-lg text-sm text-slate-700 transition-colors"
                style={{ fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Đăng nhập với Google
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <button onClick={() => { setView('login'); setForgotSent(false); setError(''); }}
                className="text-blue-600 hover:text-blue-700 text-sm mb-4 flex items-center gap-1">
                ← Quay lại đăng nhập
              </button>
              <h2 className="text-2xl text-slate-900 mb-1" style={{ fontWeight: 700 }}>Quên mật khẩu</h2>
              <p className="text-slate-500 text-sm mb-6">
                {forgotSent ? 'Email khôi phục đã được gửi!' : 'Nhập email để nhận liên kết đặt lại mật khẩu'}
              </p>
              {!forgotSent ? (
                <form onSubmit={handleForgot} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                      <AlertCircle size={16} />{error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-slate-700 mb-1" style={{ fontWeight: 600 }}>Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your@email.com" />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm transition-colors"
                    style={{ fontWeight: 600 }}>
                    Gửi liên kết khôi phục
                  </button>
                </form>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-green-600 text-3xl mb-2">✓</div>
                  <p className="text-green-700 text-sm">Vui lòng kiểm tra hộp thư <strong>{forgotEmail}</strong> và làm theo hướng dẫn.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}