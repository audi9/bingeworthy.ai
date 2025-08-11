
import { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash.debounce';

/*
  SearchBar component with client-side debounce to reduce API calls.
  Props:
    - value: current search string
    - onChange: function to call with new string; debounced to avoid spamming server
    - suggestions: array of suggestion strings to show under the input
    - onSearch: function to perform full search (called on Enter or search button)
    - onSelectSuggestion: function when user clicks a suggestion
*/
export default function SearchBar({ value, onChange, suggestions = [], onSearch, onSelectSuggestion }) {
  const [local, setLocal] = useState(value || '');

  // useMemo to create a stable debounced function that calls onChange after 300ms of inactivity
  const debouncedOnChange = useMemo(() => debounce((val) => onChange(val), 300), [onChange]);

  useEffect(() => {
    // call debounced function whenever local text changes
    debouncedOnChange(local);
    // cancel debounce on unmount
    return () => debouncedOnChange.cancel();
  }, [local, debouncedOnChange]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(local) }}
          placeholder="Search (British Period Drama, actor name, Netflix)"
          className="flex-1 p-4 rounded-lg bg-gray-900 text-white placeholder-gray-400"
        />
        <button onClick={() => onSearch(local)} className="px-4 py-2 rounded bg-accent-1">Search</button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 bg-gray-800 mt-1 rounded-lg shadow-lg z-10 p-2">
          {suggestions.map((s, i) => (
            <div key={i} className="p-2 hover:bg-gray-700 rounded cursor-pointer" onClick={() => onSelectSuggestion(s)}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}
