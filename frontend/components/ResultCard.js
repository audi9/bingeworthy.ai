
export default function ResultCard({ movie }) {
  return (
    <div className="bg-gradient-to-t from-gray-900 to-gray-800 rounded-2xl p-4 shadow-lg hover:scale-105 transition-transform">
      <div className="h-64 w-full mb-4 rounded overflow-hidden bg-gray-700 flex items-center justify-center">
        {movie.poster ? <img src={movie.poster} alt={movie.title} className="h-full object-cover" /> : <div className="text-gray-400">No Image</div>}
      </div>
      <h3 className="text-lg font-semibold">{movie.title} {movie.year ? `({movie.year})` : ''}</h3>
      <p className="text-sm text-gray-300 mt-2 line-clamp-3">{movie.summary}</p>
      <div className="flex items-center justify-between mt-3">
        <div><div className="text-xs text-gray-400">IMDb</div><div className="font-bold">{movie.imdb_rating || 'N/A'}</div></div>
        <div><div className="text-xs text-gray-400">Rotten Tomatoes</div><div className="font-bold">{movie.rotten_tomatoes_rating || 'N/A'}</div></div>
        <div className="text-sm text-gray-300">{movie.platforms ? movie.platforms.join(', ') : 'Unknown'}</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 rounded bg-accent-1">Read Review</button>
        <a href={movie.provider_link || '#'} target="_blank" rel="noreferrer" className="px-3 py-1 rounded bg-accent-2 inline-block">Open on Platform</a>
      </div>
    </div>
  )
}
