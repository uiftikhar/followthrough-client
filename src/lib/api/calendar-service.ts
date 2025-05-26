/**
 * Calendar Service (Client-Side)
 * 
 * Handles Google Calendar operations through our server's proxy endpoints
 * All actual Google API calls are made server-side for security
 */

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
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: 'video' | 'phone' | 'sip' | 'more';
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
        type: 'hangoutsMeet';
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
  private static readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  /**
   * Get the JWT token from localStorage
   */
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Make authenticated request to server
   */
  private static async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in first.');
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('Google account not connected. Please connect your Google account first.');
    }

    return response;
  }

  /**
   * Get calendar events
   */
  static async getEvents(options: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    pageToken?: string;
    q?: string;
    orderBy?: 'startTime' | 'updated';
  } = {}): Promise<CalendarEventsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (options.timeMin) params.append('timeMin', options.timeMin);
      if (options.timeMax) params.append('timeMax', options.timeMax);
      if (options.maxResults) params.append('maxResults', options.maxResults.toString());
      if (options.pageToken) params.append('pageToken', options.pageToken);
      if (options.q) params.append('q', options.q);
      if (options.orderBy) params.append('orderBy', options.orderBy);

      const calendarId = options.calendarId || 'primary';
      const response = await this.makeAuthenticatedRequest(
        `/integrations/calendar/${calendarId}/events?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get calendar events: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events (next week)
   */
  static async getUpcomingEvents(maxResults: number = 20): Promise<CalendarEventsResponse> {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return this.getEvents({
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults,
      orderBy: 'startTime',
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
      orderBy: 'startTime',
    });
  }

  /**
   * Create a new calendar event
   */
  static async createEvent(
    eventData: CreateEventRequest,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/integrations/calendar/${calendarId}/events`,
        {
          method: 'POST',
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create calendar event: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  /**
   * Get a specific calendar event
   */
  static async getEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/integrations/calendar/${calendarId}/events/${eventId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get calendar event: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get calendar event:', error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  static async updateEvent(
    eventId: string,
    eventData: Partial<CreateEventRequest>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/integrations/calendar/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update calendar event: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/integrations/calendar/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete calendar event: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  /**
   * Get user's calendars
   */
  static async getCalendars(): Promise<Calendar[]> {
    try {
      const response = await this.makeAuthenticatedRequest('/integrations/calendar/calendars');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get calendars: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw error;
    }
  }

  /**
   * Search events
   */
  static async searchEvents(
    query: string,
    calendarId: string = 'primary',
    maxResults: number = 20
  ): Promise<CalendarEventsResponse> {
    return this.getEvents({
      calendarId,
      q: query,
      maxResults,
      orderBy: 'startTime',
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
        timeZone: meetingData.timeZone || 'America/New_York',
      },
      end: {
        dateTime: meetingData.end,
        timeZone: meetingData.timeZone || 'America/New_York',
      },
      attendees: meetingData.attendees?.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    return this.createEvent(eventData);
  }
} 