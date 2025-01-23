import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  btc_balance: number;
  usd_balance: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade';
  amount: number;
  currency: 'BTC' | 'USD';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, [user]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('btc_balance, usd_balance')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  }

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    }
  }

  async function handleTransaction(type: 'deposit' | 'withdrawal') {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (type === 'withdrawal' && Number(amount) > profile?.btc_balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user?.id,
        type,
        amount: Number(amount),
        currency: 'BTC',
        status: 'completed'
      });

      if (error) throw error;

      // Add a small delay to allow the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`${type} successful`);
      setAmount('');
      await fetchProfile(); // Fetch updated balances
      await fetchTransactions();
    } catch (error) {
      console.error(`Error processing ${type}:`, error);
      toast.error(`Failed to process ${type}`);
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">BTC Balance</div>
            <div className="text-2xl font-bold">{profile.btc_balance.toFixed(8)} BTC</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">USD Value (Est.)</div>
            <div className="text-2xl font-bold">${profile.usd_balance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in BTC"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            disabled={loading}
          />
          <button
            onClick={() => handleTransaction('deposit')}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Deposit
          </button>
          <button
            onClick={() => handleTransaction('withdrawal')}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center"
          >
            <ArrowDownRight className="h-4 w-4 mr-2" />
            Withdraw
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
          <button
            onClick={fetchTransactions}
            className="text-gray-600 hover:text-gray-900"
          >
            <RefreshCcw className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`capitalize ${
                      tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {tx.amount} {tx.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tx.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}