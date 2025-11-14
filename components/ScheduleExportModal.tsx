import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';
// eslint-disable-next-line import/no-named-as-default
import CalendarExportService from '@/utils/calendarExport';
import { PDFExportService } from '@/utils/pdfExport';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ScheduleExportModalProps {
  isVisible: boolean;
  onClose: () => void;
  courses: Course[];
  semester: string;
}

interface ExportOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action: () => void;
}

export default function ScheduleExportModal({
  isVisible,
  onClose,
  courses,
  semester,
}: ScheduleExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [isVisible, opacity, scale]);

  const handleICSExport = async () => {
    if (courses.length === 0) {
      Alert.alert('No Courses', 'Add some courses to your schedule first!');
      return;
    }

    setIsExporting(true);
    try {
      await CalendarExportService.exportScheduleToCalendar(courses, semester);
      Alert.alert(
        'Export Successful!',
        `Your ${courses.length}-course schedule has been exported as a calendar file (.ics). You can import it into Google Calendar, Apple Calendar, Outlook, or any other calendar app.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'There was an error exporting your schedule. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoogleCalendar = async () => {
    if (courses.length === 0) {
      Alert.alert('No Courses', 'Add some courses to your schedule first!');
      return;
    }

    try {
      // For multiple courses, we'll export as .ics and let user import to Google
      // Individual course links would be too many
      Alert.alert(
        'Google Calendar Import',
        'Use the "Export Calendar File" option to get a .ics file that you can import into Google Calendar.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Export File', onPress: handleICSExport }
        ]
      );
    } catch (error) {
      console.error('Google Calendar error:', error);
      Alert.alert('Error', 'Could not open Google Calendar');
    }
  };

  const handleAppleCalendar = async () => {
    if (courses.length === 0) {
      Alert.alert('No Courses', 'Add some courses to your schedule first!');
      return;
    }

    setIsExporting(true);
    try {
      await CalendarExportService.generateCalendarUrl(courses, semester);
      const supported = await Linking.canOpenURL('calshow://');
      
      if (supported) {
        // Try to open Apple Calendar directly
        await Linking.openURL('calshow://');
        // Then fallback to sharing the .ics file for import
        setTimeout(() => handleICSExport(), 1000);
      } else {
        // Direct fallback to file export
        await CalendarExportService.exportScheduleToCalendar(courses, semester);
        Alert.alert(
          'Import to Apple Calendar',
          'The calendar file has been shared. Open it with Apple Calendar to import your courses.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Apple Calendar error:', error);
      Alert.alert(
        'Import Failed',
        'Could not open Apple Calendar directly. The calendar file has been exported instead.',
        [{ text: 'OK' }, { text: 'Try Export', onPress: handleICSExport }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareLink = async () => {
    if (courses.length === 0) {
      Alert.alert('No Courses', 'Add some courses to your schedule first!');
      return;
    }

    setIsExporting(true);
    try {
      // Generate a comprehensive text summary of the schedule
      const scheduleText = courses.map(course => {
        const days = course.meetingDays?.join('') || 'TBD';
        const time = course.startTime && course.endTime 
          ? `${course.startTime}-${course.endTime}`
          : course.meetingTime;
        const location = course.buildingCode && course.roomNumber
          ? `${course.buildingCode} ${course.roomNumber}`
          : course.location;
        
        const enrollment = `${course.enrollmentCurrent}/${course.enrollmentCap}`;
        const rating = course.professorRating ? ` (★${course.professorRating.overall.toFixed(1)})` : '';
        const credits = `${course.credits} credits`;
        
        return `${course.courseCode}: ${course.title}\n` +
               `${days} ${time} • ${location}\n` +
               `Prof: ${course.professor}${rating}\n` +
               `${credits} • Enrollment: ${enrollment}\n`;
      }).join('\n');

      const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
      const shareText = `My ${semester} Course Schedule (${totalCredits} credits):\n\n${scheduleText}\n✨ Generated with CourseSwipe`;

      // Use dynamic imports for better performance
      const [Sharing, FileSystem] = await Promise.all([
        import('expo-sharing'),
        import('expo-file-system')
      ]);

      if (await Sharing.isAvailableAsync()) {
        // Create a temporary text file to share
        const fileUri = `${FileSystem.documentDirectory}schedule_${semester.replace(/\s+/g, '_')}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, shareText);
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Course Schedule',
        });
        
        Alert.alert(
          'Shared Successfully!',
          'Your schedule has been shared as a text file.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        throw new Error('Sharing not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(
        'Share Failed',
        'There was an error sharing your schedule. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePDFExport = async () => {
    if (courses.length === 0) {
      Alert.alert('No Courses', 'Add some courses to your schedule first!');
      return;
    }

    setIsExporting(true);
    try {
      await PDFExportService.exportScheduleToPDF(courses, semester, {
        title: `${semester} Course Schedule`,
        includeDetails: true,
        colorCoded: true,
        orientation: 'landscape'
      });
      
      Alert.alert(
        'PDF Generated!',
        `Your schedule with ${courses.length} courses has been generated as an HTML file. You can print it as PDF or view it in your browser.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'There was an error generating your PDF schedule. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions: ExportOption[] = [
    {
      id: 'pdf',
      title: 'Export as PDF',
      subtitle: 'Create printable schedule with details',
      icon: 'document-text-outline',
      color: SwipeColors.danger,
      action: handlePDFExport,
    },
    {
      id: 'ics',
      title: 'Export Calendar File',
      subtitle: 'Download .ics file for any calendar app',
      icon: 'calendar-outline',
      color: SwipeColors.accentBlue,
      action: handleICSExport,
    },
    {
      id: 'google',
      title: 'Google Calendar',
      subtitle: 'Import directly to Google Calendar',
      icon: 'logo-google',
      color: '#4285F4',
      action: handleGoogleCalendar,
    },
    {
      id: 'apple',
      title: 'Apple Calendar',
      subtitle: 'Open in iOS/macOS Calendar app',
      icon: 'logo-apple',
      color: '#007AFF',
      action: handleAppleCalendar,
    },
    {
      id: 'share',
      title: 'Share Schedule',
      subtitle: 'Share with friends or advisors',
      icon: 'share-outline',
      color: SwipeColors.success,
      action: handleShareLink,
    },
  ];

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView intensity={25} style={styles.blurOverlay}>
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={styles.modalContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Export Schedule</Text>
                    <Text style={styles.modalSubtitle}>
                      {courses.length} course{courses.length !== 1 ? 's' : ''} • {semester}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={SwipeColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                  {exportOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.exportOption,
                        isExporting && styles.optionDisabled,
                      ]}
                      onPress={option.action}
                      disabled={isExporting}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: `${option.color}20` }]}>
                        <Ionicons name={option.icon} size={24} color={option.color} />
                      </View>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>{option.title}</Text>
                        <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={SwipeColors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {isExporting && (
                  <View style={styles.loadingContainer}>
                    <View style={styles.loadingSpinner} />
                    <Text style={styles.loadingText}>Exporting schedule...</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.7,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  optionsContainer: {
    maxHeight: screenHeight * 0.4,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: SwipeColors.highlightBorder,
    marginTop: 16,
  },
  loadingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SwipeColors.accentBlue,
    borderTopColor: 'transparent',
    marginBottom: 8,
    // Note: In a real implementation, you'd want to add rotation animation
  },
  loadingText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    fontWeight: '500',
  },
});