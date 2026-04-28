import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, getAdminUsers, deleteAdminUser } from '../api/backend';
import './Admin.css';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({ userCount: 0, watchlistCount: 0, ratingCount: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        navigate('/');
      } else {
        fetchAdminData();
      }
    }
  }, [user, authLoading, navigate]);

  const fetchAdminData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAdminUsers()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (usersData.success) setUsers(usersData.data);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم؟')) return;
    try {
      const data = await deleteAdminUser(id);
      if (data.success) {
        setUsers(users.filter(u => u._id !== id));
        setStats(prev => ({ ...prev, userCount: prev.userCount - 1 }));
      } else {
        alert(data.message || 'فشل في حذف المستخدم');
      }
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال');
    }
  };

  if (authLoading || loading) {
    return <div className="loading-screen"><div className="loader"></div></div>;
  }

  return (
    <div className="admin-container page-enter" style={{ direction: 'rtl' }}>
      <div className="admin-header">
        <h1>لوحة تحكم المسؤول</h1>
        <p>مرحباً بك {user.username}، يمكنك إدارة الموقع من هنا</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>إجمالي المستخدمين</h3>
          <p>{stats.userCount}</p>
        </div>
        <div className="stat-card">
          <h3>قوائم المشاهدة</h3>
          <p>{stats.watchlistCount}</p>
        </div>
        <div className="stat-card">
          <h3>التقييمات</h3>
          <p>{stats.ratingCount}</p>
        </div>
      </div>

      <div className="admin-section">
        <h2>المستخدمين</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>اسم المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>تاريخ التسجيل</th>
              <th>الرتبة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role === 'admin' ? 'مدير' : 'عضو'}</span>
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <button onClick={() => handleDeleteUser(u._id)} className="delete-btn">
                      حذف
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
