/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { initDB } from './lib/db';
import { CloudLightning } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        const sessionStr = sessionStorage.getItem('cg_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          setUser(session);
        }
      } catch (err) {
        console.error('Failed to initialize DB:', err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse">
          <CloudLightning size={48} className="text-teal-400 mb-4" />
          <p className="text-slate-400 text-sm font-medium tracking-widest">INITIALIZING</p>
        </div>
      </div>
    );
  }

  const handleLogin = (newUser: any) => {
    setUser(newUser);
    sessionStorage.setItem('cg_session', JSON.stringify({
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    }));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('cg_session');
  };

  return user ? <Dashboard user={user} onLogout={handleLogout} /> : <Auth onLogin={handleLogin} />;
}
