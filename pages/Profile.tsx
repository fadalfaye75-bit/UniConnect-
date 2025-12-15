import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';
import { User, Lock, Save, Loader2, Shield, Mail, Briefcase, GraduationCap } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword.length < 6) {
      addNotification({ title: 'Erreur', message: 'Le mot de passe doit contenir au moins 6 caractères.', type: 'alert' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      addNotification({ title: 'Erreur', message: 'Les mots de passe ne correspondent pas.', type: 'alert' });
      return;
    }

    // CONFIRMATION
    if (!window.confirm('Êtes-vous sûr de vouloir modifier votre mot de passe ?')) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) throw error;

      addNotification({ title: 'Succès', message: 'Votre mot de passe a été mis à jour.', type: 'success' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Password update error:', error);
      
      // Gestion spécifique pour le cas où le mot de passe est identique à l'ancien
      if (error.message && (
          error.message.includes('different from the old password') || 
          error.message.includes('New password should be different')
      )) {
        addNotification({ 
          title: 'Mot de passe inchangé', 
          message: 'Le nouveau mot de passe ne peut pas être identique à votre mot de passe actuel.', 
          type: 'warning' 
        });
      } else {
        addNotification({ 
          title: 'Erreur', 
          message: error.message || 'Impossible de modifier le mot de passe.', 
          type: 'alert' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mon Profil</h2>
        <p className="text-sm text-gray-500 mt-1">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center text-center">
            <div className="relative">
              <img 
                src={user?.avatar} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover border-4 border-primary-100 dark:border-primary-900/50 mb-4"
              />
              <div className="absolute bottom-4 right-0 bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm text-gray-400">
                <User size={16} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h3>
            <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                user?.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' :
                user?.role === 'DELEGATE' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
            }`}>
              {user?.role === 'ADMIN' ? 'Administrateur' : user?.role === 'DELEGATE' ? 'Délégué' : 'Étudiant'}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase">Email</p>
                <p className="text-sm font-semibold truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <GraduationCap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase">Classe</p>
                <p className="text-sm font-semibold truncate">{user?.className}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Briefcase size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase">Statut</p>
                <p className="text-sm font-semibold truncate">Actif</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Password Form */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
               <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                 <Shield size={20} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sécurité</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Modification du mot de passe</p>
               </div>
            </div>
            
            <div className="p-6 md:p-8">
              <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 mb-6 flex items-start gap-3">
                  <Lock className="flex-shrink-0 mt-0.5" size={16} />
                  <p>Pour votre sécurité, choisissez un mot de passe fort d'au moins 6 caractères.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nouveau mot de passe</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={passwords.newPassword}
                    onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Confirmer le mot de passe</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={passwords.confirmPassword}
                    onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading || !passwords.newPassword}
                    className="flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}