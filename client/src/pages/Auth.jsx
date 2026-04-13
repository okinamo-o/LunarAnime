import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { loginUser, registerUser } from '../api/backend'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import './Auth.css'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  useSEO({ 
    title: mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب', 
    description: 'سجل دخولك في LunarAnime للوصول إلى قائمتك المفضلة ومتابعة مشاهدتك.'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let userData
      if (mode === 'login') {
        userData = await loginUser(username, password)
      } else {
        if (!email) {
          setError('البريد الإلكتروني مطلوب')
          setLoading(false)
          return
        }
        userData = await registerUser(username, email, password)
      }
      login(userData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page page-enter">
      <div className="auth-page__bg">
        <div className="auth-page__glow auth-page__glow--1" />
        <div className="auth-page__glow auth-page__glow--2" />
      </div>

      <div className="auth-page__card glass-heavy">
        <div className="auth-page__header">
          <span className="auth-page__logo-icon">🌙</span>
          <h1>
            {mode === 'login' ? 'مرحباً بك مجدداً' : 'انضم إلى LunarAnime'}
          </h1>
          <p className="auth-page__subtitle">
            {mode === 'login'
              ? 'قم بتسجيل الدخول للوصول إلى قائمتك وتقييماتك'
              : 'قم بإنشاء حساب للبدء في تتبع الأنميات المفضلة لديك'}
          </p>
        </div>

        {error && (
          <div className="auth-page__error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-page__form">
          <div className="auth-page__input-group">
            <User size={18} className="auth-page__input-icon" />
            <input
              type="text"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="auth-page__input"
            />
          </div>

          {mode === 'register' && (
            <div className="auth-page__input-group animate-fade-up">
              <Mail size={18} className="auth-page__input-icon" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-page__input"
              />
            </div>
          )}

          <div className="auth-page__input-group">
            <Lock size={18} className="auth-page__input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-page__input"
            />
            <button
              type="button"
              className="auth-page__toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary auth-page__submit"
            disabled={loading}
          >
            {loading ? 'الرجاء الانتظار...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="auth-page__switch">
          {mode === 'login' ? (
            <>ليس لديك حساب؟ <button onClick={() => { setMode('register'); setError('') }}>إنشاء حساب</button></>
          ) : (
            <>لديك حساب بالفعل؟ <button onClick={() => { setMode('login'); setError('') }}>تسجيل الدخول</button></>
          )}
        </p>
      </div>
    </div>
  )
}
