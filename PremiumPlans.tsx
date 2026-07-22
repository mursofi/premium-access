import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function PremiumPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/plans').then(res => setPlans(res.data));
  }, []);

  const handleRequest = async (planId: string) => {
    try {
      await axios.post('http://localhost:5000/api/user/request-premium', { plan_id: planId });
      toast.success('Permintaan berhasil dikirim! Menunggu verifikasi Admin.');
      setSelectedPlan(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengirim permintaan.');
    }
  };

  if (selectedPlan) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setSelectedPlan(null)} className="mb-4 text-blue-600">← Kembali</button>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Instruksi Pembayaran</h2>
          <div className="space-y-3 mb-6">
            <p><strong>Paket:</strong> {selectedPlan.name}</p>
            <p><strong>Nominal:</strong> Rp {selectedPlan.price.toLocaleString('id-ID')}</p>
            <p><strong>Durasi:</strong> {selectedPlan.duration_days} hari</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 mb-6">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Transfer ke Rekening:</h3>
            <p className="text-xl font-mono font-bold">BNI 0495212080</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Lakukan transfer sesuai nominal yang tertera. Simpan bukti transfer. 
              Aktivasi dilakukan secara manual oleh Admin setelah pembayaran terverifikasi di sistem perbankan.
            </p>
          </div>

          <button 
            onClick={() => handleRequest(selectedPlan.id)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Saya Sudah Membayar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pilih Paket Premium</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-700 flex flex-col">
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <p className="text-3xl font-bold text-blue-600 mb-4">Rp {plan.price.toLocaleString('id-ID')}</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">{plan.description}</p>
            <button 
              onClick={() => setSelectedPlan(plan)}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Pilih Paket
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}