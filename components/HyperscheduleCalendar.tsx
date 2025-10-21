import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import {
  courseToBlocks,
  detectConflicts,
  generateTimeSlots,
  secondsToTimeLabel,
  computeCardRows,
  type CourseBlock,
  type Weekday,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  SLOT_SIZE,
} from '@/utils/hyperschedule';

const { width: screenWidth } = Dimensions.get('window');

interface HyperscheduleCalendarProps {
  courses: Course[];
  onCoursePress?: (course: Course) => void;
  startHour?: number;
  endHour?: number;
}

const DAYS: Weekday[] = ['M', 'T', 'W', 'Th', 'F'];
const DAY_LABELS = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  Th: 'Thu',
  F: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
};

const TIME_COLUMN_WIDTH = 60;
const HOUR_HEIGHT = 80; // Height per hour in pixels
const SLOT_HEIGHT = (HOUR_HEIGHT * SLOT_SIZE) / 3600; // Height per 5-min slot

export default function HyperscheduleCalendar({
  courses,
  onCoursePress,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
}: HyperscheduleCalendarProps) {
  // Convert courses to blocks
  const allBlocks = useMemo(() => {
    return courses.flatMap(course => courseToBlocks(course));
  }, [courses]);

  // Detect conflicts
  const conflictGroups = useMemo(() => {
    return detectConflicts(allBlocks);
  }, [allBlocks]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    return generateTimeSlots(startHour, endHour);
  }, [startHour, endHour]);

  // Group blocks by day
  const blocksByDay = useMemo(() => {
    const grouped: Record<Weekday, CourseBlock[]> = {
      M: [],
      T: [],
      W: [],
      Th: [],
      F: [],
      Sa: [],
      Su: [],
    };

    allBlocks.forEach(block => {
      grouped[block.day].push(block);
    });

    return grouped;
  }, [allBlocks]);

  // Calculate column width
  const dayColumnWidth = (screenWidth - TIME_COLUMN_WIDTH) / DAYS.length;

  // Render course block
  const renderBlock = (block: CourseBlock, index: number) => {
    const rows = computeCardRows(block.startTime, block.endTime);
    const top = (rows.start * SLOT_SIZE - startHour * 3600) / 3600 * HOUR_HEIGHT;
    const height = ((rows.end - rows.start) * SLOT_SIZE) / 3600 * HOUR_HEIGHT;

    // Find if this block is in a conflict group
    const conflictGroup = conflictGroups.find(g =>
      g.blocks.some(b => b === block)
    );
    const groupSize = conflictGroup ? conflictGroup.blocks.length : 1;
    const blockIndex = conflictGroup
      ? conflictGroup.blocks.indexOf(block)
      : 0;

    // Calculate horizontal positioning for overlaps
    const blockWidth = groupSize > 1 ? dayColumnWidth * 0.9 / groupSize : dayColumnWidth * 0.95;
    const leftOffset = groupSize > 1 ? (blockIndex * blockWidth) : dayColumnWidth * 0.025;

    return (
      <TouchableOpacity
        key={`${block.course.id}-${block.day}-${index}`}
        style={[
          styles.courseBlock,
          {
            top,
            left: leftOffset,
            height: Math.max(height, 40), // Minimum height
            width: blockWidth,
            backgroundColor: block.color,
            zIndex: 100 - blockIndex, // Stack order
            opacity: groupSize > 1 && blockIndex > 0 ? 0.92 : 1,
          },
        ]}
        onPress={() => onCoursePress?.(block.course)}
        activeOpacity={0.7}
      >
        <Text style={styles.courseCode} numberOfLines={1}>
          {block.course.courseCode}
        </Text>
        <Text style={styles.courseTitle} numberOfLines={height > 60 ? 2 : 1}>
          {block.course.title}
        </Text>
        {height > 80 && block.course.location && (
          <Text style={styles.courseLocation} numberOfLines={1}>
            {block.course.location}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with day labels */}
      <View style={styles.header}>
        <View style={[styles.timeLabel, { width: TIME_COLUMN_WIDTH }]} />
        {DAYS.map(day => (
          <View key={day} style={[styles.dayLabel, { width: dayColumnWidth }]}>
            <Text style={styles.dayText}>{DAY_LABELS[day]}</Text>
          </View>
        ))}
      </View>

      {/* Scrollable calendar grid */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={true}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {/* Time labels column */}
            <View style={[styles.timeColumn, { width: TIME_COLUMN_WIDTH }]}>
              {timeSlots.map((slot, index) => (
                <View
                  key={slot}
                  style={[styles.timeSlot, { height: HOUR_HEIGHT }]}
                >
                  <Text style={styles.timeText}>
                    {secondsToTimeLabel(slot)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns with course blocks */}
            {DAYS.map(day => (
              <View
                key={day}
                style={[styles.dayColumn, { width: dayColumnWidth }]}
              >
                {/* Hour grid lines */}
                {timeSlots.map(slot => (
                  <View
                    key={slot}
                    style={[styles.hourLine, { height: HOUR_HEIGHT }]}
                  />
                ))}

                {/* Course blocks for this day */}
                <View style={styles.blocksContainer}>
                  {blocksByDay[day].map((block, index) =>
                    renderBlock(block, index)
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SwipeColors.background,
  },
  header: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: SwipeColors.border,
    backgroundColor: SwipeColors.surface,
    paddingVertical: 12,
  },
  timeLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  timeColumn: {
    backgroundColor: SwipeColors.surface,
    borderRightWidth: 1,
    borderRightColor: SwipeColors.border,
  },
  timeSlot: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.border,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    fontWeight: '500',
  },
  dayColumn: {
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: SwipeColors.border,
  },
  hourLine: {
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.border,
  },
  blocksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  courseBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  courseCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 10,
    color: '#2a2a2a',
    lineHeight: 13,
  },
  courseLocation: {
    fontSize: 9,
    color: '#4a4a4a',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
