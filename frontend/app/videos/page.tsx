'use client';

// ============================================================
// app/videos/page.tsx
// Video Catalog Page with Search, Category Filter & Pagination
// ============================================================

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import VideoCard from '@/components/video/VideoCard';
import Button from '@/components/ui/Button';
import { getVideos } from '@/lib/videoApi';
import type { Video, VideoPaginationData } from '@/types';

const CATEGORIES = [
  'All',
  'Movies',
  'Music',
  'Technology',
  'Programming',
  'Gaming',
  'Education',
  'Other',
];

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [pagination, setPagination] = useState<VideoPaginationData>({
    videos: [],
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [, startTransition] = useTransition();

  // ─── Debounce Search Input ──────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1); // Reset to page 1 on new search query
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Fetch Videos from Backend ──────────────────────────────
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const response = await getVideos({
        page: currentPage,
        limit: 12,
        search: debouncedSearch || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      });

      if (response.success && response.data) {
        startTransition(() => {
          setVideos(response.data?.videos || []);
          setPagination(
            response.data || {
              videos: [],
              page: 1,
              limit: 12,
              total: 0,
              totalPages: 1,
            }
          );
        });
      } else {
        setIsError(true);
        setErrorMessage(response.message || 'Failed to load videos.');
      }
    } catch {
      setIsError(true);
      setErrorMessage('Could not connect to the video streaming service.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ─── Category Selection Handler ─────────────────────────────
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to page 1
  };

  // ─── Pagination Controls ────────────────────────────────────
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header & Search Bar Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Video Catalog
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Explore HD videos, tutorials, tech talks, and entertainment.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 sm:w-96">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              id="catalog-search-input"
              type="text"
              placeholder="Search videos by title or topic…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-10 pr-9 py-2.5 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                id={`cat-btn-${category.toLowerCase()}`}
                onClick={() => handleCategorySelect(category)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                  isSelected
                    ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-md shadow-[var(--brand)]/20 scale-[1.02]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--brand)]/40'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        {isLoading ? (
          /* Loading State */
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 border-4 border-[var(--border-color)] border-t-[var(--brand)] rounded-full animate-spin" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">Loading videos…</p>
          </div>
        ) : isError ? (
          /* Error State */
          <div className="glass rounded-2xl p-10 border border-red-500/30 text-center max-w-lg mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)] mb-2">
              Failed to load videos
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{errorMessage}</p>
            <Button variant="primary" onClick={fetchVideos}>
              Try Again
            </Button>
          </div>
        ) : videos.length === 0 ? (
          /* Empty States */
          <div className="glass rounded-2xl p-12 border border-[var(--border-color)] text-center max-w-lg mx-auto my-12">
            <span className="text-4xl mb-4 block">🔍</span>
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)] mb-2">
              {debouncedSearch
                ? `No results found for "${debouncedSearch}"`
                : selectedCategory !== 'All'
                ? `No videos found in ${selectedCategory}`
                : 'No videos found.'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {debouncedSearch
                ? 'Try another search term or clear the filter.'
                : 'Be the first creator to share your content with the community.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {debouncedSearch || selectedCategory !== 'All' ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Link href="/videos/upload">
                  <Button variant="primary">Upload Video</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Video Grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 border-t border-[var(--border-color)]">
                <Button
                  id="catalog-prev-page"
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                >
                  ← Previous
                </Button>

                <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                  Page <span className="text-[var(--text-primary)]">{currentPage}</span> of{' '}
                  <span className="text-[var(--text-primary)]">{pagination.totalPages}</span>
                </span>

                <Button
                  id="catalog-next-page"
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= pagination.totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
