import React from 'react';
import { Calendar, Building2, Award, Users, Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { normalizeRole, roleConfig } from '../../components/dashboard/roleConfig';

const badgeStyles = {
  super_admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  organizer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  event_coordinator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  judge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  house_captain: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  participant: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

export default function CompetitionCardV2({ comp, role, membership_role, onClick }) {
  const roleKey = normalizeRole(membership_role || role);
  const config = roleConfig[roleKey] ?? roleConfig.viewer;
  const Icon = roleKey === 'participant' ? Users : Trophy;

  return (
    <Card
      key={comp._id}
      onClick={() => onClick(comp._id)}
      className="card-premium cursor-pointer transition-all duration-200 hover:shadow-elevated"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-11 w-11 rounded-[12px] flex items-center justify-center"
            style={{ backgroundColor: roleKey === 'participant' ? 'var(--accent-blue-tint)' : 'var(--accent-amber-tint)', color: roleKey === 'participant' ? 'var(--secondary)' : 'var(--primary)' }}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge className={badgeStyles[roleKey] || badgeStyles.participant}>{config.title}</Badge>
        </div>
        <CardTitle className="text-lg" style={{ color: 'var(--card-foreground)' }}>{comp.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {comp.year || new Date().getFullYear()}
          </span>
          <Badge variant="outline">{comp.type?.replace('_', ' ')}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}