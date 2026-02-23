'use client';

import type { TimelineEvent } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  User,
  MessageSquare,
  Edit,
  ShieldQuestion,
  Briefcase,
  Users,
  Info,
} from 'lucide-react';

interface ReportTimelineProps {
  events: TimelineEvent[];
}

const ActorIcon = ({ actor }: { actor: TimelineEvent['actor'] }) => {
  switch (actor) {
    case 'Student':
      return <User className="h-4 w-4" />;
    case 'Faculty':
      return <Briefcase className="h-4 w-4" />;
    case 'Admin':
      return <Users className="h-4 w-4" />;
    case 'System':
      return <ShieldQuestion className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />; // Fallback icon
  }
};

export default function ReportTimeline({ events }: ReportTimelineProps) {
  if (!events || events.length === 0) {
    return <p className="text-muted-foreground">No timeline events available for this report.</p>;
  }

  const sortedEvents = [...events].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
  );

  return (
    <ScrollArea className="w-full whitespace-nowrap pb-4">
      <div className="relative flex items-center py-8 min-w-max">
        {' '}
        {/* Increased py for summary text space */}
        {/* Horizontal line - This will pass through the vertical center of this container */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
        {/* Timeline events */}
        <div className="relative flex justify-between w-full px-2">
          {sortedEvents.map((event) => (
            <div key={event.id} className="relative flex justify-center">
              {' '}
              {/* Wrapper for each event to position summary */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative z-10 h-10 w-10 rounded-full p-0 border-2 border-primary bg-background hover:bg-primary/10 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label={`View event: ${event.action} on ${format(parseISO(event.date), 'PPP')}`}
                  >
                    <ActorIcon actor={event.actor} />
                  </Button>
                </PopoverTrigger>
                {/* Summary text positioned above the trigger */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] px-1 py-0.5 text-center">
                  <p className="text-xs text-muted-foreground break-words leading-tight">
                    {event.action}
                  </p>
                </div>
                <PopoverContent className="w-80 z-20 shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary flex items-center">
                        <ActorIcon actor={event.actor} />{' '}
                        <span className="ml-2">{event.actor}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.date), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{event.action}</p>
                    {event.details && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                        {event.details}
                      </p>
                    )}
                    {event.statusChange && (
                      <p className="text-xs">
                        Status:{' '}
                        <Badge variant="outline">{event.statusChange.from || 'Initial'}</Badge>
                        <span className="mx-1">→</span>
                        <Badge
                          variant={
                            event.statusChange.to === 'Resolved' ||
                            event.statusChange.to === 'Closed'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {event.statusChange.to}
                        </Badge>
                      </p>
                    )}
                    {event.noteContent && (
                      <div className="mt-1">
                        <p className="text-xs font-semibold">Note:</p>
                        <p className="text-xs italic bg-secondary/30 p-2 rounded-md whitespace-pre-wrap">
                          "{event.noteContent}"
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
