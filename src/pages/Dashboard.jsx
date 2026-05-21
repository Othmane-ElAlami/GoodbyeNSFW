import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaReddit, FaSearch, FaSpinner, FaCheck, FaSignOutAlt } from 'react-icons/fa';
import SubredditCard from '../components/SubredditCard';
import LoadingState from '../components/LoadingState';
import ConfirmModal from '../components/ConfirmModal';
import ResultsPanel from '../components/ResultsPanel';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToKeep, setSelectedToKeep] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreTotal, setRestoreTotal] = useState(0);
  const [restoreResults, setRestoreResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user info
      const meRes = await fetch('https://www.reddit.com/api/me.json');
      if (meRes.status === 429) throw new Error('Rate limited by Reddit. Please wait a minute.');
      if (!meRes.ok) throw new Error('Not logged into Reddit');
      const meData = await meRes.json();
      setUser({
        name: meData.data.name,
        icon_img: meData.data.icon_img?.split('?')[0] || '',
        total_karma: meData.data.link_karma + meData.data.comment_karma
      });

      // Fetch subscribed subreddits
      let allSubs = [];
      let after = null;
      let pages = 0;
      do {
        const url = `https://www.reddit.com/subreddits/mine/subscriber.json?limit=100${after ? `&after=` + after : ''}`;
        const res = await fetch(url);
        if (res.status === 429) throw new Error('Rate limited by Reddit. Please wait a minute.');
        if (!res.ok) throw new Error('Failed to fetch subreddits');
        const json = await res.json();
        if (!json || !json.data || !json.data.children) break;
        
        // Expose raw data to window console for debugging
        if (typeof window !== 'undefined') {
          window.lastFetchedChildren = [
            ...(window.lastFetchedChildren || []),
            ...json.data.children.map(c => c.data)
          ];
        }

        const pageSubs = json.data.children.map(child => {
          const t = child.data;
          return {
            name: t.display_name,
            fullName: t.name,
            title: t.title || t.display_name,
            description: t.public_description || t.description || '',
            icon: t.icon_img || (t.community_icon ? t.community_icon.split('?')[0] : ''),
            headerImg: t.header_img || (t.banner_background_image ? t.banner_background_image.split('?')[0] : ''),
            subscribers: t.subreddit_type === 'user' || t.display_name?.startsWith('u_')
              ? (t.accounts_active || t.subscribers || 0)
              : (t.subscribers || 0),
            nsfw: t.over18 || false,
            url: t.url,
            created: t.created_utc,
            _raw: t
          };
        });
        allSubs.push(...pageSubs);
        after = json.data.after;
        pages++;
        if (after && pages < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } while (after && pages < 30);

      const sfw = allSubs.filter(sub => !sub.nsfw);
      const nsfw = allSubs.filter(sub => sub.nsfw);

      setData({
        total: allSubs.length,
        sfwCount: sfw.length,
        nsfwCount: nsfw.length,
        sfw,
        nsfw
      });
      setSelectedToKeep(new Set());
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message !== 'Rate limited by Reddit. Please wait a minute.') {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => navigate('/');

  const handleDownloadBackup = () => {
    const toRemove = data.nsfw.filter(sub => !selectedToKeep.has(sub.fullName));
    const backup = {
      exportedAt: new Date().toISOString(),
      subreddits: toRemove.map(s => {
        const isUser = s.name.startsWith("u_") || s.name.startsWith("u/");
        return {
          name: s.name,
          displayName: isUser ? `u/${s.name.replace(/^u[_/]/, '')}` : `r/${s.name}`,
          isUser: isUser,
          subscribers: s.subscribers,
          url: isUser
            ? `https://www.reddit.com/user/${s.name.replace(/^u[_/]/, '')}/`
            : `https://www.reddit.com/r/${s.name}/`
        };
      })
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reddit-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please select a valid JSON backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.subreddits || !Array.isArray(json.subreddits)) {
          throw new Error('Invalid backup file format');
        }
        await processImport(json.subreddits);
      } catch (err) {
        setError('Failed to parse backup file: ' + err.message);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const processImport = async (subsToRestore) => {
    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreTotal(subsToRestore.length);
    const resultsList = [];
    
    try {
      const meRes = await fetch('https://www.reddit.com/api/me.json');
      const meJson = await meRes.json();
      const modhash = meJson.data.modhash;

      for (let i = 0; i < subsToRestore.length; i++) {
        const sub = subsToRestore[i];
        try {
          const bodyParams = new URLSearchParams({
            action: 'sub',
            sr_name: sub.isUser ? `u_${sub.name.replace(/^u[_/]/, '')}` : sub.name,
            uh: modhash
          });
          const res = await fetch('https://www.reddit.com/api/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Modhash': modhash
            },
            body: bodyParams.toString()
          });
          
          if (res.ok) {
            resultsList.push({ name: sub.name, fullName: sub.name, success: true });
          } else {
            resultsList.push({ name: sub.name, fullName: sub.name, success: false, error: `HTTP ${res.status}` });
          }
        } catch (e) {
          resultsList.push({ name: sub.name, fullName: sub.name, success: false, error: e.message });
        }
        
        setRestoreProgress(i + 1);
        if (i < subsToRestore.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      const succeeded = resultsList.filter(r => r.success).length;
      const failed = resultsList.filter(r => !r.success).length;

      setRestoreResults({
        total: subsToRestore.length,
        succeeded,
        failed,
        results: resultsList
      });
      fetchData();
    } catch (e) {
      console.error(e);
      setError(`Restore operation failed: ${e.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleKeep = (fullName) => {
    const next = new Set(selectedToKeep);
    if (next.has(fullName)) {
      next.delete(fullName);
    } else {
      next.add(fullName);
    }
    setSelectedToKeep(next);
  };

  // Fix 2: Swap handlers to fix the inverted Select All / Deselect All behavior!
  // Select All should mark ALL cards for removal (set all to true, i.e. keep set = empty)
  const handleSelectAll = () => {
    setSelectedToKeep(new Set());
  };

  // Deselect All should unmark ALL cards (set all to false, i.e. keep set = all items)
  const handleDeselectAll = () => {
    if (!data) return;
    const allIds = data.nsfw.map(s => s.fullName);
    setSelectedToKeep(new Set(allIds));
  };

  const handleUnsubscribe = async () => {
    setShowConfirm(false);
    setIsCleaning(true);
    setCleanProgress(0);
    const toRemove = data.nsfw.filter(sub => !selectedToKeep.has(sub.fullName));

    try {
      const meRes = await fetch('https://www.reddit.com/api/me.json');
      const meJson = await meRes.json();
      const modhash = meJson.data.modhash;
      const resultsList = [];

      for (let i = 0; i < toRemove.length; i++) {
        const sub = toRemove[i];
        try {
          const bodyParams = new URLSearchParams({
            action: 'unsub',
            sr: sub.fullName,
            uh: modhash
          });
          const unsubRes = await fetch('https://www.reddit.com/api/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Modhash': modhash
            },
            body: bodyParams.toString()
          });
          let ok = unsubRes.ok;
          if (unsubRes.status === 404) {
            // Retry/fallback
            const fallbackRes = await fetch('https://www.reddit.com/api/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Modhash': modhash
              },
              body: bodyParams.toString()
            });
            ok = fallbackRes.ok;
          }
          if (ok) {
            resultsList.push({ name: sub.name, fullName: sub.fullName, success: true });
          } else {
            resultsList.push({ name: sub.name, fullName: sub.fullName, success: false, error: `HTTP ${unsubRes.status}` });
          }
        } catch (e) {
          resultsList.push({ name: sub.name, fullName: sub.fullName, success: false, error: e.message });
        }
        setCleanProgress(Math.round(((i + 1) / toRemove.length) * 100));
        if (i < toRemove.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      const succeeded = resultsList.filter(r => r.success).length;
      const failed = resultsList.filter(r => !r.success).length;

      setResults({
        total: toRemove.length,
        succeeded,
        failed,
        results: resultsList
      });

      const succeededFullNames = new Set(resultsList.filter(r => r.success).map(r => r.fullName));
      setData(prev => ({
        ...prev,
        nsfw: prev.nsfw.filter(sub => !succeededFullNames.has(sub.fullName)),
        total: prev.total - succeeded,
        nsfwCount: prev.nsfwCount - succeeded
      }));

      setToastMessage(`Done! ${succeeded} subreddits removed.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error(e);
      setError(`Unsubscribe operation failed: ${e.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="flat-card p-8 max-w-md w-full border-[#ea0027]">
          <h2 className="text-xl font-bold text-[#d7dadc] mb-4">Error loading data</h2>
          <p className="text-[#818384] mb-6">{error}</p>
          <button onClick={handleExit} className="btn-orange w-full py-3">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const filteredNsfw = data.nsfw.filter(sub =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subredditsToRemove = data.nsfw.filter(sub => !selectedToKeep.has(sub.fullName));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-50 mt-4 bg-[var(--color-reddit-green)] text-[var(--color-reddit-dark)] px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
          >
            <FaCheck /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[var(--color-reddit-dark)] border-b border-[#343536] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaReddit className="text-3xl text-[var(--color-reddit-orange)]" />
          <span className="text-lg font-bold text-[#d7dadc] hidden sm:block">
            Subreddit Cleaner
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              {user.icon_img ? (
                <img src={user.icon_img} alt="avatar" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#343536]" />
              )}
              <span className="text-sm font-medium text-[#d7dadc]">{user.name}</span>
            </div>
          )}
          <button onClick={handleExit} className="text-[#818384] hover:text-[#d7dadc] p-2 transition-colors" title="Exit">
            <FaSignOutAlt />
          </button>
        </div>
      </header>

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleImportBackup} 
        style={{ display: 'none' }} 
      />

      {/* Main Container */}
      <main className="flex-1 dashboard-shell pt-24">
        {/* Stats Section */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flat-card px-4 py-2 flex items-center gap-2">
            <span className="text-[#818384] text-xs uppercase font-bold">Total Subscribed</span>
            <span className="text-[#d7dadc] font-bold">{data.total}</span>
          </div>
          <div className="flat-card px-4 py-2 flex items-center gap-2">
            <span className="text-[#818384] text-xs uppercase font-bold">NSFW Found</span>
            <span className="text-[#ea0027] font-bold">{data.nsfwCount}</span>
          </div>
        </div>

        {/* Results Panel */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6"
            >
              <ResultsPanel results={results} onBack={() => setResults(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restore Results Panel */}
        <AnimatePresence>
          {restoreResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6"
            >
              <ResultsPanel results={restoreResults} onBack={() => setRestoreResults(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restore Progress Modal */}
        {isRestoring && (
          <div className="modal-overlay">
            <div className="flat-card p-8 max-w-md w-full text-center">
              <FaSpinner className="text-4xl text-[var(--color-reddit-orange)] animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#d7dadc] mb-2">Restoring your subscriptions...</h3>
              <p className="text-[#818384] mb-6">
                ████████░░░░░░░ {restoreProgress} / {restoreTotal}
              </p>
              <div className="h-2 w-full bg-[#343536] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--color-reddit-orange)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${restoreTotal > 0 ? (restoreProgress / restoreTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Cleaning Progress Modal */}
        {isCleaning && (
          <div className="modal-overlay">
            <div className="flat-card p-8 max-w-md w-full text-center">
              <FaSpinner className="text-4xl text-[var(--color-reddit-orange)] animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#d7dadc] mb-2">Cleaning up...</h3>
              <p className="text-[#818384] mb-6">Removing {subredditsToRemove.length} subreddits</p>
              <div className="h-2 w-full bg-[#343536] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--color-reddit-orange)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${cleanProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#818384] mt-2">{cleanProgress}% complete</p>
            </div>
          </div>
        )}

        {/* Subreddit Grid / Empty State */}
        {data.nsfwCount === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-[#d7dadc] mb-2">You're all clean!</h2>
            <p className="text-[#818384]">We didn't find any NSFW subreddits in your account.</p>
          </div>
        ) : (
          <div className="pb-24">
            <div className="top-bar">
              <div className="search-bar">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#818384]" />
                <input
                  type="text"
                  placeholder="Search NSFW subs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input bg-[#1a1a1b] border border-[#343536] rounded-full pl-10 pr-4 text-[#d7dadc] focus:outline-none focus:border-[#d7dadc] transition-colors"
                />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-outlined import-btn"
              >
                Import Backup
              </button>
            </div>
            <div className="card-grid">
              {filteredNsfw.map(sub => (
                <SubredditCard
                  key={sub.fullName}
                  subreddit={sub}
                  isKept={selectedToKeep.has(sub.fullName)}
                  onToggle={() => toggleKeep(sub.fullName)}
                />
              ))}
              {filteredNsfw.length === 0 && (
                <div className="col-span-full text-center py-12 text-[#818384]">
                  No subreddits match your search.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Bar */}
      {data.nsfwCount > 0 && (
        <div className="bottom-bar">
          <div className="flex gap-2">
            <button onClick={handleSelectAll} className="btn-text text-sm">
              Select All
            </button>
            <button onClick={handleDeselectAll} className="btn-text text-sm">
              Deselect All
            </button>
          </div>
          <div className="text-sm text-[#d7dadc] font-medium text-center hidden sm:block">
            {subredditsToRemove.length} of {data.nsfwCount} will be removed
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={subredditsToRemove.length === 0}
            className="btn-orange text-sm"
          >
            Unsubscribe
          </button>
        </div>
      )}

      {/* Confirm Unsubscribe Modal */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            count={subredditsToRemove.length}
            subreddits={subredditsToRemove}
            onConfirm={handleUnsubscribe}
            onCancel={() => setShowConfirm(false)}
            onDownloadBackup={handleDownloadBackup}
          />
        )}
      </AnimatePresence>
    </div>
  );
}