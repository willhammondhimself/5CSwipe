import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { BellIcon, CheckCircleIcon, XCircleIcon } from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPreferences } from '@/services/notificationService';

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const {
    isInitialized,
    hasPermission,
    preferences,
    subscriptions,
    isLoading,
    requestPermissions,
    updatePreferences,
    cancelAllSubscriptions,
    getNotificationStats,
  } = useNotifications();

  const stats = getNotificationStats();

  const handlePermissionRequest = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Notification Permission Required',
        'Please enable notifications in your device settings to receive course alerts.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePreferenceUpdate = async (updates: Partial<NotificationPreferences>) => {
    await updatePreferences(updates);
  };

  const handleCancelAll = () => {
    Alert.alert(
      'Cancel All Notifications',
      'Are you sure you want to cancel all notification subscriptions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: cancelAllSubscriptions,
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XCircleIcon width={24} height={24} color={SwipeColors.textPrimaryPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XCircleIcon width={24} height={24} color={SwipeColors.textPrimaryPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <BellIcon width={48} height={48} color={SwipeColors.accentBlue} />
          <Text style={styles.permissionTitle}>Enable Notifications</Text>
          <Text style={styles.permissionText}>
            Get notified when spots open up in courses you&apos;re interested in, waitlist positions change, and enrollment deadlines approach.
          </Text>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handlePermissionRequest}
          >
            <Text style={styles.enableButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <XCircleIcon width={24} height={24} color={SwipeColors.textPrimaryPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Subscriptions</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalSubscriptions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.spotAlerts}</Text>
              <Text style={styles.statLabel}>Spot Alerts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.waitlistAlerts}</Text>
              <Text style={styles.statLabel}>Waitlist</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.enrollmentReminders}</Text>
              <Text style={styles.statLabel}>Reminders</Text>
            </View>
          </View>
          {stats.totalSubscriptions > 0 && (
            <TouchableOpacity
              style={styles.cancelAllButton}
              onPress={handleCancelAll}
            >
              <Text style={styles.cancelAllText}>Cancel All Subscriptions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Enable or disable all push notifications
              </Text>
            </View>
            <Switch
              value={preferences?.enablePushNotifications ?? true}
              onValueChange={(value) =>
                handlePreferenceUpdate({ enablePushNotifications: value })
              }
              trackColor={{
                false: SwipeColors.buttonBorder,
                true: SwipeColors.accentBlue + '40',
              }}
              thumbColor={
                preferences?.enablePushNotifications
                  ? SwipeColors.accentBlue
                  : SwipeColors.textPrimaryTertiary
              }
            />
          </View>
        </View>

        {/* Notification Types */}
        {preferences?.enablePushNotifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Spot Alerts</Text>
                <Text style={styles.settingDescription}>
                  When spots become available in full courses
                </Text>
              </View>
              <Switch
                value={preferences?.enableSpotAlerts ?? true}
                onValueChange={(value) =>
                  handlePreferenceUpdate({ enableSpotAlerts: value })
                }
                trackColor={{
                  false: SwipeColors.buttonBorder,
                  true: SwipeColors.accentBlue + '40',
                }}
                thumbColor={
                  preferences?.enableSpotAlerts
                    ? SwipeColors.accentBlue
                    : SwipeColors.textPrimaryTertiary
                }
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Waitlist Alerts</Text>
                <Text style={styles.settingDescription}>
                  When your waitlist position changes
                </Text>
              </View>
              <Switch
                value={preferences?.enableWaitlistAlerts ?? true}
                onValueChange={(value) =>
                  handlePreferenceUpdate({ enableWaitlistAlerts: value })
                }
                trackColor={{
                  false: SwipeColors.buttonBorder,
                  true: SwipeColors.accentBlue + '40',
                }}
                thumbColor={
                  preferences?.enableWaitlistAlerts
                    ? SwipeColors.accentBlue
                    : SwipeColors.textPrimaryTertiary
                }
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enrollment Reminders</Text>
                <Text style={styles.settingDescription}>
                  Reminders about upcoming enrollment deadlines
                </Text>
              </View>
              <Switch
                value={preferences?.enableEnrollmentReminders ?? true}
                onValueChange={(value) =>
                  handlePreferenceUpdate({ enableEnrollmentReminders: value })
                }
                trackColor={{
                  false: SwipeColors.buttonBorder,
                  true: SwipeColors.accentBlue + '40',
                }}
                thumbColor={
                  preferences?.enableEnrollmentReminders
                    ? SwipeColors.accentBlue
                    : SwipeColors.textPrimaryTertiary
                }
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Course Added Alerts</Text>
                <Text style={styles.settingDescription}>
                  When courses are added to your watchlist
                </Text>
              </View>
              <Switch
                value={preferences?.enableCourseAddedAlerts ?? true}
                onValueChange={(value) =>
                  handlePreferenceUpdate({ enableCourseAddedAlerts: value })
                }
                trackColor={{
                  false: SwipeColors.buttonBorder,
                  true: SwipeColors.accentBlue + '40',
                }}
                thumbColor={
                  preferences?.enableCourseAddedAlerts
                    ? SwipeColors.accentBlue
                    : SwipeColors.textPrimaryTertiary
                }
              />
            </View>
          </View>
        )}

        {/* Quiet Hours */}
        {preferences?.enablePushNotifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  Disable notifications during specified hours
                </Text>
              </View>
              <Switch
                value={preferences?.quietHoursEnabled ?? true}
                onValueChange={(value) =>
                  handlePreferenceUpdate({ quietHoursEnabled: value })
                }
                trackColor={{
                  false: SwipeColors.buttonBorder,
                  true: SwipeColors.accentBlue + '40',
                }}
                thumbColor={
                  preferences?.quietHoursEnabled
                    ? SwipeColors.accentBlue
                    : SwipeColors.textPrimaryTertiary
                }
              />
            </View>

            {preferences?.quietHoursEnabled && (
              <View style={styles.quietHoursInfo}>
                <Text style={styles.quietHoursText}>
                  Quiet hours: {preferences?.quietHoursStart ?? '22:00'} - {preferences?.quietHoursEnd ?? '08:00'}
                </Text>
                <Text style={styles.quietHoursSubtext}>
                  Tap to customize quiet hours
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Sound Settings */}
        {preferences?.enablePushNotifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sound & Vibration</Text>
            
            <View style={styles.soundOptions}>
              {(['default', 'subtle', 'urgent'] as const).map((sound) => (
                <TouchableOpacity
                  key={sound}
                  style={[
                    styles.soundOption,
                    preferences?.notificationSound === sound && styles.soundOptionSelected,
                  ]}
                  onPress={() => handlePreferenceUpdate({ notificationSound: sound })}
                >
                  <Text
                    style={[
                      styles.soundOptionText,
                      preferences?.notificationSound === sound && styles.soundOptionTextSelected,
                    ]}
                  >
                    {sound.charAt(0).toUpperCase() + sound.slice(1)}
                  </Text>
                  {preferences?.notificationSound === sound && (
                    <CheckCircleIcon width={16} height={16} color={SwipeColors.accentBlue} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.buttonBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  enableButton: {
    backgroundColor: SwipeColors.accentBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  enableButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: SwipeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: SwipeColors.accentBlue,
  },
  statLabel: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    marginTop: 4,
  },
  cancelAllButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelAllText: {
    color: SwipeColors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.buttonBorder,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
  quietHoursInfo: {
    backgroundColor: SwipeColors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  quietHoursText: {
    fontSize: 16,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  quietHoursSubtext: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  soundOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  soundOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: SwipeColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SwipeColors.buttonBorder,
  },
  soundOptionSelected: {
    borderColor: SwipeColors.accentBlue,
    backgroundColor: SwipeColors.accentBlue + '10',
  },
  soundOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
    marginRight: 4,
  },
  soundOptionTextSelected: {
    color: SwipeColors.accentBlue,
  },
});