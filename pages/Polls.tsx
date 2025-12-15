import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Plus, Trash2, X, Lock, Unlock, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Poll } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';

export default function Polls() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Creation form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  // 1. PERMISSIONS
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  // 2. FETCH DATA
  useEffect(() => {
    fetchPolls();
  }, [user, adminViewClass]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // 1. Get Polls
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      // 2. Get Options
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*');

      if (optionsError) throw optionsError;

      // 3. Get Votes (for counting and checking user vote)
      const { data: votesData, error: votesError } = await supabase
        .from('poll_votes')
        .select('*');

      if (votesError) throw votesError;

      // Process Data
      const formattedPolls: Poll[] = (pollsData || []).map(poll => {
        // Filter options for this poll
        const pollOptions = (optionsData || []).filter(opt => opt.poll_id === poll.id);
        
        // Filter votes for this poll
        const pollVotes = (votesData || []).filter(v => v.poll_id === poll.id);
        
        // Check if current user voted
        const userVote = pollVotes.find(v => v.user_id === user?.id);

        // Map options with vote counts
        const optionsWithCounts = pollOptions.map(opt => ({
          id: opt.id,
          label: opt.label,
          votes: pollVotes.filter(v => v.option_id === opt.id).length
        }));

        return {
          id: poll.id,
          question: poll.question,
          options: optionsWithCounts,
          className: poll.class_name,
          isActive: poll.is_active,
          hasVoted: !!userVote,
          userVoteOptionId: userVote?.option_id,
          totalVotes: pollVotes.length
        };
      });

      setPolls(formattedPolls);

    } catch (error) {
      console.error('Error fetching polls:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de charger les sondages.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  // 3. FILTERING
  const displayedPolls = useMemo(() => {
    return polls.filter(poll => {
      if (user?.role === UserRole.ADMIN) {
        return adminViewClass ? poll.className === adminViewClass : true;
      }
      return poll.className === user?.className;
    });
  }, [user, adminViewClass, polls]);

  // 4. ACTIONS

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      // Optimistic UI Update (optional, but sticking to refetch for accuracy)
      
      // Upsert vote: Requires a unique constraint on (poll_id, user_id) in DB
      const { error } = await supabase
        .from('poll_votes')
        .upsert({ 
          poll_id: pollId, 
          option_id: optionId, 
          user_id: user?.id 
        }, { onConflict: 'poll_id, user_id' });

      if (error) throw error;

      addNotification({ title: 'A voté !', message: 'Votre choix a été enregistré.', type: 'success' });
      fetchPolls(); // Refresh to show updated counts
    } catch (error) {
      console.error(error);
      addNotification({ title: 'Erreur', message: 'Impossible de voter.', type: 'alert' });
    }
  };

  const handleToggleStatus = async (poll: Poll) => {
    try {
      const newStatus = !poll.isActive;
      const { error } = await supabase
        .from('polls')
        .update({ is_active: newStatus })
        .eq('id', poll.id);

      if (error) throw error;

      setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, isActive: newStatus } : p));
      addNotification({ 
        title: newStatus ? 'Sondage ouvert' : 'Sondage clôturé', 
        message: newStatus ? 'Les votes sont à nouveau possibles.' : 'Les votes sont suspendus.', 
        type: newStatus ? 'success' : 'warning' 
      });
    } catch (error) {
       console.error(error);
       addNotification({ title: 'Erreur', message: 'Impossible de changer le statut.', type: 'alert' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce sondage définitivement ?')) return;

    try {
      const { error } = await supabase.from('polls').delete().eq('id', id);
      if (error) throw error;

      setPolls(prev => prev.filter(p => p.id !== id));
      addNotification({ title: 'Supprimé', message: 'Sondage retiré.', type: 'info' });
    } catch (error) {
      console.error(error);
      addNotification({ title: 'Erreur', message: 'Impossible de supprimer.', type: 'alert' });
    }
  };

  // Form Logic
  const handleAddOption = () => setOptions([...options, '']);
  const handleOptionChange = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx] = val;
    setOptions(newOpts);
  };
  const handleRemoveOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim() !== '');
    if (validOptions.length < 2) return alert('Il faut au moins 2 options');
    
    if (submitting) return;
    setSubmitting(true);

    try {
      const targetClass = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.className || 'Général');

      // 1. Create Poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert({
          question,
          class_name: targetClass,
          created_by: user?.id,
          is_active: true
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // 2. Create Options
      const optionsPayload = validOptions.map(label => ({
        poll_id: pollData.id,
        label
      }));

      const { error: optsError } = await supabase
        .from('poll_options')
        .insert(optionsPayload);

      if (optsError) throw optsError;

      setIsModalOpen(false);
      setQuestion('');
      setOptions(['', '']);
      addNotification({ title: 'Sondage créé', message: 'Les étudiants peuvent maintenant voter.', type: 'success' });
      fetchPolls();

    } catch (error: any) {
      console.error(error);
      addNotification({ title: 'Erreur', message: error.message || 'Impossible de créer le sondage.', type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const COLORS = ['#87CEEB', '#34d399', '#f472b6', '#a78bfa', '#fbbf24'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Consultations & Sondages</h2>
           <p className="text-sm text-gray-500">{user?.role === UserRole.ADMIN && adminViewClass ? adminViewClass : user?.className}</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouveau sondage</span>
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {displayedPolls.map(poll => (
          <div key={poll.id} className={`p-6 rounded-2xl shadow-sm border flex flex-col h-full transition-all ${!poll.isActive ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-90' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
            <div className="flex justify-between items-start mb-4">
               <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!poll.isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600 flex items-center gap-1">
                        <Lock size={10} /> Clôturé
                      </span>
                    )}
                    {poll.isActive && poll.hasVoted && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Voté
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{poll.question}</h3>
                  <p className="text-xs text-gray-500 mt-1">{poll.totalVotes} participations</p>
               </div>
               
               {canManage && (
                 <div className="flex items-center gap-1 ml-2">
                    <button 
                      onClick={() => handleToggleStatus(poll)}
                      className={`p-1.5 rounded-lg transition-colors ${poll.isActive ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={poll.isActive ? "Clôturer le sondage" : "Relancer le sondage"}
                    >
                      {poll.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button onClick={() => handleDelete(poll.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                 </div>
               )}
            </div>

            <div className="flex-1 mt-2">
              {/* If user has voted OR poll is closed, we show Results. However, we also allow changing vote if active. */}
              
              {(poll.hasVoted || !poll.isActive) ? (
                <div className="space-y-4">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={poll.options} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={20}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="label" type="category" width={100} tick={{fontSize: 11, fill: '#9ca3af'}} interval={0} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}} 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#fff' }} 
                          itemStyle={{ color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="votes" radius={[0, 4, 4, 0]} animationDuration={1000}>
                          {poll.options.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Change Vote Section */}
                  {poll.isActive && (
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1">
                        <RefreshCw size={12} /> Modifier mon choix
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {poll.options.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => handleVote(poll.id, opt.id)}
                            disabled={opt.id === poll.userVoteOptionId}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              opt.id === poll.userVoteOptionId
                                ? 'bg-primary-500 text-white border-primary-500 cursor-default shadow-sm'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-300 hover:text-primary-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!poll.isActive && (
                    <div className="text-center mt-2 text-xs text-gray-400 italic flex items-center justify-center gap-1">
                      <Lock size={12} /> Ce sondage est terminé.
                    </div>
                  )}
                </div>
              ) : (
                // Voting View (Initial)
                <div className="space-y-3">
                  {poll.options.map((option, idx) => (
                    <button
                      key={option.id}
                      onClick={() => handleVote(poll.id, option.id)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary-50 hover:border-primary-200 dark:hover:bg-primary-900/20 dark:hover:border-primary-700 transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center relative z-10">
                        <span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary-700 dark:group-hover:text-primary-300 text-sm">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {displayedPolls.length === 0 && (
           <div className="col-span-full text-center py-12 text-gray-400">
             <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
             Aucun sondage actif pour votre classe.
           </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer un Sondage">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Question</label>
            <input required type="text" value={question} onChange={e => setQuestion(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="Ex: Date du partiel ?" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Options</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input 
                    type="text" 
                    value={opt} 
                    onChange={e => handleOptionChange(i, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300 text-sm"
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(i)} className="text-gray-400 hover:text-red-500">
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={handleAddOption} className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <Plus size={14} /> Ajouter une option
            </button>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
             {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Lancer le sondage'}
          </button>
        </form>
      </Modal>
    </div>
  );
}