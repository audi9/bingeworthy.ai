
import { useState } from 'react';
import axios from 'axios';
export default function AdminWidget() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  async function login(e) {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE}/admin/token`, params);
      const tk = res.data.access_token;
      localStorage.setItem('bw_token', tk);
      alert('Logged in as admin');
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('Login failed');
    }
  }
  async function clearCache() {
    try {
      const tk = localStorage.getItem('bw_token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE}/admin/clear_cache`, {}, { headers: { Authorization: `Bearer ${tk}` } });
      alert('Cache cleared');
    } catch (e) {
      console.error(e);
      alert('Failed to clear cache (login required)');
    }
  }
  return (<div className="relative"><button onClick={() => setOpen(!open)} className="bg-white/10 px-4 py-2 rounded">Admin</button>{open && (<div className="absolute right-0 mt-2 p-4 w-96 bg-gray-900 rounded shadow-lg"><form onSubmit={login}><input className="w-full p-2 mb-2 rounded bg-gray-800" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} /><input className="w-full p-2 mb-2 rounded bg-gray-800" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><div className="flex gap-2"><button className="px-3 py-1 rounded bg-accent-1" type="submit">Login</button><button className="px-3 py-1 rounded bg-gray-700" type="button" onClick={clearCache}>Clear Cache</button></div></form></div>)}</div>);
}
