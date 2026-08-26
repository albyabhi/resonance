import React from 'react';
import { Calendar, Building2, Award, Users, Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const roleConfig = {
  admin: {
    icon: Building2,
    iconTileClass: 'icon-tile-amber',
    badgeVariant: 'success',
    badgeLabel: 'Admin',
    headingIcon: Trophy,
  },
  participant: {
    icon: Users,
    iconTileClass: 'icon-tile-blue',
    badgeVariant: 'outline',
    badgeLabel: 'Participant',
    headingIcon: Award,
  },
};

export default function CompetitionCardV2({ comp, role, onClick }) {
  const config = roleConfig[role] || roleConfig.participant;
  const Icon = config.icon;

  return (
    <Card
      key={comp._id}
      onClick={() => onClick(comp._id)}
      className="card-premium cursor-pointer transition-all duration-200 hover:shadow-elevated"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`${config.iconTileClass} h-11 w-11 rounded-[12px] flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant={config.badgeVariant}>{config.badgeLabel}</Badge>
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