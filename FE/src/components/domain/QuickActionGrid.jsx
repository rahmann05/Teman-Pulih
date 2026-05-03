import React from 'react';
import { LuScanLine, LuPill, LuMessageCircle, LuUsers } from 'react-icons/lu';

const QuickActionGrid = () => {
  const actions = [
    { id: 'scan', label: 'Scan Resep', icon: LuScanLine },
    { id: 'meds', label: 'Jadwal Obat', icon: LuPill },
    { id: 'chat', label: 'Chat AI', icon: LuMessageCircle },
    { id: 'sync', label: 'Family Sync', icon: LuUsers },
  ];

  return (
    <div className="quick-actions-grid" data-testid="quick-action-grid">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.id} className="action-card">
            <Icon className="action-icon" />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionGrid;
