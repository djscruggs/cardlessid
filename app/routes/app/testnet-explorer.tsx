import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState, useEffect, useCallback } from "react";

export function meta() {
  return [{ title: "Algorand Testnet Explorer" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const address = url.searchParams.get('address') || import.meta.env.VITE_APP_WALLET_ADDRESS;
  
  return {
    address
  };
}

const TestnetExplorer = () => {
  const { address } = useLoaderData<typeof loader>();
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async (addr: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch network status
      const statusResponse = await fetch('https://testnet-api.algonode.cloud/v2/status');
      const networkData = await statusResponse.json();
      setNetworkStatus(networkData);
      
      // Fetch account info
      const accountResponse = await fetch(`https://testnet-api.algonode.cloud/v2/accounts/${addr}`);
      const accountData = await accountResponse.json();
      setAccountInfo(accountData);
      
      // Fetch recent transactions
      const txResponse = await fetch(`https://testnet-idx.algonode.cloud/v2/transactions?address=${addr}&limit=10`);
      const txData = await txResponse.json();
      setTransactions(txData.transactions || []);
      
    } catch (err) {
      console.error('Error fetching testnet data:', err);
      setError('Failed to fetch testnet data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (address) {
      fetchData(address);
    }
  }, [address, fetchData]);
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-800 mb-2">Testnet Explorer Error</h1>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              The testnet API might be temporarily unavailable. Try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Algorand Testnet Explorer</h1>
          
          {/* Address Search */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Address</h2>
            <div className="flex space-x-4">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter Algorand address"
                className="flex-1 input input-bordered"
              />
              <button
                onClick={() => fetchData(searchAddress)}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="loading loading-spinner loading-lg"></div>
            <span className="ml-2">Loading testnet data...</span>
          </div>
        )}
        
        {!loading && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Network Status */}
              {networkStatus && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Network Status</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Round:</span>
                      <span className="font-mono">{networkStatus['last-round']?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Catchup Time:</span>
                      <span className="font-mono">{networkStatus['catchup-time']}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Account Info */}
              {accountInfo && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-mono text-xs break-all">{accountInfo.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-mono">{(accountInfo.amount / 1000000).toFixed(6)} ALGO</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="capitalize">{accountInfo.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Round:</span>
                      <span className="font-mono">{accountInfo.round?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Recent Transactions */}
            {transactions.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Round</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id}>
                      <td className="font-mono text-xs">
                        <a 
                          href={`https://testnet.algoexplorer.io/tx/${tx.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {tx.id?.substring(0, 20)}...
                        </a>
                      </td>
                      <td>{tx['tx-type'] || 'Payment'}</td>
                      <td>{tx['confirmed-round']?.toLocaleString()}</td>
                      <td>{tx.amount ? `${(tx.amount / 1000000).toFixed(6)} ALGO` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        
          </>
        )}
      </div>
    </div>
  );
};

export default TestnetExplorer;
