export interface EventOccurrence {
  id: string;
  occurrenceStart: number;
  title: string;
  description: string | null;
  areaId: string | null;
  startsAt: number;
  endsAt: number;
  timezone: string;
  allDay: boolean;
  locationName: string | null;
  locationUrl: string | null;
  meetingUrl: string | null;
  travelMinutes: number | null;
  preparationMinutes: number | null;
  locked: boolean;
  recurring: boolean;
  version: number;
}

export interface EventInput {
  title: string;
  description?: string;
  areaId?: string;
  startsAt: number;
  endsAt: number;
  timezone: string;
  allDay?: boolean;
  recurrenceRule?: string;
  locationName?: string;
  locationUrl?: string;
  meetingUrl?: string;
  travelMinutes?: number;
  preparationMinutes?: number;
  locked?: boolean;
}
