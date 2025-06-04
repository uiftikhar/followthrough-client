/**
 * Calendar Service (Client-Side)
 *
 * Handles Google Calendar operations through our server's proxy endpoints
 * All actual Google API calls are made server-side for security
 */

import { HttpClient } from "./http-client";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  location?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: "video" | "phone" | "sip" | "more";
      uri?: string;
      label?: string;
    }>;
  };
  created?: string;
  updated?: string;
}

export interface CalendarEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface CreateEventRequest {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
  }>;
  location?: string;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: "hangoutsMeet";
      };
    };
  };
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export class CalendarService {
  /**
   * Get calendar events
   */
  static async getEvents(
    options: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      pageToken?: string;
      q?: string;
      orderBy?: "startTime" | "updated";
    } = {},
  ): Promise<CalendarEventsResponse> {
    try {
      const params = new URLSearchParams();

      if (options.timeMin) params.append("timeMin", options.timeMin);
      if (options.timeMax) params.append("timeMax", options.timeMax);
      if (options.maxResults)
        params.append("maxResults", options.maxResults.toString());
      if (options.pageToken) params.append("pageToken", options.pageToken);
      if (options.q) params.append("q", options.q);
      if (options.orderBy) params.append("orderBy", options.orderBy);

      const calendarId = options.calendarId || "primary";
      const endpoint = `/integrations/calendar/${calendarId}/events${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await HttpClient.get(endpoint);
      return await HttpClient.parseJsonResponse<CalendarEventsResponse>(
        response,
      );
    } catch (error) {
      console.error("Failed to get calendar events:", error);
      throw error;
    }
  }

  /**
   * Get upcoming events (next week)
   */
  static async getUpcomingEvents(
    maxResults: number = 20,
  ): Promise<CalendarEventsResponse> {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return this.getEvents({
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults,
      orderBy: "startTime",
    });
  }

  /**
   * Get events for today
   */
  static async getTodayEvents(): Promise<CalendarEventsResponse> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getEvents({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      orderBy: "startTime",
    });
  }

  /**
   * Create a new calendar event
   */
  static async createEvent(
    eventData: CreateEventRequest,
    calendarId: string = "primary",
  ): Promise<CalendarEvent> {
    try {
      const response = await HttpClient.post(
        `/integrations/calendar/${calendarId}/events`,
        eventData,
      );
      return await HttpClient.parseJsonResponse<CalendarEvent>(response);
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      throw error;
    }
  }

  /**
   * Get a specific calendar event
   */
  static async getEvent(
    eventId: string,
    calendarId: string = "primary",
  ): Promise<CalendarEvent> {
    try {
      const response = await HttpClient.get(
        `/integrations/calendar/${calendarId}/events/${eventId}`,
      );
      return await HttpClient.parseJsonResponse<CalendarEvent>(response);
    } catch (error) {
      console.error("Failed to get calendar event:", error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  static async updateEvent(
    eventId: string,
    eventData: Partial<CreateEventRequest>,
    calendarId: string = "primary",
  ): Promise<CalendarEvent> {
    try {
      const response = await HttpClient.put(
        `/integrations/calendar/${calendarId}/events/${eventId}`,
        eventData,
      );
      return await HttpClient.parseJsonResponse<CalendarEvent>(response);
    } catch (error) {
      console.error("Failed to update calendar event:", error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteEvent(
    eventId: string,
    calendarId: string = "primary",
  ): Promise<void> {
    try {
      await HttpClient.delete(
        `/integrations/calendar/${calendarId}/events/${eventId}`,
      );
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
      throw error;
    }
  }

  /**
   * Get user's calendars
   */
  static async getCalendars(): Promise<Calendar[]> {
    try {
      const response = await HttpClient.get("/integrations/calendar/calendars");
      const data = await HttpClient.parseJsonResponse<{ items?: Calendar[] }>(
        response,
      );
      return data.items || [];
    } catch (error) {
      console.error("Failed to get calendars:", error);
      throw error;
    }
  }

  /**
   * Search events
   */
  static async searchEvents(
    query: string,
    calendarId: string = "primary",
    maxResults: number = 20,
  ): Promise<CalendarEventsResponse> {
    return this.getEvents({
      calendarId,
      q: query,
      maxResults,
      orderBy: "startTime",
    });
  }

  /**
   * Create a meeting with Google Meet link
   */
  static async createMeeting(meetingData: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees?: string[];
    timeZone?: string;
  }): Promise<CalendarEvent> {
    const eventData: CreateEventRequest = {
      summary: meetingData.summary,
      description: meetingData.description,
      start: {
        dateTime: meetingData.start,
        timeZone: meetingData.timeZone || "America/New_York",
      },
      end: {
        dateTime: meetingData.end,
        timeZone: meetingData.timeZone || "America/New_York",
      },
      attendees: meetingData.attendees?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    return this.createEvent(eventData);
  }
}
