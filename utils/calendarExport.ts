import { Course } from '@/data/mockCourses';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  recurrence: string;
  professor: string;
  courseCode: string;
}

export class CalendarExportService {
  private static formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private static generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@courseswipe.app`;
  }

  private static escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private static courseToEvents(course: Course, semesterStartDate: Date): CalendarEvent[] {
    if (!course.meetingDays || !course.startTime || !course.endTime) {
      return [];
    }

    const events: CalendarEvent[] = [];
    const dayMap: { [key: string]: number } = {
      'M': 1,   // Monday
      'T': 2,   // Tuesday
      'W': 3,   // Wednesday
      'Th': 4,  // Thursday
      'F': 5,   // Friday
      'Sa': 6,  // Saturday
      'Su': 0,  // Sunday
    };

    course.meetingDays.forEach(dayCode => {
      const dayOfWeek = dayMap[dayCode];
      if (dayOfWeek === undefined) return;

      // Find the first occurrence of this day of week after semester start
      const firstOccurrence = new Date(semesterStartDate);
      const daysUntilTarget = (dayOfWeek - firstOccurrence.getDay() + 7) % 7;
      firstOccurrence.setDate(firstOccurrence.getDate() + daysUntilTarget);

      // Parse start and end times
      const [startHours, startMinutes] = course.startTime.split(':').map(Number);
      const [endHours, endMinutes] = course.endTime.split(':').map(Number);

      const startDate = new Date(firstOccurrence);
      startDate.setHours(startHours, startMinutes, 0, 0);

      const endDate = new Date(firstOccurrence);
      endDate.setHours(endHours, endMinutes, 0, 0);

      const location = course.buildingCode && course.roomNumber 
        ? `${course.buildingCode} ${course.roomNumber}`
        : course.location;

      events.push({
        title: `${course.courseCode}: ${course.title}`,
        description: `${course.description}\n\nProfessor: ${course.professor}\nCredits: ${course.credits}`,
        location,
        startDate,
        endDate,
        recurrence: 'WEEKLY',
        professor: course.professor,
        courseCode: course.courseCode,
      });
    });

    return events;
  }

  private static generateICalContent(events: CalendarEvent[], semesterEndDate: Date): string {
    const now = new Date();
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CourseSwipe//Course Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:5C Course Schedule',
      'X-WR-TIMEZONE:America/Los_Angeles',
      'X-WR-CALDESC:Course schedule exported from CourseSwipe',
      ''
    ];

    events.forEach(event => {
      const uid = this.generateUID();
      const dtStamp = this.formatDate(now);
      const dtStart = this.formatDate(event.startDate);
      const dtEnd = this.formatDate(event.endDate);
      const until = this.formatDate(semesterEndDate);

      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
        `SUMMARY:${this.escapeICalText(event.title)}`,
        `DESCRIPTION:${this.escapeICalText(event.description)}`,
        `LOCATION:${this.escapeICalText(event.location)}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        `CATEGORIES:${event.courseCode}`,
        'END:VEVENT',
        ''
      );
    });

    icalContent.push('END:VCALENDAR');
    return icalContent.join('\r\n');
  }

  public static getSemesterDates(semester: string): { start: Date; end: Date } {
    // Default semester dates - in a real app, these would come from the API
    const semesterDates: { [key: string]: { start: Date; end: Date } } = {
      'Fall 2024': {
        start: new Date('2024-08-26'),
        end: new Date('2024-12-13'),
      },
      'Spring 2025': {
        start: new Date('2025-01-21'),
        end: new Date('2025-05-09'),
      },
      'Summer 2025': {
        start: new Date('2025-06-02'),
        end: new Date('2025-07-25'),
      },
      'Fall 2025': {
        start: new Date('2025-08-25'),
        end: new Date('2025-12-12'),
      },
    };

    return semesterDates[semester] || {
      start: new Date(),
      end: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
    };
  }

  public static async exportScheduleToCalendar(
    courses: Course[],
    semester: string = 'Spring 2025',
    filename?: string
  ): Promise<void> {
    try {
      const { start: semesterStart, end: semesterEnd } = this.getSemesterDates(semester);
      
      // Convert courses to calendar events
      const allEvents: CalendarEvent[] = [];
      courses.forEach(course => {
        const events = this.courseToEvents(course, semesterStart);
        allEvents.push(...events);
      });

      if (allEvents.length === 0) {
        throw new Error('No courses with valid schedule data found');
      }

      // Generate .ics content
      const icalContent = this.generateICalContent(allEvents, semesterEnd);
      
      // Create filename with timestamp if not provided
      const defaultFilename = `5C_Schedule_${semester.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.ics`;
      const finalFilename = filename || defaultFilename;

      // Write to file
      const fileUri = `${FileSystem.documentDirectory}${finalFilename}`;
      await FileSystem.writeAsStringAsync(fileUri, icalContent);

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Export Course Schedule',
        });
      } else {
        throw new Error('Sharing not available on this device');
      }

    } catch (error) {
      console.error('Calendar export error:', error);
      throw error;
    }
  }

  public static async generateCalendarUrl(courses: Course[], semester: string = 'Spring 2025'): Promise<string> {
    const { start: semesterStart, end: semesterEnd } = this.getSemesterDates(semester);
    
    const allEvents: CalendarEvent[] = [];
    courses.forEach(course => {
      const events = this.courseToEvents(course, semesterStart);
      allEvents.push(...events);
    });

    const icalContent = this.generateICalContent(allEvents, semesterEnd);
    const encodedContent = encodeURIComponent(icalContent);
    
    // Create data URL for direct calendar import
    return `data:text/calendar;charset=utf-8,${encodedContent}`;
  }

  public static getGoogleCalendarUrl(course: Course, semester: string = 'Spring 2025'): string {
    const { start: semesterStart } = this.getSemesterDates(semester);
    const events = this.courseToEvents(course, semesterStart);
    
    if (events.length === 0) return '';

    const event = events[0]; // Use first event for Google Calendar
    const startDate = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0];
    const endDate = event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0];
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate}/${endDate}`,
      details: event.description,
      location: event.location,
      recur: 'RRULE:FREQ=WEEKLY',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}

export default CalendarExportService;