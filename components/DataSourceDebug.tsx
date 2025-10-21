import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  InformationCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { courseDataService } from '@/services/courseDataService';

interface DataSourceDebugProps {
  visible: boolean;
  onClose: () => void;
}

export default function DataSourceDebug({ visible, onClose }: DataSourceDebugProps) {
  const [scraperHealth, setScraperHealth] = useState<any>(null);
  const [scraperStats, setScraperStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading scraper data...');
      
      // Get health status
      const health = await courseDataService.getScraperHealth();
      console.log('📊 Scraper health:', health);
      setScraperHealth(health);

      // Get statistics
      const stats = courseDataService.getScraperStats();
      console.log('📈 Scraper stats:', stats);
      setScraperStats(stats);

    } catch (error) {
      console.error('❌ Error loading scraper data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return SwipeColors.success;
      case 'degraded': return SwipeColors.warning;
      case 'unhealthy': return SwipeColors.danger;
      default: return SwipeColors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircleIcon;
      case 'degraded': return ExclamationTriangleIcon;
      case 'unhealthy': return ExclamationTriangleIcon;
      default: return InformationCircleIcon;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient
        colors={[SwipeColors.backgroundPrimary, SwipeColors.backgroundSecondary]}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Real Data Status</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Real Data Integration Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔗 Integration Status</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <CheckCircleIcon size={20} color={SwipeColors.success} />
                <Text style={styles.statusText}>Real data scraper connected</Text>
              </View>
              <View style={styles.statusRow}>
                <CheckCircleIcon size={20} color={SwipeColors.success} />
                <Text style={styles.statusText}>Enhanced data types loaded</Text>
              </View>
              <View style={styles.statusRow}>
                <CheckCircleIcon size={20} color={SwipeColors.success} />
                <Text style={styles.statusText}>Fallback system active</Text>
              </View>
              <View style={styles.statusRow}>
                <ClockIcon size={20} color={SwipeColors.warning} />
                <Text style={styles.statusText}>Cache TTL: 15 minutes</Text>
              </View>
            </View>
          </View>

          {/* Scraper Health */}
          {scraperHealth && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏥 Scraper Health</Text>
              <View style={styles.card}>
                <View style={styles.healthRow}>
                  <View style={styles.healthHeader}>
                    {(() => {
                      const StatusIcon = getStatusIcon(scraperHealth.overall);
                      return <StatusIcon size={24} color={getStatusColor(scraperHealth.overall)} />;
                    })()}
                    <Text style={[styles.healthStatus, { color: getStatusColor(scraperHealth.overall) }]}>
                      {scraperHealth.overall.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    Last checked: {new Date(scraperHealth.timestamp).toLocaleTimeString()}
                  </Text>
                </View>

                {scraperHealth.schools && (
                  <View style={styles.schoolsHealth}>
                    <Text style={styles.subSectionTitle}>School Status:</Text>
                    {scraperHealth.schools.map((school: any, index: number) => {
                      const StatusIcon = getStatusIcon(school.status);
                      return (
                        <View key={index} style={styles.schoolHealthRow}>
                          <StatusIcon size={16} color={getStatusColor(school.status)} />
                          <Text style={styles.schoolName}>{school.school}</Text>
                          <Text style={[styles.schoolStatus, { color: getStatusColor(school.status) }]}>
                            {school.status}
                          </Text>
                          {school.responseTime > 0 && (
                            <Text style={styles.responseTime}>
                              {school.responseTime}ms
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Scraper Statistics */}
          {scraperStats && !scraperStats.error && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Scraper Statistics</Text>
              <View style={styles.card}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Courses:</Text>
                  <Text style={styles.statValue}>{scraperStats.totalCourses}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Success Rate:</Text>
                  <Text style={styles.statValue}>{scraperStats.overallSuccessRate.toFixed(1)}%</Text>
                </View>

                {scraperStats.schools && (
                  <View style={styles.schoolsStats}>
                    <Text style={styles.subSectionTitle}>School Performance:</Text>
                    {scraperStats.schools.map((school: any, index: number) => (
                      <View key={index} style={styles.schoolStatsRow}>
                        <Text style={styles.schoolName}>{school.school}</Text>
                        <View style={styles.schoolMetrics}>
                          <Text style={styles.schoolMetric}>
                            {school.successfulRequests}/{school.totalRequests}
                          </Text>
                          <Text style={styles.schoolMetric}>
                            {school.totalRequests > 0 
                              ? ((school.successfulRequests / school.totalRequests) * 100).toFixed(0)
                              : 0}%
                          </Text>
                          {school.averageResponseTime > 0 && (
                            <Text style={styles.schoolMetric}>
                              {school.averageResponseTime.toFixed(0)}ms avg
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Current Data Source */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Current Data Flow</Text>
            <View style={styles.card}>
              <Text style={styles.flowStep}>1. Real data scraper attempts collection</Text>
              <Text style={styles.flowStep}>2. Data cached for 15 minutes</Text>
              <Text style={styles.flowStep}>3. Enhanced data fields processed</Text>
              <Text style={styles.flowStep}>4. Converted to Course format for UI</Text>
              <Text style={styles.flowStep}>5. Fallback to mock data on failure</Text>
            </View>
          </View>

          {/* Debug Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛠️ Debug Actions</Text>
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={loadData}
                disabled={isLoading}
              >
                <Text style={styles.debugButtonText}>
                  {isLoading ? 'Refreshing...' : 'Refresh Data'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => {
                  courseDataService.clearCache();
                  console.log('🗑️ Cache cleared');
                }}
              >
                <Text style={styles.debugButtonText}>Clear Cache</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: SwipeColors.textPrimary,
    marginLeft: 8,
  },
  healthRow: {
    marginBottom: 16,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  schoolsHealth: {
    marginTop: 8,
  },
  schoolHealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  schoolName: {
    fontSize: 14,
    color: SwipeColors.textPrimary,
    flex: 1,
    marginLeft: 8,
  },
  schoolStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  responseTime: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  schoolsStats: {
    marginTop: 12,
  },
  schoolStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  schoolMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  schoolMetric: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
  },
  flowStep: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    marginBottom: 6,
    paddingLeft: 8,
  },
  debugButton: {
    backgroundColor: SwipeColors.accentBlue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});