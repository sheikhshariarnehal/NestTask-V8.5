import { useState, useEffect, useMemo } from 'react';
import { SearchBar } from '../components/search/SearchBar';
import { TaskList } from '../components/TaskList';
import type { Task } from '../types';

interface SearchPageProps {
  tasks: Task[];
}

export function SearchPage({ tasks }: SearchPageProps) {
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Optimized search function with memoization
  const performSearch = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return [];
    }
    
    console.log(`Searching for "${normalizedQuery}" in ${tasks.length} tasks`);
    
    return tasks.filter(task => 
      task.name.toLowerCase().includes(normalizedQuery) ||
      task.description.toLowerCase().includes(normalizedQuery) ||
      task.category.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery, tasks]);
  
  // Update results when search query or tasks change
  useEffect(() => {
    if (searchQuery) {
      setSearchResults(performSearch);
      setHasSearched(true);
    }
  }, [searchQuery, performSearch]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search Tasks</h1>
      
      <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />
      
      {hasSearched ? (
        searchResults.length > 0 ? (
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Found {searchResults.length} {searchResults.length === 1 ? 'task' : 'tasks'} matching "{searchQuery}"
            </div>
            <TaskList tasks={searchResults} />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No tasks found matching your search
          </div>
        )
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Enter a search term to find tasks
        </div>
      )}
    </div>
  );
}