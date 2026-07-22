import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminRequests() {
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = () => {
    axios.get('http://localhost:5000/api/admin/requests').then(res => setRequests(res.data));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !window.confirm('Apakah Anda yakin pembayaran telah diterima dan sesuai di rekening BNI?')) return;
    
    try {
      await axios.post(`http://localhost:5000/api/admin/requests/${id}/${action}`);
      toast.success(action === 'approve' ? 'Premium berhasil diaktifkan.' : 'Permintaan ditolak.');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memproses.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Permintaan Premium</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="p-4">Username</th>
              <th className="p-4">Paket</th>
              <th className="p-4">Nominal</th>
              <th className="p-4">Status</th>
              <th className="p-4">Tanggal</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map(req => (
              <tr key={req.id}>
                <td className="p-4">{req.user.username}</td>
                <td className="p-4">{req.plan.name}</td>
                <td className="p-4">Rp {req.amount.toLocaleString('id-ID')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    req.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    req.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {req.payment_status}
                  </span>
                </td>
                <td className="p-4">{new Date(req.requested_at).toLocaleDateString('id-ID')}</td>
                <td className="p-4">
                  {req.payment_status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req.id, 'reject')} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Tolak</button>
                      <button onClick={() => handleAction(req.id, 'approve')} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Aktifkan</button>
                    </div>
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