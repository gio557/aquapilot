// Dati demo iniziali del prototipo.
// Nella versione finale queste informazioni vivranno sul database Supabase.

export const USERS = [
  {
    id: 'mgr-1',
    name: 'Laura Bianchi',
    role: 'manager',
    department: 'Produzione',
    email: 'laura.bianchi@azienda.it',
  },
  {
    id: 'mgr-2',
    name: 'Marco Verdi',
    role: 'manager',
    department: 'Logistica',
    email: 'marco.verdi@azienda.it',
  },
  {
    id: 'emp-1',
    name: 'Giulia Rossi',
    role: 'employee',
    department: 'Produzione',
    managerId: 'mgr-1',
    email: 'giulia.rossi@azienda.it',
  },
  {
    id: 'emp-2',
    name: 'Antonio Russo',
    role: 'employee',
    department: 'Produzione',
    managerId: 'mgr-1',
    email: 'antonio.russo@azienda.it',
  },
  {
    id: 'emp-3',
    name: 'Sara Colombo',
    role: 'employee',
    department: 'Logistica',
    managerId: 'mgr-2',
    email: 'sara.colombo@azienda.it',
  },
]

const today = new Date()
const iso = (offsetDays) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const REQUESTS = [
  {
    id: 'req-1001',
    employeeId: 'emp-1',
    date: iso(1),
    hours: 2,
    reason: 'Completamento ordine urgente cliente Alfa',
    status: 'pending',
    managerId: 'mgr-1',
    decisionNote: '',
    decidedBy: null,
    createdAt: new Date(today.getTime() - 3600_000).toISOString(),
    decidedAt: null,
  },
  {
    id: 'req-1002',
    employeeId: 'emp-2',
    date: iso(2),
    hours: 3,
    reason: 'Manutenzione straordinaria linea 2',
    status: 'pending',
    managerId: 'mgr-1',
    decisionNote: '',
    decidedBy: null,
    createdAt: new Date(today.getTime() - 7200_000).toISOString(),
    decidedAt: null,
  },
  {
    id: 'req-1003',
    employeeId: 'emp-1',
    date: iso(-3),
    hours: 1.5,
    reason: 'Inventario di fine mese',
    status: 'approved',
    managerId: 'mgr-1',
    decisionNote: 'Approvato, ricordati di timbrare.',
    decidedBy: 'mgr-1',
    createdAt: new Date(today.getTime() - 4 * 86400_000).toISOString(),
    decidedAt: new Date(today.getTime() - 3 * 86400_000).toISOString(),
  },
  {
    id: 'req-1004',
    employeeId: 'emp-3',
    date: iso(-1),
    hours: 4,
    reason: 'Carico camion serale non previsto',
    status: 'rejected',
    managerId: 'mgr-2',
    decisionNote: 'Coperto da turno notturno, non necessario.',
    decidedBy: 'mgr-2',
    createdAt: new Date(today.getTime() - 2 * 86400_000).toISOString(),
    decidedAt: new Date(today.getTime() - 86400_000).toISOString(),
  },
]
