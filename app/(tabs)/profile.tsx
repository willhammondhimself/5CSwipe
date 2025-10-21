import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  HeartIcon,
  CalendarDaysIcon,
  ClockIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  StarIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  BellIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  CalculatorIcon,
  AcademicCapIcon,
  UserIcon,
  XMarkIcon
} from 'react-native-heroicons/outline';
import { StarIcon as StarSolidIcon } from 'react-native-heroicons/solid';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { useFilters, SchoolFilter } from '@/contexts/FilterContext';
import { useCreditSystem } from '@/contexts/CreditSystemContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useAcademicProfile } from '@/contexts/AcademicProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { DegreeRequirement } from '@/data/academicData';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import CreditRangePicker from '@/components/CreditRangePicker';
import MajorSelectionModal from '@/components/MajorSelectionModal';
import DegreeProgressVisualization from '@/components/DegreeProgressVisualization';
import RequirementDetailsModal from '@/components/RequirementDetailsModal';
import PrerequisiteValidationView from '@/components/PrerequisiteValidationView';
import NotificationSettings from '@/components/NotificationSettings';

export default function ProfileScreen() {
  const { user, profile: authProfile, signOut } = useAuth();
  const { likedCourses, superLikedCourses } = useLikedCourses();
  const { filters, updateSchoolFilter, updateShowFullCourses, updateTimeSlot, updateCreditRange } = useFilters();
  const { creditSystem, setCreditSystem, getCreditsLabel } = useCreditSystem();
  const { isPremium, setPremiumStatus, permRequestsUsed, maxPermRequests } = usePremium();
  const { profile, updateMajor, updateCredits, updateGPA } = useAcademicProfile();
  const [showTimeSlotPicker, setShowTimeSlotPicker] = useState(false);
  const [showCreditRangePicker, setShowCreditRangePicker] = useState(false);
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [showDegreeProgress, setShowDegreeProgress] = useState(false);
  const [showPrerequisites, setShowPrerequisites] = useState(false);
  const [showRequirementDetails, setShowRequirementDetails] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<DegreeRequirement | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const handleRequirementPress = (requirement: DegreeRequirement) => {
    setSelectedRequirement(requirement);
    setShowRequirementDetails(true);
  };

  const getTimeSlotLabel = () => {
    switch (filters.timeSlot) {
      case 'morning': return 'Morning (8 AM - 12 PM)';
      case 'afternoon': return 'Afternoon (12 PM - 5 PM)';
      case 'evening': return 'Evening (5 PM - 9 PM)';
      default: return 'Any time';
    }
  };

  const getUnitRangeLabel = () => {
    if (filters.creditRange[0] === filters.creditRange[1]) {
      return `${filters.creditRange[0]} credit${filters.creditRange[0] > 1 ? 's' : ''} only`;
    }
    return `${filters.creditRange[0]}-${filters.creditRange[1]} credits`;
  };

  const totalCredits = likedCourses.reduce((sum, course) => sum + course.credits, 0);
  
  const stats = [
    { label: 'Courses Liked', value: likedCourses.length, icon: HeartIcon },
    { label: 'Super Likes', value: superLikedCourses.length, icon: StarIcon },
    {
      label: creditSystem === 'hmc' ? 'HMC Credits' : 'Total Credits',
      value: creditSystem === 'hmc' ? likedCourses.reduce((sum, course) => sum + Math.round(course.credits / 3) || 1, 0) : totalCredits,
      icon: BuildingLibraryIcon
    },
    {
      label: 'Degree Progress',
      value: profile.major ? `${Math.round((profile.requirements.reduce((sum, req) => sum + req.completedCredits, 0) / profile.requirements.reduce((sum, req) => sum + req.requiredCredits, 0)) * 100)}%` : 'No Major',
      icon: AcademicCapIcon
    },
  ];

  const schools = [
    { name: 'Harvey Mudd', code: 'HMC' as SchoolFilter, color: SwipeColors.schools.HMC },
    { name: 'Pomona College', code: 'Pomona' as SchoolFilter, color: SwipeColors.schools.Pomona },
    { name: 'Claremont McKenna', code: 'CMC' as SchoolFilter, color: SwipeColors.schools.CMC },
    { name: 'Pitzer College', code: 'Pitzer' as SchoolFilter, color: SwipeColors.schools.Pitzer },
    { name: 'Scripps College', code: 'Scripps' as SchoolFilter, color: SwipeColors.schools.Scripps },
  ];

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>
            {authProfile?.full_name || user?.email || 'Customize your course discovery'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/likes')}>
              <View style={styles.settingInfo}>
                <HeartIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>My Liked Courses</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>{likedCourses.length} courses</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/(tabs)/schedule')}>
              <View style={styles.settingInfo}>
                <CalendarDaysIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>My Schedule</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>View & optimize</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <LinearGradient
                key={index}
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={styles.statCard}
              >
                <stat.icon size={24} color={SwipeColors.accentBlue} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            ))}
          </View>
        </View>

        {/* School Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>School Preferences</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            {schools.map((school, index) => (
              <View key={school.code} style={[styles.schoolRow, index > 0 && styles.schoolRowBorder]}>
                <View style={styles.schoolInfo}>
                  <View style={[styles.schoolDot, { backgroundColor: school.color }]} />
                  <Text style={styles.schoolName}>{school.name}</Text>
                </View>
                <Switch
                  value={filters.schools.includes(school.code)}
                  onValueChange={(enabled) => updateSchoolFilter(school.code, enabled)}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: SwipeColors.accentBlue }}
                  thumbColor={filters.schools.includes(school.code) ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                />
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Time Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Preferences</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowTimeSlotPicker(true)}>
              <View style={styles.settingInfo}>
                <ClockIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Preferred Time Slots</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>{getTimeSlotLabel()}</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <CalendarDaysIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Class Days</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>All days</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Academic Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Profile</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowMajorModal(true)}>
              <View style={styles.settingInfo}>
                <AcademicCapIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Major</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>
                  {profile.major ? profile.major.name : 'Select Major'}
                </Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => setShowDegreeProgress(true)}>
              <View style={styles.settingInfo}>
                <UserIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Degree Progress</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>View Details</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => setShowPrerequisites(true)}>
              <View style={styles.settingInfo}>
                <AcademicCapIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Course Prerequisites</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>View Map</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Course Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Preferences</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowCreditRangePicker(true)}>
              <View style={styles.settingInfo}>
                <BuildingLibraryIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Credit Range</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>{getUnitRangeLabel()}</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <CheckCircleIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Show Full Courses</Text>
              </View>
              <Switch
                value={filters.showFullCourses}
                onValueChange={updateShowFullCourses}
                trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: SwipeColors.accentBlue }}
                thumbColor={filters.showFullCourses ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                {isPremium ? (
                  <StarSolidIcon size={20} color={SwipeColors.accentBlue} />
                ) : (
                  <StarIcon size={20} color={SwipeColors.textSecondary} />
                )}
                <Text style={styles.settingLabel}>Premium Status</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={[styles.settingValue, isPremium && { color: SwipeColors.accentBlue }]}>
                  {isPremium ? 'Active' : 'Free'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => setPremiumStatus(!isPremium)}>
              <View style={styles.settingInfo}>
                <SparklesIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>
                  {isPremium ? 'Downgrade to Free' : 'Upgrade to Premium'}
                </Text>
              </View>
              <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <CalculatorIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>HMC Credit System</Text>
              </View>
              <Switch
                value={creditSystem === 'hmc'}
                onValueChange={(enabled) => setCreditSystem(enabled ? 'hmc' : 'standard')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: SwipeColors.accentBlue }}
                thumbColor={creditSystem === 'hmc' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
              />
            </View>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => setShowNotificationSettings(true)}>
              <View style={styles.settingInfo}>
                <BellIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <View style={styles.settingAction}>
                <Text style={styles.settingValue}>Manage alerts</Text>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <DevicePhoneMobileIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: SwipeColors.accentBlue }}
                thumbColor="#FFFFFF"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Account Section */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <LinearGradient
              colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
              style={styles.card}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <UserIcon size={20} color={SwipeColors.textSecondary} />
                  <Text style={styles.settingLabel}>Email</Text>
                </View>
                <Text style={styles.settingValue}>{user.email}</Text>
              </View>

              {authProfile && (
                <>
                  <View style={styles.divider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <BuildingLibraryIcon size={20} color={SwipeColors.textSecondary} />
                      <Text style={styles.settingLabel}>School</Text>
                    </View>
                    <Text style={styles.settingValue}>{authProfile.school}</Text>
                  </View>

                  {authProfile.graduation_year && (
                    <>
                      <View style={styles.divider} />

                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <AcademicCapIcon size={20} color={SwipeColors.textSecondary} />
                          <Text style={styles.settingLabel}>Graduation Year</Text>
                        </View>
                        <Text style={styles.settingValue}>{authProfile.graduation_year}</Text>
                      </View>
                    </>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
                <View style={styles.settingInfo}>
                  <XMarkIcon size={20} color="#FF6B6B" />
                  <Text style={[styles.settingLabel, { color: '#FF6B6B' }]}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* About Section */}
        <View style={[styles.section, { marginBottom: 150 }]}>
          <Text style={styles.sectionTitle}>About</Text>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.card}
          >
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <QuestionMarkCircleIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
              <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <InformationCircleIcon size={20} color={SwipeColors.textSecondary} />
                <Text style={styles.settingLabel}>About 5CSwipe</Text>
              </View>
              <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Time Slot Picker Modal */}
      <TimeSlotPicker
        visible={showTimeSlotPicker}
        onClose={() => setShowTimeSlotPicker(false)}
        selectedTimeSlot={filters.timeSlot}
        onSelectTimeSlot={updateTimeSlot}
      />

      {/* Unit Range Picker Modal */}
      <CreditRangePicker
        visible={showCreditRangePicker}
        onClose={() => setShowCreditRangePicker(false)}
        creditRange={filters.creditRange}
        onSelectRange={updateCreditRange}
      />

      {/* Major Selection Modal */}
      <MajorSelectionModal
        visible={showMajorModal}
        onClose={() => setShowMajorModal(false)}
        onSelectMajor={updateMajor}
        selectedMajor={profile.major}
      />

      {/* Degree Progress Modal */}
      {showDegreeProgress && (
        <Modal
          visible={showDegreeProgress}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDegreeProgress(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowDegreeProgress(false)}
                style={styles.closeButton}
              >
                <XMarkIcon size={24} color={SwipeColors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Degree Progress</Text>
              <View style={styles.headerSpacer} />
            </View>
            <DegreeProgressVisualization
              profile={profile}
              onRequirementPress={handleRequirementPress}
            />
          </View>
        </Modal>
      )}

      {/* Prerequisites Modal */}
      <PrerequisiteValidationView
        visible={showPrerequisites}
        onClose={() => setShowPrerequisites(false)}
        onCoursePress={(course) => {
          console.log('Course pressed:', course.courseCode);
          // Could navigate to course details or add to schedule
        }}
      />

      {/* Requirement Details Modal */}
      <RequirementDetailsModal
        visible={showRequirementDetails}
        onClose={() => {
          setShowRequirementDetails(false);
          setSelectedRequirement(null);
        }}
        requirement={selectedRequirement}
        onCoursePress={(course) => {
          // Navigate to course details or add to liked courses
          console.log('Course pressed:', course.courseCode);
        }}
      />

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <Modal
          visible={showNotificationSettings}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowNotificationSettings(false)}
        >
          <NotificationSettings
            onClose={() => setShowNotificationSettings(false)}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    overflow: 'hidden',
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  schoolRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  schoolDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
    marginLeft: 12,
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 52,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
});