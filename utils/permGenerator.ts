import { Course } from '../data/mockCourses';

/**
 * Generates a PERM request message for a course
 * Must be under 256 characters
 */
export function generatePermRequest(course: Course): string {
  // Basic template - can be customized later with user preferences
  const template = `PERM request for ${course.courseCode} ${course.title} with ${course.professor}, ${course.meetingTime}. ${course.enrollmentCurrent}/${course.enrollmentCap} enrolled.`;
  
  // Ensure it's under 256 characters
  if (template.length > 256) {
    // Fallback to shorter version
    return `PERM for ${course.courseCode} with ${course.professor}, ${course.meetingTime}. ${course.enrollmentCurrent}/${course.enrollmentCap} enrolled.`;
  }
  
  return template;
}

/**
 * Generates a more personalized PERM request
 * @param course - The course to request
 * @param reason - Optional reason for the request
 * @param year - Student's year (e.g., "Senior", "Junior")
 */
export function generatePersonalizedPermRequest(
  course: Course,
  reason?: string,
  year?: string
): string {
  let message = `PERM for ${course.courseCode}`;
  
  if (year) {
    message += ` (${year})`;
  }
  
  message += ` - ${course.meetingTime}`;
  
  if (reason && message.length + reason.length < 240) {
    message += `. ${reason}`;
  } else {
    message += `. ${course.enrollmentCurrent}/${course.enrollmentCap} enrolled`;
  }
  
  // Always ensure under 256 chars
  if (message.length > 256) {
    return message.substring(0, 253) + '...';
  }
  
  return message;
}

/**
 * Common PERM reasons that can be selected
 */
export const commonPermReasons = [
  'Needed for major requirements',
  'Conflicts resolved with advisor',
  'Senior needing to graduate',
  'Prerequisites completed',
  'Strong interest in subject',
  'Research preparation',
  'Complementary to thesis work',
];