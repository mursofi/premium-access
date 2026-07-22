import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/user/profile').then(res => setProfile(res.data));
  }, []);

  if (!profile) return <div>Loading...</div>;

  const isPremium = profile.premium_status && new Date(profile.premium_expiry) > new Date();
  const expiryDate = profile.premium_expiry ? new Date(profile.premium_expiry).toLocaleDateString('id-ID') : '-';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard Pengguna</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Profil Akun</h2>
        <p><strong>Username:</strong> {profile.username}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
      </div>

      <div className={`p-6 rounded-lg shadow mb-6 ${isPremium ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200' : 'bg-gray-50 dark:bg-gray-800'}`}>
        <h2 className="text-xl font-semibold mb-2">Status Premium</h2>
        {isPremium ? (
          <div>
            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mb-2">PREMIUM AKTIF</span>
            <p>Berlaku hingga: <strong>{expiryDate}</strong></p>
          </div>
        ) : (
          <div>
            <p className="text-red-500 mb-4">Anda belum memiliki akses Premium.</p>
            <Link to="/premium/plans" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
              Upgrade ke Premium
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}