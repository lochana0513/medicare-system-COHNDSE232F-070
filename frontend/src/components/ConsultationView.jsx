import DataTable from './DataTable.jsx';
import { InfoList } from './common.jsx';
import { formatDate } from '../utils/format.js';

const itemColumns = [
  { key: 'medicineName', label: 'Medicine', render: (r) => <strong>{r.medicineName}</strong> },
  { key: 'dosage', label: 'Dosage' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'durationDays', label: 'Days', align: 'center' },
  { key: 'instructions', label: 'Instructions' },
];

export default function ConsultationView({ consultation }) {
  const c = consultation;
  return (
    <div className="stack">
      <InfoList items={[
        ['Date', formatDate(c.consultationDate)],
        ['Doctor', `${c.doctorName} (${c.specialization})`],
        ['Hospital', c.hospitalName],
        ['Symptoms', c.symptoms],
        ['Diagnosis', <strong key="d">{c.diagnosis}</strong>],
        ['Notes', c.notes],
        ['Follow-up', c.followUpDate ? formatDate(c.followUpDate) : 'Not required'],
      ]} />
      <h4 className="section-title">Prescription</h4>
      <DataTable columns={itemColumns} rows={c.items || []} rowKey="itemId" emptyText="No medicines prescribed" />
    </div>
  );
}
