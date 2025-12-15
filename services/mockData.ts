import { User, UserRole, Announcement, Exam, ScheduleFile, MeetLink, Poll, ClassGroup } from '../types';

export const CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'Licence 1 - Info', email: 'l1-info@univ.fr', studentCount: 120 },
  { id: 'c2', name: 'Licence 2 - Info', email: 'l2-info@univ.fr', studentCount: 85 },
  { id: 'c3', name: 'Master 1 - Droit', email: 'm1-droit@univ.fr', studentCount: 45 },
];

export const CURRENT_USER_MOCK: User = {
  id: 'u1',
  name: 'Alexandre Dupont',
  email: 'alex.dup@etu.univ.fr',
  role: UserRole.DELEGATE, // Change to TEST roles
  className: 'Licence 2 - Info',
  avatar: 'https://picsum.photos/200/200'
};

export const ANNOUNCEMENTS_MOCK: Announcement[] = [
  {
    id: 'a1',
    title: 'Annulation du cours de Java',
    content: 'Le cours de M. Martin prévu ce mardi à 14h est annulé pour raisons personnelles. Rattrapage prévu le jeudi.',
    author: 'Admin Scolarité',
    date: '2023-10-25T09:00:00',
    className: 'Licence 2 - Info',
    isImportant: true
  },
  {
    id: 'a2',
    title: 'Soirée d\'intégration',
    content: 'N\'oubliez pas de vous inscrire pour la soirée BDE ce vendredi !',
    author: 'Délégué Classe',
    date: '2023-10-24T18:30:00',
    className: 'Licence 2 - Info'
  },
  {
    id: 'a3',
    title: 'Offre de stage',
    content: 'Une entreprise partenaire cherche des stagiaires en développement web.',
    author: 'Admin Relations',
    date: '2023-10-20T10:00:00',
    className: 'Master 1 - Droit' // Should be hidden for L2 Info
  }
];

export const EXAMS_MOCK: Exam[] = [
  {
    id: 'e1',
    subject: 'Algorithmique Avancée',
    date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    duration: '3h',
    room: 'Amphi B',
    notes: 'Documents autorisés',
    className: 'Licence 2 - Info'
  },
  {
    id: 'e2',
    subject: 'Bases de Données',
    date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    duration: '2h',
    room: 'Salle 204',
    notes: 'Calculatrice interdite',
    className: 'Licence 2 - Info'
  }
];

export const SCHEDULES_MOCK: ScheduleFile[] = [
  {
    id: 's1',
    version: 'V2',
    uploadDate: '2023-10-23',
    url: '#',
    className: 'Licence 2 - Info'
  }
];

export const MEET_LINKS_MOCK: MeetLink[] = [
  {
    id: 'm1',
    title: 'TD Anglais - Groupe A',
    platform: 'Google Meet',
    url: 'https://meet.google.com/abc-defg-hij',
    time: 'Mercredi 10h00',
    className: 'Licence 2 - Info'
  }
];

export const POLLS_MOCK: Poll[] = [
  {
    id: 'p1',
    question: 'Date préférée pour le rattrapage de Java ?',
    options: [
      { id: 'o1', label: 'Jeudi 16h', votes: 12 },
      { id: 'o2', label: 'Vendredi 8h', votes: 4 },
      { id: 'o3', label: 'Samedi 10h', votes: 1 }
    ],
    className: 'Licence 2 - Info',
    isActive: true,
    hasVoted: false,
    totalVotes: 17
  }
];