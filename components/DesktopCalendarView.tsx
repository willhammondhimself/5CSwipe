import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

// Pastel colors for course blocks
const COURSE_COLORS = [
  '#FFE4E1', // Misty Rose
  '#E6E6FA', // Lavender
  '#F0E68C', // Khaki
  '#E0FFFF', // Light Cyan
  '#FFE4B5', // Moccasin
  '#F5DEB3', // Wheat
  '#D8BFD8', // Thistle
  '#FFDAB9', // Peach Puff
];

interface TimeSlot {
  day: string;
  startHour: number;
  endHour: number;
}

interface ScheduledCourse extends Course {
  color: string;
  timeSlots: TimeSlot[];
}

export default function DesktopCalendarView() {
  const { likedCourses } = useLikedCourses();
  const { activePlan, addCourseToPlan, removeCourseFromPlan } = useScheduleVariants();
  const [scheduledCourses, setScheduledCourses] = useState<ScheduledCourse[]>([]);
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const calendarRef = useRef<View>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [calendarLayout, setCalendarLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Load scheduled courses from active plan on mount
  useEffect(() => {
    if (activePlan?.courses && activePlan.courses.length > 0) {
      const scheduled = activePlan.courses.map((course, index) => ({
        ...course,
        color: COURSE_COLORS[index % COURSE_COLORS.length],
        timeSlots: parseTimeSlots(course)
      }));
      setScheduledCourses(scheduled);
    }
  }, [activePlan?.courses]); // Re-load when active plan changes

  // Parse course meeting times into time slots
  const parseTimeSlots = (course: Course): TimeSlot[] => {
    const slots: TimeSlot[] = [];

    // Handle courses with no meeting days (TBA, online, etc.)
    if (!course.meetingDays || course.meetingDays.length === 0) return slots;

    // Map meeting days to full day names
    const dayMap: { [key: string]: string } = {
      'M': 'Monday',
      'T': 'Tuesday',
      'W': 'Wednesday',
      'Th': 'Thursday',
      'F': 'Friday',
      'Sa': 'Saturday',
      'Su': 'Sunday',
    };

    const parsedDays = course.meetingDays.map(d => dayMap[d]).filter(Boolean);

    // Parse time from startTime and endTime (format: "HH:MM")
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours + minutes / 60;
    };

    const startHour = parseTime(course.startTime);
    const endHour = parseTime(course.endTime);

    parsedDays.forEach(day => {
      slots.push({ day, startHour, endHour });
    });

    return slots;
  };

  // Filter courses based on search
  const filteredCourses = useMemo(() => {
    return likedCourses.filter(course =>
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [likedCourses, searchQuery]);

  // Detect time conflicts between scheduled courses
  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, boolean>();

    scheduledCourses.forEach((course, i) => {
      scheduledCourses.slice(i + 1).forEach(other => {
        course.timeSlots.forEach(slot1 => {
          other.timeSlots.forEach(slot2 => {
            // Check if slots are on the same day
            if (slot1.day === slot2.day) {
              // Check for time overlap
              const overlap = !(slot1.endHour <= slot2.startHour || slot2.endHour <= slot1.startHour);
              if (overlap) {
                conflictMap.set(course.id, true);
                conflictMap.set(other.id, true);
              }
            }
          });
        });
      });
    });

    return conflictMap;
  }, [scheduledCourses]);

  // Handle drag start - web-specific
  const handleDragStart = (course: Course, event?: any) => {
    setDraggedCourse(course);
    if (Platform.OS === 'web' && event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('courseId', course.id);
    }
  };

  // Handle drag over - web-specific
  const handleDragOver = (event?: any) => {
    if (Platform.OS === 'web' && event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  };

  // Handle drop on calendar
  const handleDrop = async (day: string, hour: number, event?: any) => {
    if (Platform.OS === 'web' && event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!draggedCourse) return;

    const timeSlots = parseTimeSlots(draggedCourse);
    const color = COURSE_COLORS[scheduledCourses.length % COURSE_COLORS.length];

    const scheduledCourse: ScheduledCourse = {
      ...draggedCourse,
      color,
      timeSlots: timeSlots.length > 0 ? timeSlots : [{ day, startHour: hour, endHour: hour + 1 }],
    };

    // Optimistic update - add to UI immediately
    setScheduledCourses(prev => [...prev, scheduledCourse]);

    // Persist to Supabase via context
    if (activePlan) {
      const success = await addCourseToPlan(activePlan.id, draggedCourse);

      // Rollback on error
      if (!success) {
        setScheduledCourses(prev => prev.filter(c => c.id !== draggedCourse.id));
      }
    }

    setDraggedCourse(null);
  };

  // Remove course from schedule
  const handleRemoveCourse = async (courseId: string) => {
    // Store removed course for potential rollback
    const removedCourse = scheduledCourses.find(c => c.id === courseId);

    // Optimistic update - remove from UI immediately
    setScheduledCourses(prev => prev.filter(c => c.id !== courseId));

    // Persist removal to Supabase
    if (activePlan && removedCourse) {
      const success = await removeCourseFromPlan(activePlan.id, courseId);

      // Rollback on error
      if (!success && removedCourse) {
        setScheduledCourses(prev => [...prev, removedCourse]);
      }
    }
  };

  // Render course block on calendar
  const renderCourseBlock = (course: ScheduledCourse, slot: TimeSlot, slotIndex: number) => {
    const duration = slot.endHour - slot.startHour;
    const height = duration * 60; // 60px per hour
    const top = (slot.startHour - 8) * 60;
    const hasConflict = conflicts.has(course.id);

    return (
      <View
        key={`${course.id}-${slotIndex}`}
        style={[
          styles.courseBlock,
          {
            backgroundColor: course.color,
            height,
            top,
          },
          hasConflict && styles.conflictBorder,
        ]}
      >
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveCourse(course.id)}
        >
          <Ionicons name="close-circle" size={16} color="#666" />
        </TouchableOpacity>
        {hasConflict && (
          <View style={styles.conflictIcon}>
            <Ionicons name="warning" size={16} color={SwipeColors.nope} />
          </View>
        )}
        <Text style={styles.courseBlockCode}>{course.courseCode}</Text>
        <Text style={styles.courseBlockName} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.courseBlockTime}>
          {slot.startHour.toFixed(0)}:00 - {slot.endHour.toFixed(0)}:00
        </Text>
      </View>
    );
  };

  // TODO: Mobile gesture for course item - disabled due to hooks in non-hook function
  // This needs to be refactored into a separate component or use refs instead of hooks
  /*
  const createCourseGesture = (course: Course) => {
    const pressed = useSharedValue(false);

    const longPress = Gesture.LongPress()
      .minDuration(300)
      .onStart(() => {
        pressed.value = true;
        runOnJS(setDraggedCourse)(course);
      })
      .onEnd(() => {
        pressed.value = false;
      });

    const pan = Gesture.Pan()
      .onUpdate((e) => {
        if (pressed.value) {
          translateX.value = e.translationX;
          translateY.value = e.translationY;
        }
      })
      .onEnd((e) => {
        const dropPos = calculateDropPosition(e.absoluteX, e.absoluteY);
        if (dropPos && draggedCourse) {
          runOnJS(handleDrop)(dropPos.day, dropPos.hour);
        }
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        runOnJS(setDraggedCourse)(null);
      });

    const gesture = Gesture.Race(longPress, pan);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      opacity: pressed.value ? 0.7 : 1,
      zIndex: pressed.value ? 1000 : 1,
    }));

    return { gesture, animatedStyle };
  };
  */

  return (
    <View style={styles.container}>
      {/* Header with search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule Builder</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={SwipeColors.textTertiary} />
          <TextInput
            placeholder="Search liked courses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={SwipeColors.textTertiary}
          />
        </View>
      </View>

      <View style={styles.content}>
        {/* Course list sidebar */}
        <ScrollView style={styles.courseList}>
          <Text style={styles.sidebarTitle}>Liked Courses</Text>
          {filteredCourses.map(course => {
            // Web drag-and-drop
            if (Platform.OS === 'web') {
              const viewProps = {
                draggable: true,
                onDragStart: (e: any) => handleDragStart(course, e),
              };

              return (
                <View
                  key={course.id}
                  {...viewProps}
                  style={styles.courseItem}
                >
                  <View style={styles.courseItemHeader}>
                    <Text style={styles.courseItemCode}>{course.courseCode}</Text>
                    <View style={styles.courseBadge}>
                      <Text style={styles.courseBadgeText}>{course.credits} credits</Text>
                    </View>
                  </View>
                  <Text style={styles.courseItemName} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={styles.courseItemTime}>
                    {course.meetingDays.join('')} • {course.startTime}-{course.endTime}
                  </Text>
                </View>
              );
            }

            // Mobile gesture-based drag - temporarily disabled
            // const { gesture, animatedStyle } = createCourseGesture(course);

            return (
              <View key={course.id} style={styles.courseItem}>
                  <View style={styles.courseItemHeader}>
                    <Text style={styles.courseItemCode}>{course.courseCode}</Text>
                    <View style={styles.courseBadge}>
                      <Text style={styles.courseBadgeText}>{course.credits} credits</Text>
                    </View>
                  </View>
                  <Text style={styles.courseItemName} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={styles.courseItemTime}>
                    {course.meetingDays.join('')} • {course.startTime}-{course.endTime}
                  </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Calendar grid */}
        <ScrollView style={styles.calendarContainer}>
          <View
            ref={calendarRef}
            style={styles.calendar}
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout;
              setCalendarLayout({ x, y, width, height });
            }}
          >
            {/* Time column */}
            <View style={styles.timeColumn}>
              <View style={styles.timeHeaderCell} />
              {HOURS.map(hour => (
                <View key={hour} style={styles.timeCell}>
                  <Text style={styles.timeText}>
                    {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns */}
            {DAYS.map(day => (
              <View key={day} style={styles.dayColumn}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
                {HOURS.map(hour => {
                  const dropZoneProps = Platform.OS === 'web' ? {
                    onDrop: (e: any) => handleDrop(day, hour, e),
                    onDragOver: handleDragOver,
                  } : {};

                  return (
                    <View
                      key={`${day}-${hour}`}
                      style={styles.timeSlot}
                      {...dropZoneProps}
                    />
                  );
                })}
                {/* Render scheduled courses for this day */}
                <View style={styles.courseBlockContainer}>
                  {scheduledCourses.map(course =>
                    course.timeSlots
                      .filter(slot => slot.day === day)
                      .map((slot, idx) => renderCourseBlock(course, slot, idx))
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    color: SwipeColors.textPrimary,
    fontSize: 16,
    marginLeft: 8,
    outlineStyle: 'none' as any, // Web-specific: Remove focus outline
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  courseList: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 16,
  },
  courseItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...(Platform.OS === 'web' && { cursor: 'grab' as any }),
  },
  courseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseItemCode: {
    fontSize: 14,
    fontWeight: '700',
    color: SwipeColors.accentBlue,
  },
  courseBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  courseItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
    marginBottom: 6,
  },
  courseItemTime: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
  },
  calendarContainer: {
    flex: 1,
  },
  calendar: {
    flexDirection: 'row',
    padding: 16,
  },
  timeColumn: {
    width: 80,
  },
  timeHeaderCell: {
    height: 60,
  },
  timeCell: {
    height: 60,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeText: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    textAlign: 'right',
    paddingRight: 12,
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
  },
  dayHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  timeSlot: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.05)',
  },
  courseBlockContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
  },
  courseBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  courseBlockCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  courseBlockName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  courseBlockTime: {
    fontSize: 9,
    color: '#666',
  },
  conflictBorder: {
    borderColor: SwipeColors.nope,
    borderWidth: 3,
  },
  conflictIcon: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
    zIndex: 2,
  },
  mobileWarning: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  mobileWarningText: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  mobileWarningSubtext: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});
