import { Link } from 'react-router-dom'
import useSEO from '../hooks/useSEO'
import './Home.css'

export default function NotFound() {
  useSEO({ title: '404 - الصفحة غير موجودة' })
  return (
    <div className="page-enter container" style={{ 
      textAlign: 'center', 
      paddingTop: '120px', 
      paddingBottom: '80px',
      direction: 'rtl' 
    }}>
      <h1 style={{ fontSize: 'clamp(4rem, 8vw, 8rem)', fontWeight: 900, marginBottom: '8px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </h1>
      <h2 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>الصفحة غير موجودة</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem' }}>
        عذراً، لا يمكننا العثور على الصفحة التي تبحث عنها.
      </p>
      <Link to="/" className="btn-primary" style={{ gap: '8px' }}>
        🏠 العودة للرئيسية
      </Link>
    </div>
  )
}
