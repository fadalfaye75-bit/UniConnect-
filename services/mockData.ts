import { ClassGroup } from '../types';

// Configuration statique des classes (utilisée pour les filtres et dropdowns)
export const CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'Licence 1 - Info', email: 'l1-info@univ.fr', studentCount: 120 },
  { id: 'c2', name: 'Licence 2 - Info', email: 'l2-info@univ.fr', studentCount: 85 },
  { id: 'c3', name: 'Master 1 - Droit', email: 'm1-droit@univ.fr', studentCount: 45 },
];

// Les autres données (Announcements, Exams, etc.) sont maintenant gérées directement par Supabase.
