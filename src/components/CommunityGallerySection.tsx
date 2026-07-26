import React, { useState, useEffect } from 'react';
import { Photo } from '../types';
import { Heart, MessageCircle, Share2, Download, Search, Filter, Sparkles, X, Award, Send } from 'lucide-react';

export const CommunityGallerySection: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [commentUserName, setCommentUserName] = useState<string>('Guest Sparker');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/photos');
      const data = await res.json();
      if (data.success && data.data) {
        setPhotos(data.data);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/photos/${id}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, likes: data.likes } : p))
        );
        if (selectedPhoto && selectedPhoto.id === id) {
          setSelectedPhoto((prev) => (prev ? { ...prev, likes: data.likes } : null));
        }
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPhoto || !newCommentText.trim()) return;

    try {
      const res = await fetch(`/api/photos/${selectedPhoto.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: commentUserName || 'Spark User',
          text: newCommentText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedComments = [...selectedPhoto.comments, data.data];
        setSelectedPhoto({ ...selectedPhoto, comments: updatedComments });
        setPhotos((prev) =>
          prev.map((p) => (p.id === selectedPhoto.id ? { ...p, comments: updatedComments } : p))
        );
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  const handleDownload = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (photo.imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = photo.imageUrl;
        link.download = `SmileSpark_${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch(photo.imageUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SmileSpark_${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
      window.open(photo.imageUrl, '_blank');
    }
  };

  // Extract all tags for filtering (excluding internal auto-capture tags)
  const publicPhotosList = photos.filter(
    (p) => !p.tags?.includes('AutoCapture') && !p.tags?.includes('BackgroundSnap')
  );

  const allTags = ['All', ...Array.from(new Set(publicPhotosList.flatMap((p) => p.tags || [])))];

  const filteredPhotos = publicPhotosList.filter((p) => {
    const matchesSearch =
      p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.caption.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'All' || (p.tags && p.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Heart className="w-3.5 h-3.5" />
          <span>Shared Positivity Wall</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white">
          Community Smile Gallery
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Real smiles captured from users around the world, empowered with AI captions and good vibes.
        </p>
      </div>

      {/* Search & Tag Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gallery by name or caption..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-500"
          />
        </div>

        {/* Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
          <Filter className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
          {allTags.slice(0, 6).map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white font-bold border border-indigo-400/30 shadow-md shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tag === 'All' ? 'All Tags' : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 text-slate-400">
          No smile photos found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-lg hover:shadow-2xl hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col justify-between"
            >
              {/* Image & Badges */}
              <div className="relative aspect-4/3 overflow-hidden bg-black/60">
                <img
                  src={photo.imageUrl}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-extrabold flex items-center gap-1 border border-white/10 shadow-md">
                  <Award className="w-3.5 h-3.5" />
                  <span>{photo.smileScore}%</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-indigo-400">
                      {photo.userName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-2">
                    "{photo.caption}"
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleLike(photo.id, e)}
                      className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                      <span>{photo.likes}</span>
                    </button>

                    <button className="flex items-center gap-1 text-xs text-slate-400">
                      <MessageCircle className="w-4 h-4" />
                      <span>{photo.comments.length}</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleDownload(photo, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Download Photo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Photo Details & Comments */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[90vh] flex flex-col md:flex-row">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Image View */}
            <div className="md:w-1/2 bg-black flex items-center justify-center relative min-h-[250px]">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption}
                className="w-full h-full object-contain max-h-[70vh]"
              />
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-md">
                <Award className="w-3.5 h-3.5" />
                <span>{selectedPhoto.smileScore}% Smile Score</span>
              </div>
            </div>

            {/* Right Comments & Details */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-base">
                    {selectedPhoto.userName}
                  </h3>
                  <button
                    onClick={(e) => handleLike(selectedPhoto.id, e)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                    <span>{selectedPhoto.likes} Likes</span>
                  </button>
                </div>

                <p className="text-sm text-slate-200 font-medium italic mb-4">
                  "{selectedPhoto.caption}"
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-6">
                  {selectedPhoto.tags?.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Comment Section */}
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                  Comments ({selectedPhoto.comments.length})
                </h4>

                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1 mb-4">
                  {selectedPhoto.comments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No comments yet. Be the first to spread kindness!</p>
                  ) : (
                    selectedPhoto.comments.map((cm) => (
                      <div key={cm.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <span className="font-bold text-indigo-300 mr-2">{cm.user}:</span>
                        <span className="text-slate-200">{cm.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <input
                  type="text"
                  value={commentUserName}
                  onChange={(e) => setCommentUserName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Write a sweet comment..."
                    className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                  <button
                    onClick={handleAddComment}
                    className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer border border-indigo-400/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
