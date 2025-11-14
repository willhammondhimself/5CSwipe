import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  BookOpenIcon,
  AcademicCapIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';

interface PlanManagerProps {
  visible: boolean;
  onClose: () => void;
  currentCourses: Course[];
  onPlanActivate?: () => void;
}

export default function PlanManager({ 
  visible, 
  onClose, 
  currentCourses, 
  onPlanActivate 
}: PlanManagerProps) {
  const {
    plans,
    createPlan,
    duplicatePlan,
    deletePlan,
    renamePlan,
    setActivePlan,
    addCourseToPlan,
    removeCourseFromPlan,
    createPlanFromCourses,
  } = useScheduleVariants();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCourseManagerModal, setShowCourseManagerModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;

    await createPlan(newPlanName.trim(), newPlanDescription.trim());
    setNewPlanName('');
    setNewPlanDescription('');
    setShowCreateModal(false);
  };

  const handleDuplicatePlan = async (planId: string) => {
    await duplicatePlan(planId);
  };

  const handleDeletePlan = (planId: string) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this schedule plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => await deletePlan(planId)
        }
      ]
    );
  };

  const handleRenamePlan = async () => {
    if (!newPlanName.trim() || !selectedPlan) return;

    await renamePlan(selectedPlan.id, newPlanName.trim(), newPlanDescription.trim());
    setNewPlanName('');
    setNewPlanDescription('');
    setSelectedPlan(null);
    setShowRenameModal(false);
  };

  const handleActivatePlan = async (planId: string) => {
    await setActivePlan(planId);
    onPlanActivate?.();
  };

  const handleManageCourses = (plan: any) => {
    setSelectedPlan(plan);
    setShowCourseManagerModal(true);
  };

  const handleCreatePlanFromCourses = async () => {
    if (currentCourses.length === 0) return;
    
    const planName = `Plan ${new Date().toLocaleDateString()}`;
    await createPlanFromCourses(planName, currentCourses, 'Created from current liked courses');
  };


  const PlanCard = ({ plan }: { plan: any }) => (
    <LinearGradient
      colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
      style={[styles.planCard, plan.isActive && styles.activePlanCard]}
    >
      {plan.isActive && (
        <View style={styles.activeBadge}>
          <CheckCircleIcon size={16} color={SwipeColors.accentBlue} />
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{plan.name}</Text>
          {plan.description && (
            <Text style={styles.planDescription}>{plan.description}</Text>
          )}
        </View>
        
        <View style={styles.planActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleManageCourses(plan)}
          >
            <BookOpenIcon size={16} color={SwipeColors.accentBlue} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedPlan(plan);
              setNewPlanName(plan.name);
              setNewPlanDescription(plan.description);
              setShowRenameModal(true);
            }}
          >
            <PencilIcon size={16} color={SwipeColors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDuplicatePlan(plan.id)}
          >
            <DocumentDuplicateIcon size={16} color={SwipeColors.textTertiary} />
          </TouchableOpacity>
          
          {plan.id !== 'main_schedule' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePlan(plan.id)}
            >
              <TrashIcon size={16} color={SwipeColors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.planStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{plan.courses.length}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {plan.courses.reduce((sum: number, course: Course) => sum + course.credits, 0)}
          </Text>
          <Text style={styles.statLabel}>Credits</Text>
        </View>
      </View>


      <View style={styles.planFooter}>
        <Text style={styles.lastModified}>
          Modified {plan.lastModified.toLocaleDateString()}
        </Text>
        
        {!plan.isActive ? (
          <TouchableOpacity
            style={styles.activateButton}
            onPress={() => handleActivatePlan(plan.id)}
          >
            <ArrowRightIcon size={14} color="#FFFFFF" />
            <Text style={styles.activateButtonText}>Activate</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeText}>Current Plan</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule Plans</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.summaryCard}
          >
            <ChartBarIcon size={24} color={SwipeColors.accentBlue} />
            <Text style={styles.summaryText}>
              {plans.length} schedule plan{plans.length !== 1 ? 's' : ''} created
            </Text>
          </LinearGradient>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ScrollView>

        <View style={styles.actionButtons}>
          {currentCourses.length > 0 && (
            <TouchableOpacity
              style={[styles.createButton, styles.secondaryButton]}
              onPress={handleCreatePlanFromCourses}
            >
              <AcademicCapIcon size={16} color={SwipeColors.accentBlue} />
              <Text style={[styles.createButtonText, styles.secondaryButtonText]}>
                Save Current as Plan
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <PlusIcon size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create New Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Create Plan Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Create New Plan</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Plan name"
                placeholderTextColor={SwipeColors.textTertiary}
                value={newPlanName}
                onChangeText={setNewPlanName}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor={SwipeColors.textTertiary}
                value={newPlanDescription}
                onChangeText={setNewPlanDescription}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewPlanName('');
                    setNewPlanDescription('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.createModalButton]}
                  onPress={handleCreatePlan}
                  disabled={!newPlanName.trim()}
                >
                  <Text style={styles.createModalButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* Rename Plan Modal */}
        <Modal
          visible={showRenameModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Edit Plan</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Plan name"
                placeholderTextColor={SwipeColors.textTertiary}
                value={newPlanName}
                onChangeText={setNewPlanName}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor={SwipeColors.textTertiary}
                value={newPlanDescription}
                onChangeText={setNewPlanDescription}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowRenameModal(false);
                    setSelectedPlan(null);
                    setNewPlanName('');
                    setNewPlanDescription('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.createModalButton]}
                  onPress={handleRenamePlan}
                  disabled={!newPlanName.trim()}
                >
                  <Text style={styles.createModalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* Course Management Modal */}
        <Modal
          visible={showCourseManagerModal}
          transparent
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.courseManagerContainer}>
            <View style={styles.courseManagerHeader}>
              <Text style={styles.courseManagerTitle}>
                Manage Courses - {selectedPlan?.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCourseManagerModal(false);
                  setSelectedPlan(null);
                }}
                style={styles.closeButton}
              >
                <XMarkIcon size={24} color={SwipeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.courseManagerContent}>
              <View style={styles.courseSection}>
                <Text style={styles.courseSectionTitle}>
                  Plan Courses ({selectedPlan?.courses?.length || 0})
                </Text>
                {selectedPlan?.courses?.map((course: Course) => (
                  <LinearGradient
                    key={course.id}
                    colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                    style={styles.courseItem}
                  >
                    <View style={styles.courseInfo}>
                      <Text style={styles.courseCode}>{course.courseCode}</Text>
                      <Text style={styles.courseTitle}>{course.title}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeCourseButton}
                      onPress={() => removeCourseFromPlan(selectedPlan.id, course.id)}
                    >
                      <TrashIcon size={16} color={SwipeColors.danger} />
                    </TouchableOpacity>
                  </LinearGradient>
                ))}
              </View>

              {currentCourses.length > 0 && (
                <View style={styles.courseSection}>
                  <Text style={styles.courseSectionTitle}>
                    Available Courses ({currentCourses.length})
                  </Text>
                  <Text style={styles.courseSectionSubtitle}>
                    Tap to add courses to this plan
                  </Text>
                  {currentCourses
                    .filter(course => !selectedPlan?.courses?.some((pc: Course) => pc.id === course.id))
                    .map(course => (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.availableCourseItem}
                        onPress={() => selectedPlan && addCourseToPlan(selectedPlan.id, course)}
                      >
                        <LinearGradient
                          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                          style={styles.courseItem}
                        >
                          <View style={styles.courseInfo}>
                            <Text style={styles.courseCode}>{course.courseCode}</Text>
                            <Text style={styles.courseTitle}>{course.title}</Text>
                          </View>
                          <PlusIcon size={16} color={SwipeColors.accentBlue} />
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summary: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
  },
  activePlanCard: {
    borderColor: SwipeColors.accentBlue,
    borderWidth: 2,
  },
  activeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingRight: 70,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    lineHeight: 16,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: SwipeColors.textTertiary,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    gap: 6,
  },
  conflictText: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.danger,
    flexShrink: 1,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastModified: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SwipeColors.accentBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  activateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.textTertiary,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    margin: 20,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  secondaryButtonText: {
    color: SwipeColors.accentBlue,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SwipeColors.accentBlue,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    margin: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: SwipeColors.textPrimary,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  createModalButton: {
    backgroundColor: SwipeColors.accentBlue,
  },
  createModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Course Manager Modal Styles
  courseManagerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  courseManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  courseManagerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  courseManagerContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  courseSection: {
    marginTop: 24,
  },
  courseSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  courseSectionSubtitle: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    marginBottom: 16,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
  },
  removeCourseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  availableCourseItem: {
    marginBottom: 12,
  },
});