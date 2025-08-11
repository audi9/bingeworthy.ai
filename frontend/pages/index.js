
import { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ResultCard from '../components/ResultCard';
import AdminWidget from '../components/AdminWidget';

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchRecommendations(); }, []);

  async function fetchRecommendations() {
    setLoading(true);
    try { const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}/recommendations`); setResults(res.data.results || []); } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchSuggestions(q) {
    setQuery(q);
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try { const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}/suggest`, { params: { query: q } }); setSuggestions(res.data.suggestions || []); } catch (e) { console.error(e); }
  }

  async function doSearch(q, p = 1) {
    setLoading(true);
    try { const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}/search`, { params: { query: q, page: p } }); setResults(res.data.results || []); setTotalPages(res.data.total_pages || 1); setPage(res.data.page || 1); setSuggestions([]); } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between"><h1 className="text-3xl font-bold">bingeworthy.ai</h1><AdminWidget /></header>
      <main className="mt-8">
        <SearchBar value={query} onChange={fetchSuggestions} suggestions={suggestions} onSearch={(q) => doSearch(q)} onSelectSuggestion={(s) => doSearch(s)} />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{loading ? <div>Loading...</div> : results.map((r) => <ResultCard key={r.id || r.title} movie={r} />)}</div>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button disabled={page<=1} onClick={() => doSearch(query, page-1)} className="px-3 py-1 rounded bg-gray-700">Previous</button>
          <div>Page {page} / {totalPages}</div>
          <button disabled={page>=totalPages} onClick={() => doSearch(query, page+1)} className="px-3 py-1 rounded bg-gray-700">Next</button>
        </div>
      </main>
    </div>
  );
}
