/**
 * [token].tsx
 * ===========
 * Public schedule view page (no auth required)
 *
 * Features:
 * - View schedule by share token
 * - Read-only calendar display
 * - School branding
 * - "Create Your Own" CTA
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDaysIcon,
  BuildingLibraryIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  ArrowLeftIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import HyperscheduleCalendar from '@/components/HyperscheduleCalendar';
import { supabase } from '@/lib/supabase';
import { Course } from '@/data/mockCourses';

interface SchedulePlan {
  id: string;
  name: string;
  description?: string;
  semester: string;
  totalCredits: number;
  courseCount: number;
  color: string;
  createdAt: string;
  user: {
    school: string;
    graduationYear: number;
  };
  courses: Course[];
}

export default function PublicScheduleView() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<SchedulePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSchedule();
    }
  }, [token]);

  async function loadSchedule() {
    try {
      setLoading(true);
      setError(null);

      // Fetch schedule by share token
      const { data: planData, error: planError } = await supabase
        .from('user_schedule_plans')
        .select(`
          id,
          name,
          description,
          semester,
          total_credits,
          course_count,
          color,
          created_at,
          course_ids,
          user_profiles!inner(
            school,
            graduation_year
          )
        `)
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

      if (planError) {
        console.error('❌ Error fetching schedule:', planError);
        setError('Schedule not found or is private');
        setLoading(false);
        return;
      }

      if (!planData) {
        setError('Schedule not found');
        setLoading(false);
        return;
      }

      // Fetch courses for this schedule
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .in('id', planData.course_ids || []);

      if (coursesError) {
        console.error('❌ Error fetching courses:', coursesError);
      }

      // Map to SchedulePlan format
      const schedulePlan: SchedulePlan = {
        id: planData.id,
        name: planData.name,
        description: planData.description,
        semester: planData.semester,
        totalCredits: planData.total_credits,
        courseCount: planData.course_count,
        color: planData.color,
        createdAt: planData.created_at,
        user: {
          school: planData.user_profiles.school,
          graduationYear: planData.user_profiles.graduation_year,
        },
        courses: (coursesData || []).map((course: any) => ({
          id: course.id,
          courseCode: course.course_code,
          title: course.title,
          description: course.description,
          professor: course.professor,
          school: course.school,
          credits: course.credits,
          meetingTime: course.meeting_time,
          location: course.location,
          semester: course.semester,
          department: course.department,
          spots: course.spots,
          enrolled: course.enrolled,
          waitlist: course.waitlist,
          courseStatus: course.course_status,
        })),
      };

      setSchedule(schedulePlan);
      console.log('✅ Loaded public schedule:', schedulePlan.name);
    } catch (err) {
      console.error('❌ Error loading schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={SwipeColors.primary} />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  if (error || !schedule) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorIcon}>🔒</Text>
        <Text style={styles.errorTitle}>Schedule Not Found</Text>
        <Text style={styles.errorMessage}>
          {error || 'This schedule may be private or the link is invalid'}
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.ctaButtonText}>Create Your Own Schedule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeftIcon size={24} color={SwipeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>{schedule.name}</Text>
            <View style={[styles.schoolBadge, { backgroundColor: SwipeColors.schools[schedule.user.school] }]}>
              <Text style={styles.schoolText}>{schedule.user.school}</Text>
            </View>
          </View>

          {schedule.description && (
            <Text style={styles.headerDescription}>{schedule.description}</Text>
          )}

          <View style={styles.headerMeta}>
            <View style={styles.metaItem}>
              <CalendarDaysIcon size={14} color={SwipeColors.textTertiary} />
              <Text style={styles.metaText}>{schedule.semester}</Text>
            </View>
            <View style={styles.metaItem}>
              <BuildingLibraryIcon size={14} color={SwipeColors.textTertiary} />
              <Text style={styles.metaText}>{schedule.courseCount} courses</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>{schedule.totalCredits} credits</Text>
            </View>
          </View>

          <Text style={styles.readOnlyBadge}>👁️ Read-Only View</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarSection}>
          <HyperscheduleCalendar
            courses={schedule.courses}
            onCoursePress={(course) => {
              Alert.alert(
                course.courseCode,
                `${course.title}\n\n${course.professor}\n${course.meetingTime}\n${course.location}`,
                [{ text: 'OK' }]
              );
            }}
          />
        </View>

        {/* Course List */}
        <View style={styles.courseListSection}>
          <Text style={styles.sectionTitle}>Courses</Text>
          {schedule.courses.map((course, index) => (
            <LinearGradient
              key={course.id}
              colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
              style={[styles.courseCard, index > 0 && styles.courseCardSpacing]}
            >
              <View style={[styles.courseBadge, { backgroundColor: SwipeColors.schools[course.school] }]}>
                <Text style={styles.courseBadgeText}>{course.school}</Text>
              </View>

              <View style={styles.courseHeader}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.courseTitle}>{course.title}</Text>
              </View>

              <View style={styles.courseDetails}>
                <View style={styles.detailRow}>
                  <UserIcon size={14} color={SwipeColors.textTertiary} />
                  <Text style={styles.detailText}>{course.professor}</Text>
                </View>
                <View style={styles.detailRow}>
                  <ClockIcon size={14} color={SwipeColors.textTertiary} />
                  <Text style={styles.detailText}>{course.meetingTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPinIcon size={14} color={SwipeColors.textTertiary} />
                  <Text style={styles.detailText}>{course.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <BuildingLibraryIcon size={14} color={SwipeColors.textTertiary} />
                  <Text style={styles.detailText}>{course.credits} credit{course.credits > 1 ? 's' : ''}</Text>
                </View>
              </View>
            </LinearGradient>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Want to create your own schedule?</Text>
          <Text style={styles.ctaSubtitle}>
            Join 5CSwipe to discover courses and build your perfect schedule
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.ctaButtonText}>Get Started Free</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorIcon: {
    fontSize: 80,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerContent: {
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.5,
    flex: 1,
  },
  schoolBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerDescription: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    lineHeight: 20,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
  },
  readOnlyBadge: {
    fontSize: 12,
    color: SwipeColors.accentYellow,
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  calendarSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  courseListSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 8,
  },
  courseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
  },
  courseCardSpacing: {
    marginTop: 12,
  },
  courseBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  courseBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  courseHeader: {
    marginBottom: 12,
    paddingRight: 50,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 16,
  },
  courseDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    flex: 1,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  ctaButton: {
    backgroundColor: SwipeColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: SwipeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
