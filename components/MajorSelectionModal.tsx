import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { XMarkIcon, CheckIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Major, majors } from '@/data/academicData';

interface MajorSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMajor: (major: Major) => void;
  selectedMajor: Major | null;
  title?: string;
}

export default function MajorSelectionModal({
  visible,
  onClose,
  onSelectMajor,
  selectedMajor,
  title = "Select Your Major"
}: MajorSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  const schools = ['all', 'HMC', 'Pomona', 'CMC', 'Pitzer', 'Scripps'];

  const filteredMajors = majors.filter(major => {
    const matchesSearch = major.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         major.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === 'all' || major.school === selectedSchool;
    return matchesSearch && matchesSchool;
  });

  const handleSelectMajor = (major: Major) => {
    onSelectMajor(major);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MagnifyingGlassIcon size={20} color={SwipeColors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search majors..."
              placeholderTextColor={SwipeColors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* School Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {schools.map((school) => (
              <TouchableOpacity
                key={school}
                style={[
                  styles.filterChip,
                  selectedSchool === school && styles.filterChipActive
                ]}
                onPress={() => setSelectedSchool(school)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedSchool === school && styles.filterChipTextActive
                ]}>
                  {school === 'all' ? 'All Schools' : school}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Majors List */}
        <ScrollView style={styles.majorsList} showsVerticalScrollIndicator={false}>
          {filteredMajors.map((major) => (
            <TouchableOpacity
              key={major.id}
              style={styles.majorCard}
              onPress={() => handleSelectMajor(major)}
            >
              <LinearGradient
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={styles.majorGradient}
              >
                <View style={styles.majorHeader}>
                  <View style={styles.majorInfo}>
                    <Text style={styles.majorName}>{major.name}</Text>
                    <Text style={styles.majorDepartment}>{major.department}</Text>
                  </View>
                  <View style={styles.majorMeta}>
                    <View style={[styles.schoolBadge, { backgroundColor: SwipeColors.schools[major.school] }]}>
                      <Text style={styles.schoolText}>{major.school}</Text>
                    </View>
                    {selectedMajor?.id === major.id && (
                      <View style={styles.selectedIndicator}>
                        <CheckIcon size={16} color={SwipeColors.accentBlue} />
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.majorDescription}>{major.description}</Text>

                <View style={styles.majorDetails}>
                  <Text style={styles.detailText}>
                    {major.totalCredits} total credits
                  </Text>
                  <Text style={styles.detailText}>
                    {major.requiredCourses.length} required courses
                  </Text>
                  <Text style={styles.detailText}>
                    {major.electiveCourses.length} electives
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          {filteredMajors.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No majors found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or school filter
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
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
    marginLeft: 12,
    fontSize: 16,
    color: SwipeColors.textPrimary,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
  },
  filterChipTextActive: {
    color: SwipeColors.accentBlue,
  },
  majorsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  majorCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  majorGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  majorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  majorInfo: {
    flex: 1,
  },
  majorName: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  majorDepartment: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  majorMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  schoolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  majorDescription: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  majorDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
  },
});
