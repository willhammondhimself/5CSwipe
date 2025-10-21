import md5 from 'md5';
import { Course } from '@/data/mockCourses';

/**
 * Hyperschedule-inspired utility functions for calendar scheduling
 * Based on: https://github.com/hyperschedule/hyperschedule
 */

// 5-minute granularity (300 seconds)
export const SLOT_SIZE = 5 * 60; // 300 seconds

// Default time range
export const DEFAULT_START_HOUR = 8; // 8am
export const DEFAULT_END_HOUR = 22; // 10pm

export type Weekday = 'M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su';

export interface CourseBlock {
  course: Course;
  day: Weekday;
  startTime: number; // seconds from midnight
  endTime: number;
  color: string;
}

export interface ConflictGroup {
  blocks: CourseBlock[];
  startTime: number;
  endTime: number;
}

/**
 * Parse meeting time string to extract days and times
 * Examples: "MWF 9:00-9:50 AM", "TR 2:00-3:15 PM"
 */
export function parseMeetingTime(meetingTime: string): {
  days: Weekday[];
  startTime: number;
  endTime: number;
} | null {
  if (!meetingTime) return null;

  // Extract day codes (M, T, W, Th, F, etc.)
  const dayMatch = meetingTime.match(/^([MTWThFSaSu]+)/);
  if (!dayMatch) return null;

  const dayString = dayMatch[1];
  const days: Weekday[] = [];

  // Parse day codes (handle "Th" as special case)
  let i = 0;
  while (i < dayString.length) {
    if (i < dayString.length - 1 && dayString.slice(i, i + 2) === 'Th') {
      days.push('Th');
      i += 2;
    } else if (i < dayString.length - 1 && dayString.slice(i, i + 2) === 'Sa') {
      days.push('Sa');
      i += 2;
    } else if (i < dayString.length - 1 && dayString.slice(i, i + 2) === 'Su') {
      days.push('Su');
      i += 2;
    } else {
      days.push(dayString[i] as Weekday);
      i += 1;
    }
  }

  // Extract time range
  const timeMatch = meetingTime.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return null;

  const [, startHour, startMin, endHour, endMin, period] = timeMatch;

  // Convert to 24-hour format and seconds from midnight
  let start24 = parseInt(startHour);
  let end24 = parseInt(endHour);

  if (period.toUpperCase() === 'PM' && start24 !== 12) start24 += 12;
  if (period.toUpperCase() === 'AM' && start24 === 12) start24 = 0;
  if (period.toUpperCase() === 'PM' && end24 !== 12) end24 += 12;
  if (period.toUpperCase() === 'AM' && end24 === 12) end24 = 0;

  const startTime = start24 * 3600 + parseInt(startMin) * 60;
  const endTime = end24 * 3600 + parseInt(endMin) * 60;

  return { days, startTime, endTime };
}

/**
 * Compute grid row position for a course block (5-minute slots)
 * Returns: { start: number, end: number } (grid row indices)
 */
export function computeCardRows(startTime: number, endTime: number): {
  start: number;
  end: number;
} {
  return {
    start: Math.round(startTime / SLOT_SIZE),
    end: Math.round(endTime / SLOT_SIZE),
  };
}

/**
 * Convert course to course blocks (one per meeting day)
 */
export function courseToBlocks(course: Course): CourseBlock[] {
  const blocks: CourseBlock[] = [];

  if (!course.meetingTime) return blocks;

  const parsed = parseMeetingTime(course.meetingTime);
  if (!parsed) return blocks;

  const color = generateCourseColor(course.courseCode);

  parsed.days.forEach(day => {
    blocks.push({
      course,
      day,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      color,
    });
  });

  return blocks;
}

/**
 * Generate consistent pastel color for a course section
 * Uses md5 hash of course code for deterministic color
 */
export function generateCourseColor(courseCode: string): string {
  const hash = md5(courseCode);
  const hue = parseInt(hash.substring(0, 8), 16) % 360;

  // HSL: light pastel colors (high lightness, low saturation)
  const saturation = 65 + (parseInt(hash.substring(8, 16), 16) % 20); // 65-85%
  const lightness = 80 + (parseInt(hash.substring(16, 24), 16) % 15); // 80-95%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Check if two course blocks overlap
 */
export function blocksOverlap(a: CourseBlock, b: CourseBlock): boolean {
  return (
    a.day === b.day &&
    a.startTime < b.endTime &&
    b.startTime < a.endTime
  );
}

/**
 * Detect conflicts and group overlapping blocks
 */
export function detectConflicts(blocks: CourseBlock[]): ConflictGroup[] {
  const groups: ConflictGroup[] = [];

  // Group by day first
  const byDay = blocks.reduce((acc, block) => {
    if (!acc[block.day]) acc[block.day] = [];
    acc[block.day].push(block);
    return acc;
  }, {} as Record<Weekday, CourseBlock[]>);

  // For each day, find overlapping groups
  Object.values(byDay).forEach(dayBlocks => {
    const sorted = [...dayBlocks].sort((a, b) => a.startTime - b.startTime);

    sorted.forEach(block => {
      // Find existing group that overlaps
      let foundGroup = false;
      for (const group of groups) {
        if (group.blocks.some(b => blocksOverlap(b, block))) {
          group.blocks.push(block);
          group.startTime = Math.min(group.startTime, block.startTime);
          group.endTime = Math.max(group.endTime, block.endTime);
          foundGroup = true;
          break;
        }
      }

      // Create new group if no overlap found
      if (!foundGroup) {
        groups.push({
          blocks: [block],
          startTime: block.startTime,
          endTime: block.endTime,
        });
      }
    });
  });

  return groups;
}

/**
 * Convert seconds to time label (e.g., 32400 -> "9am")
 */
export function secondsToTimeLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `12:${minutes.toString().padStart(2, '0')}am`;
  if (hours < 12) return minutes === 0 ? `${hours}am` : `${hours}:${minutes.toString().padStart(2, '0')}am`;
  if (hours === 12) return minutes === 0 ? '12pm' : `12:${minutes.toString().padStart(2, '0')}pm`;
  return minutes === 0 ? `${hours - 12}pm` : `${hours - 12}:${minutes.toString().padStart(2, '0')}pm`;
}

/**
 * Generate time slots for the grid
 */
export function generateTimeSlots(
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR
): number[] {
  const slots: number[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(hour * 3600); // Start of each hour in seconds
  }
  return slots;
}
