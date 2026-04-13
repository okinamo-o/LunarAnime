import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer" style={{ textAlign: 'right', direction: 'rtl' }}>
      <div className="footer__glow" />
      <div className="container footer__inner">
        <div className="footer__top" style={{ flexDirection: 'row-reverse' }}>
          <div className="footer__brand">
            <Link to="/" className="footer__logo" style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
              <span className="footer__logo-text">Lunar<span className="footer__logo-accent">Anime</span></span>
              <span className="footer__logo-icon" style={{ marginLeft: '8px' }}>🌙</span>
            </Link>
            <p className="footer__desc">
              وجهتك الأولى لاستكشاف، ومتابعة، ومشاهدة أحدث حلقات ومواسم الأنمي المترجمة.
            </p>
          </div>

          <div className="footer__links-group" style={{ alignItems: 'flex-start' }}>
            <h4 className="footer__links-title">تصفح</h4>
            <Link to="/" className="footer__link">الرئيسية</Link>
            <Link to="/" className="footer__link">الترند</Link>
          </div>

          <div className="footer__links-group" style={{ alignItems: 'flex-start' }}>
            <h4 className="footer__links-title">حسابي</h4>
            <Link to="/dashboard" className="footer__link">قائمتي</Link>
            <Link to="/auth" className="footer__link">تسجيل الدخول</Link>
          </div>

          <div className="footer__links-group" style={{ alignItems: 'flex-start' }}>
            <h4 className="footer__links-title">قانوني</h4>
            <span className="footer__link" style={{ cursor: 'default', opacity: 0.6 }}>سياسة الخصوصية</span>
            <span className="footer__link" style={{ cursor: 'default', opacity: 0.6 }}>شروط الخدمة</span>
            <span className="footer__link" style={{ cursor: 'default', opacity: 0.6 }}>DMCA</span>
          </div>
        </div>

        <div className="footer__bottom" style={{ flexDirection: 'row-reverse' }}>
          <p>© {new Date().getFullYear()} LunarAnime. جميع الحقوق محفوظة.</p>
          <p className="footer__attribution">
            لا يستضيف هذا الموقع أي ملفات على خوادمه الخاصة. يتم دمج جميع المحتويات من قبل أطراف ثالثة.
          </p>
        </div>
      </div>
    </footer>
  )
}
