import { Course } from '@/data/mockCourses';

interface TimeSlot {
  day: string;
  startTime: number; // minutes from midnight
  endTime: number;   // minutes from midnight
}

interface LocationConflict {
  building: string;
  room: string;
}

export function parseTimeSlots(course: Course): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Use enhanced Course data if available
  if (course.meetingDays && course.startTime && course.endTime) {
    const dayMap: { [key: string]: string } = {
      'M': 'Monday',
      'T': 'Tuesday', 
      'W': 'Wednesday',
      'Th': 'Thursday',
      'F': 'Friday',
      'Sa': 'Saturday',
      'Su': 'Sunday'
    };

    // Convert time strings to minutes from midnight
    const startMinutes = timeStringToMinutes(course.startTime);
    const endMinutes = timeStringToMinutes(course.endTime);

    course.meetingDays.forEach(dayCode => {
      const dayName = dayMap[dayCode] || dayCode;
      slots.push({
        day: dayName,
        startTime: startMinutes,
        endTime: endMinutes,
      });
    });

    return slots;
  }

  // Fallback to old parsing for backward compatibility
  const timeMatch = course.meetingTime.match(/([MTWRFSU]+)\s+(\d{1,2}):(\d{2})(AM|PM)-(\d{1,2}):(\d{2})(AM|PM)/);
  
  if (!timeMatch) return slots;
  
  const [, days, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch;
  
  // Convert to 24-hour format
  let startTime24 = parseInt(startHour);
  let endTime24 = parseInt(endHour);
  
  if (startPeriod === 'PM' && startTime24 !== 12) startTime24 += 12;
  if (startPeriod === 'AM' && startTime24 === 12) startTime24 = 0;
  if (endPeriod === 'PM' && endTime24 !== 12) endTime24 += 12;
  if (endPeriod === 'AM' && endTime24 === 12) endTime24 = 0;
  
  // Convert to minutes from midnight
  const startMinutes = startTime24 * 60 + parseInt(startMin);
  const endMinutes = endTime24 * 60 + parseInt(endMin);
  
  // Parse days
  const dayMap: { [key: string]: string } = {
    'M': 'Monday',
    'T': 'Tuesday', 
    'W': 'Wednesday',
    'R': 'Thursday',
    'F': 'Friday',
    'S': 'Saturday',
    'U': 'Sunday'
  };
  
  // Handle consecutive letters (like MW, TR, MWF)
  for (let i = 0; i < days.length; i++) {
    const dayLetter = days[i];
    if (dayMap[dayLetter]) {
      slots.push({
        day: dayMap[dayLetter],
        startTime: startMinutes,
        endTime: endMinutes,
      });
    }
  }
  
  return slots;
}

function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function hasTimeConflict(course1: Course, course2: Course): boolean {
  const slots1 = parseTimeSlots(course1);
  const slots2 = parseTimeSlots(course2);
  
  for (const slot1 of slots1) {
    for (const slot2 of slots2) {
      // Same day check
      if (slot1.day === slot2.day) {
        // Time overlap check
        const overlap = Math.max(0, 
          Math.min(slot1.endTime, slot2.endTime) - Math.max(slot1.startTime, slot2.startTime)
        );
        if (overlap > 0) {
          return true;
        }
      }
    }
  }
  
  return false;
}

export function hasLocationConflict(course1: Course, course2: Course): boolean {
  // Check if courses have location data
  if (!course1.buildingCode || !course1.roomNumber || 
      !course2.buildingCode || !course2.roomNumber) {
    return false;
  }

  // Same building and room = location conflict
  return course1.buildingCode === course2.buildingCode && 
         course1.roomNumber === course2.roomNumber;
}

export function hasScheduleConflict(course1: Course, course2: Course): boolean {
  // Time conflict is always a conflict
  if (hasTimeConflict(course1, course2)) {
    return true;
  }

  // Location conflict only matters if times are close (within 15 minutes)
  if (hasLocationConflict(course1, course2)) {
    return hasCloseTimeSlots(course1, course2, 15);
  }

  return false;
}

function hasCloseTimeSlots(course1: Course, course2: Course, bufferMinutes: number): boolean {
  const slots1 = parseTimeSlots(course1);
  const slots2 = parseTimeSlots(course2);
  
  for (const slot1 of slots1) {
    for (const slot2 of slots2) {
      if (slot1.day === slot2.day) {
        // Check if end of one is within buffer of start of another
        const gap1to2 = slot2.startTime - slot1.endTime;
        const gap2to1 = slot1.startTime - slot2.endTime;
        
        if ((gap1to2 >= 0 && gap1to2 <= bufferMinutes) || 
            (gap2to1 >= 0 && gap2to1 <= bufferMinutes)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

export function findScheduleConflicts(newCourse: Course, likedCourses: Course[]): Course[] {
  return likedCourses.filter(course => hasScheduleConflict(newCourse, course));
}

export function findTimeConflicts(newCourse: Course, likedCourses: Course[]): Course[] {
  return likedCourses.filter(course => hasTimeConflict(newCourse, course));
}

export function findLocationConflicts(newCourse: Course, likedCourses: Course[]): Course[] {
  return likedCourses.filter(course => hasLocationConflict(newCourse, course));
}

export function formatConflictMessage(course1: Course, course2: Course): string {
  const timeConflict = hasTimeConflict(course1, course2);
  const locationConflict = hasLocationConflict(course1, course2);
  
  if (timeConflict && locationConflict) {
    return `Time & location conflict: ${course1.courseCode} and ${course2.courseCode} overlap on the same day at ${course1.buildingCode} ${course1.roomNumber}`;
  }
  
  if (timeConflict) {
    const slots1 = parseTimeSlots(course1);
    const slots2 = parseTimeSlots(course2);
    
    for (const slot1 of slots1) {
      for (const slot2 of slots2) {
        if (slot1.day === slot2.day) {
          const overlap = Math.max(0, 
            Math.min(slot1.endTime, slot2.endTime) - Math.max(slot1.startTime, slot2.startTime)
          );
          if (overlap > 0) {
            return `Time conflict: ${course1.courseCode} and ${course2.courseCode} overlap on ${slot1.day}`;
          }
        }
      }
    }
  }
  
  if (locationConflict) {
    return `Location conflict: ${course1.courseCode} and ${course2.courseCode} both meet at ${course1.buildingCode} ${course1.roomNumber}`;
  }
  
  return 'Schedule conflict detected';
}

export function getConflictDetails(course1: Course, course2: Course): {
  hasTimeConflict: boolean;
  hasLocationConflict: boolean;
  conflictType: 'time' | 'location' | 'both' | 'close_timing' | 'none';
  message: string;
} {
  const timeConflict = hasTimeConflict(course1, course2);
  const locationConflict = hasLocationConflict(course1, course2);
  const closeTimingConflict = hasCloseTimeSlots(course1, course2, 15);
  
  let conflictType: 'time' | 'location' | 'both' | 'close_timing' | 'none';
  
  if (timeConflict && locationConflict) {
    conflictType = 'both';
  } else if (timeConflict) {
    conflictType = 'time';
  } else if (locationConflict && closeTimingConflict) {
    conflictType = 'close_timing';
  } else if (locationConflict) {
    conflictType = 'location';
  } else {
    conflictType = 'none';
  }
  
  return {
    hasTimeConflict: timeConflict,
    hasLocationConflict: locationConflict,
    conflictType,
    message: formatConflictMessage(course1, course2),
  };
}