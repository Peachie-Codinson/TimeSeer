import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { fetchAreas } from "../areas/api";
import { createEvent, fetchCalendarRange, fetchEvent, moveOccurrence, updateEvent } from "./api";
import { EventDetailsPopover } from "./EventDetailsPopover";
import type { EventEditorInitial } from "./EventEditorModal";
import { EventEditorModal } from "./EventEditorModal";
import { QuickCreatePopover } from "./QuickCreatePopover";
import type { CalendarViewKey } from "./Toolbar";
import { Toolbar } from "./Toolbar";
import type { ToastState } from "./UndoToast";
import { UndoToast } from "./UndoToast";
import type { EventOccurrence } from "./types";

const DEFAULT_COLOR = "#64748b";
const VIEW_STORAGE_KEY = "planner:calendarView";
const DATE_STORAGE_KEY = "planner:calendarDate";

export interface CalendarViewHandle {
  gotoDate: (date: Date) => void;
}

export const CalendarView = forwardRef<CalendarViewHandle, { onDateChange?: (date: Date) => void }>(
  function CalendarView({ onDateChange }, ref) {
    const fcRef = useRef<FullCalendar | null>(null);
    const queryClient = useQueryClient();

    const [range, setRange] = useState<{ start: number; end: number } | null>(null);
    const [title, setTitle] = useState("");
    const [view, setView] = useState<CalendarViewKey>(
      () => (localStorage.getItem(VIEW_STORAGE_KEY) as CalendarViewKey | null) ?? "timeGridWeek",
    );
    const [search, setSearch] = useState("");
    const [quickCreateDraft, setQuickCreateDraft] = useState<{ start: number; end: number } | null>(null);
    const [detailsOccurrence, setDetailsOccurrence] = useState<EventOccurrence | null>(null);
    const [editorInitial, setEditorInitial] = useState<EventEditorInitial | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);

    const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
    const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

    const calendarQueryKey = ["calendar", range?.start, range?.end];
    const { data } = useQuery({
      queryKey: calendarQueryKey,
      queryFn: () => fetchCalendarRange(range!.start, range!.end),
      enabled: range !== null,
    });

    const refetchCalendar = () => queryClient.invalidateQueries({ queryKey: ["calendar"] });

    useImperativeHandle(ref, () => ({
      gotoDate: (date) => fcRef.current?.getApi().gotoDate(date),
    }));

    const occurrences = useMemo(() => {
      const all = data?.events ?? [];
      if (!search.trim()) return all;
      const q = search.trim().toLowerCase();
      return all.filter((e) => e.title.toLowerCase().includes(q));
    }, [data, search]);

    const fcEvents = useMemo(
      () =>
        occurrences.map((occ) => {
          const color = (occ.areaId && areaById.get(occ.areaId)?.color) || DEFAULT_COLOR;
          return {
            id: `${occ.id}:${occ.occurrenceStart}`,
            title: occ.title,
            start: new Date(occ.startsAt).toISOString(),
            end: new Date(occ.endsAt).toISOString(),
            allDay: occ.allDay,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { occurrence: occ },
          };
        }),
      [occurrences, areaById],
    );

    const findOccurrence = (arg: EventClickArg | EventDropArg | EventResizeDoneArg): EventOccurrence =>
      arg.event.extendedProps.occurrence as EventOccurrence;

    const handleMove = async (
      occ: EventOccurrence,
      newStart: number,
      newEnd: number,
      previousStart: number,
      previousEnd: number,
      revert: () => void,
    ) => {
      try {
        if (occ.recurring) {
          await moveOccurrence(occ.id, occ.occurrenceStart, newStart, newEnd);
        } else {
          const fresh = await fetchEvent(occ.id);
          await updateEvent(occ.id, { startsAt: newStart, endsAt: newEnd, expectedVersion: fresh.version });
        }
        refetchCalendar();
        setToast({
          message: `Moved "${occ.title}"`,
          onUndo: async () => {
            if (occ.recurring) {
              await moveOccurrence(occ.id, occ.occurrenceStart, previousStart, previousEnd);
            } else {
              const fresh = await fetchEvent(occ.id);
              await updateEvent(occ.id, { startsAt: previousStart, endsAt: previousEnd, expectedVersion: fresh.version });
            }
            refetchCalendar();
          },
        });
      } catch {
        revert();
        refetchCalendar();
      }
    };

    const openEditorForOccurrence = async (occ: EventOccurrence) => {
      const full = await fetchEvent(occ.id);
      setEditorInitial({
        eventId: full.id,
        version: full.version,
        recurring: occ.recurring,
        occurrenceStart: occ.occurrenceStart,
        title: full.title,
        description: full.description ?? undefined,
        areaId: full.areaId ?? undefined,
        startsAt: occ.startsAt,
        endsAt: occ.endsAt,
        timezone: full.timezone,
        allDay: occ.allDay,
        recurrenceRule: full.recurrenceRule ?? undefined,
        locationName: full.locationName ?? undefined,
        locationUrl: full.locationUrl ?? undefined,
        meetingUrl: full.meetingUrl ?? undefined,
        travelMinutes: full.travelMinutes ?? undefined,
        preparationMinutes: full.preparationMinutes ?? undefined,
      });
      setDetailsOccurrence(null);
    };

    return (
      <div className="flex h-full flex-col">
        <Toolbar
          title={title}
          currentView={view}
          onViewChange={(v) => {
            setView(v);
            localStorage.setItem(VIEW_STORAGE_KEY, v);
            fcRef.current?.getApi().changeView(v);
          }}
          onToday={() => fcRef.current?.getApi().today()}
          onPrev={() => fcRef.current?.getApi().prev()}
          onNext={() => fcRef.current?.getApi().next()}
          searchQuery={search}
          onSearchChange={setSearch}
          onCreate={() => {
            const now = Date.now();
            setQuickCreateDraft({ start: now, end: now + 60 * 60 * 1000 });
          }}
        />

        <div className="min-h-0 flex-1 p-2">
          <FullCalendar
            ref={fcRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={view}
            initialDate={(() => {
              const stored = localStorage.getItem(DATE_STORAGE_KEY);
              return stored ? new Date(stored) : undefined;
            })()}
            headerToolbar={false}
            height="100%"
            nowIndicator
            selectable
            selectMirror
            editable
            eventResizableFromStart
            weekends
            dayMaxEvents
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "18:00" }}
            scrollTime={new Date().toTimeString().slice(0, 8)}
            events={fcEvents}
            datesSet={(arg) => {
              setTitle(arg.view.title);
              setRange({ start: arg.start.getTime(), end: arg.end.getTime() });
              localStorage.setItem(DATE_STORAGE_KEY, arg.view.currentStart.toISOString());
              onDateChange?.(arg.view.currentStart);
            }}
            select={(arg) => {
              setQuickCreateDraft({ start: arg.start.getTime(), end: arg.end.getTime() });
              fcRef.current?.getApi().unselect();
            }}
            eventClick={(arg) => setDetailsOccurrence(findOccurrence(arg))}
            eventDrop={(arg) => {
              const occ = findOccurrence(arg);
              const newStart = arg.event.start!.getTime();
              const newEnd = (arg.event.end ?? arg.event.start!).getTime();
              const prevStart = arg.oldEvent.start!.getTime();
              const prevEnd = (arg.oldEvent.end ?? arg.oldEvent.start!).getTime();
              void handleMove(occ, newStart, newEnd, prevStart, prevEnd, arg.revert);
            }}
            eventResize={(arg) => {
              const occ = findOccurrence(arg);
              const newStart = arg.event.start!.getTime();
              const newEnd = (arg.event.end ?? arg.event.start!).getTime();
              const prevStart = arg.oldEvent.start!.getTime();
              const prevEnd = (arg.oldEvent.end ?? arg.oldEvent.start!).getTime();
              void handleMove(occ, newStart, newEnd, prevStart, prevEnd, arg.revert);
            }}
          />
        </div>

        {quickCreateDraft && (
          <QuickCreatePopover
            draft={{ ...quickCreateDraft, allDay: false }}
            areas={areas}
            onClose={() => setQuickCreateDraft(null)}
            onSave={async (input) => {
              await createEvent({
                title: input.title,
                startsAt: input.start,
                endsAt: input.end,
                areaId: input.areaId,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              });
              setQuickCreateDraft(null);
              refetchCalendar();
            }}
            onMoreOptions={(input) => {
              setQuickCreateDraft(null);
              setEditorInitial({
                title: input.title,
                startsAt: input.start,
                endsAt: input.end,
                areaId: input.areaId,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              });
            }}
          />
        )}

        {detailsOccurrence && (
          <EventDetailsPopover
            occurrence={detailsOccurrence}
            area={detailsOccurrence.areaId ? areaById.get(detailsOccurrence.areaId) : undefined}
            onClose={() => setDetailsOccurrence(null)}
            onEdit={() => void openEditorForOccurrence(detailsOccurrence)}
            onDeleted={() => {
              setDetailsOccurrence(null);
              refetchCalendar();
            }}
          />
        )}

        {editorInitial && (
          <EventEditorModal
            initial={editorInitial}
            areas={areas}
            onClose={() => setEditorInitial(null)}
            onSaved={() => {
              setEditorInitial(null);
              refetchCalendar();
            }}
            onDeleted={() => {
              setEditorInitial(null);
              refetchCalendar();
            }}
          />
        )}

        <UndoToast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    );
  },
);
