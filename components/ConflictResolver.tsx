import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  SwatchIcon,
  ClockIcon,
  ArrowRightIcon,
} from 'react-native-heroicons/outline';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';

interface ConflictInfo {
  course: Course;
  conflictingCourse: Course;
  conflictType: 'time' | 'prerequisite' | 'capacity';
  conflictDetails: string;
}

interface ConflictResolverProps {
  visible: boolean;
  onClose: () => void;
  courseToAdd: Course;
  conflicts: ConflictInfo[];
  onForceAdd: () => void;
  onSelectAlternative?: (course: Course) => void;
  onRemoveConflicting?: (course: Course) => void;
  alternatives?: Course[];
}

interface ResolutionOption {
  id: string;
  title: string;
  description: string;
  action: () => void;
  type: 'primary' | 'secondary' | 'warning';
  icon: React.ComponentType<any>;
}

export default function ConflictResolver({
  visible,
  onClose,
  courseToAdd,
  conflicts,
  onForceAdd,
  onSelectAlternative,
  onRemoveConflicting,
  alternatives = [],
}: ConflictResolverProps) {
  
  const generateResolutionOptions = (): ResolutionOption[] => {
    const options: ResolutionOption[] = [];

    // Option 1: Force add anyway (always available)
    options.push({
      id: 'force-add',
      title: 'Add Anyway',
      description: 'Add this course despite conflicts. You can resolve conflicts later.',
      action: onForceAdd,
      type: 'warning',
      icon: ExclamationTriangleIcon,
    });

    // Option 2: Remove conflicting courses
    if (conflicts.length > 0 && onRemoveConflicting) {
      const conflictingCourses = conflicts.map(c => c.conflictingCourse);
      options.push({
        id: 'remove-conflicting',
        title: 'Replace Conflicting Courses',
        description: `Remove ${conflictingCourses.map(c => c.courseCode).join(', ')} and add ${courseToAdd.courseCode}`,
        action: () => {
          conflictingCourses.forEach(onRemoveConflicting);
          onForceAdd();
        },
        type: 'primary',
        icon: SwatchIcon,
      });
    }

    // Option 3: Select alternative courses
    if (alternatives.length > 0 && onSelectAlternative) {
      alternatives.slice(0, 2).forEach((alt, index) => {
        options.push({
          id: `alternative-${index}`,
          title: `Try ${alt.courseCode} Instead`,
          description: `${alt.title} - similar course with no conflicts`,
          action: () => onSelectAlternative(alt),
          type: 'secondary',
          icon: ArrowRightIcon,
        });
      });
    }

    return options;
  };

  const resolutionOptions = generateResolutionOptions();

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case 'time':
        return SwipeColors.danger;
      case 'prerequisite':
        return SwipeColors.warning;
      case 'capacity':
        return SwipeColors.textTertiary;
      default:
        return SwipeColors.danger;
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'time':
        return ClockIcon;
      case 'prerequisite':
        return ExclamationTriangleIcon;
      case 'capacity':
        return ExclamationTriangleIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  const ConflictCard = ({ conflict }: { conflict: ConflictInfo }) => {
    const IconComponent = getConflictIcon(conflict.conflictType);
    const color = getConflictTypeColor(conflict.conflictType);

    return (
      <LinearGradient
        colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
        style={styles.conflictCard}
      >
        <View style={styles.conflictHeader}>
          <IconComponent size={16} color={color} />
          <Text style={[styles.conflictType, { color }]}>
            {conflict.conflictType.toUpperCase()} CONFLICT
          </Text>
        </View>
        
        <View style={styles.conflictCourses}>
          <Text style={styles.courseCode}>{courseToAdd.courseCode}</Text>
          <Text style={styles.conflictWith}>conflicts with</Text>
          <Text style={styles.courseCode}>{conflict.conflictingCourse.courseCode}</Text>
        </View>
        
        <Text style={styles.conflictDetails}>{conflict.conflictDetails}</Text>
      </LinearGradient>
    );
  };

  const ResolutionButton = ({ option }: { option: ResolutionOption }) => {
    const IconComponent = option.icon;
    const getButtonStyle = () => {
      switch (option.type) {
        case 'primary':
          return styles.primaryButton;
        case 'warning':
          return styles.warningButton;
        case 'secondary':
        default:
          return styles.secondaryButton;
      }
    };

    const getTextStyle = () => {
      switch (option.type) {
        case 'primary':
          return styles.primaryButtonText;
        case 'warning':
          return styles.warningButtonText;
        case 'secondary':
        default:
          return styles.secondaryButtonText;
      }
    };

    return (
      <TouchableOpacity
        style={[styles.resolutionButton, getButtonStyle()]}
        onPress={() => {
          option.action();
          onClose();
        }}
      >
        <View style={styles.resolutionButtonContent}>
          <View style={styles.resolutionButtonHeader}>
            <IconComponent size={16} color={getTextStyle().color} />
            <Text style={[styles.resolutionButtonTitle, getTextStyle()]}>
              {option.title}
            </Text>
          </View>
          <Text style={[styles.resolutionButtonDesc, getTextStyle()]}>
            {option.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.content}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <ExclamationTriangleIcon size={24} color={SwipeColors.warning} />
                <Text style={styles.title}>Schedule Conflict</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <XMarkIcon size={20} color={SwipeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Course Info */}
              <View style={styles.courseSection}>
                <Text style={styles.sectionTitle}>Course to Add</Text>
                <LinearGradient
                  colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                  style={styles.courseCard}
                >
                  <Text style={styles.courseCode}>{courseToAdd.courseCode}</Text>
                  <Text style={styles.courseTitle}>{courseToAdd.title}</Text>
                  <Text style={styles.courseMeeting}>{courseToAdd.meetingTime}</Text>
                </LinearGradient>
              </View>

              {/* Conflicts */}
              <View style={styles.conflictsSection}>
                <Text style={styles.sectionTitle}>
                  {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Detected
                </Text>
                {conflicts.map((conflict, index) => (
                  <ConflictCard key={index} conflict={conflict} />
                ))}
              </View>

              {/* Resolution Options */}
              <View style={styles.resolutionSection}>
                <Text style={styles.sectionTitle}>Resolution Options</Text>
                {resolutionOptions.map((option) => (
                  <ResolutionButton key={option.id} option={option} />
                ))}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 20,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  courseSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
  },
  courseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    marginBottom: 4,
  },
  courseMeeting: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
  },
  conflictsSection: {
    marginBottom: 20,
  },
  conflictCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    marginBottom: 12,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  conflictCourses: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictWith: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  conflictDetails: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    lineHeight: 16,
  },
  resolutionSection: {
    marginBottom: 20,
  },
  resolutionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: SwipeColors.highlightBorder,
  },
  warningButton: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  resolutionButtonContent: {
    flex: 1,
  },
  resolutionButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resolutionButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resolutionButtonDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: SwipeColors.textSecondary,
  },
  warningButtonText: {
    color: '#FF9500',
  },
});