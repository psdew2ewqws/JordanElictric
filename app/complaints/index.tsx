import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useToast } from '../../src/contexts/ToastContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { complaintApi } from '../../src/services/api';

type ComplaintType = 'OUTAGE' | 'BILLING' | 'METER' | 'VOLTAGE' | 'OTHER';
type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Complaint {
  id: string;
  referenceNumber?: string;
  complaintType: ComplaintType;
  status: ComplaintStatus;
  description: string;
  createdAt: string;
}

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#D97706',
  RESOLVED: '#059669',
  CLOSED: '#94A3B8',
};

const TYPE_COLORS: Record<ComplaintType, string> = {
  OUTAGE: '#E8930C',
  BILLING: '#059669',
  METER: '#6366F1',
  VOLTAGE: '#DC2626',
  OTHER: '#94A3B8',
};

const FORM_TYPES: {
  key: ComplaintType;
  labelKey: 'typeBilling' | 'typeMeter' | 'typeVoltage' | 'typeOther';
}[] = [
  { key: 'BILLING', labelKey: 'typeBilling' },
  { key: 'METER', labelKey: 'typeMeter' },
  { key: 'VOLTAGE', labelKey: 'typeVoltage' },
  { key: 'OTHER', labelKey: 'typeOther' },
];

function getStatusLabel(
  status: ComplaintStatus,
  t: (key: string) => string,
): string {
  const map: Record<ComplaintStatus, string> = {
    OPEN: t('statusOpen'),
    IN_PROGRESS: t('statusInProgress'),
    RESOLVED: t('statusResolved'),
    CLOSED: t('statusClosed'),
  };
  return map[status] || status;
}

function getTypeLabel(
  type: ComplaintType,
  t: (key: string) => string,
  isAr: boolean,
): string {
  const map: Record<ComplaintType, string> = {
    OUTAGE: isAr ? 'انقطاع' : 'Outage',
    BILLING: t('typeBilling'),
    METER: t('typeMeter'),
    VOLTAGE: t('typeVoltage'),
    OTHER: t('typeOther'),
  };
  return map[type] || type;
}

function formatDate(dateStr: string, isAr: boolean): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isAr ? 'ar-JO' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ComplaintsScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const { showToast } = useToast();
  const isAr = language === 'ar';
  const sz = (en: number) => (isAr ? Math.max(11, en * 0.85) : en);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New report form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<ComplaintType | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      setError(null);
      const data = await complaintApi.list();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // On 401, just show empty state — don't block the screen
      if (err?.status === 401) {
        setComplaints([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load complaints';
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSubmit = useCallback(async () => {
    if (!formType || !formDescription.trim()) return;

    setSubmitting(true);
    try {
      const result = await complaintApi.create({
        complaintType: formType,
        description: formDescription.trim(),
      });
      setShowForm(false);
      setFormType(null);
      setFormDescription('');
      const ref = result?.reference_number || result?.id?.slice(0, 8) || '';
      showToast(
        isAr ? `تم تقديم الشكوى: ${ref}` : `Complaint filed: ${ref}`,
        'success',
      );
      fetchComplaints();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : isAr ? 'فشل تقديم الشكوى' : 'Failed to submit complaint';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [formType, formDescription, isAr, fetchComplaints]);

  const handleNewReport = useCallback(() => {
    setShowForm(true);
  }, []);

  const renderComplaintCard = useCallback(
    (complaint: Complaint) => {
      const statusColor = STATUS_COLORS[complaint.status] || Colors.textMuted;
      const typeColor = TYPE_COLORS[complaint.complaintType] || Colors.textMuted;

      return (
        <View key={complaint.id} style={styles.card}>
          {/* Top row: ref + status */}
          <View style={styles.cardTopRow}>
            <Text
              style={[
                styles.cardRef,
                { fontFamily: fonts.bold, fontSize: sz(13) },
              ]}
            >
              {complaint.referenceNumber || `#${complaint.id.slice(0, 8)}`}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusColor, fontFamily: fonts.medium, fontSize: sz(11) },
                ]}
              >
                {getStatusLabel(complaint.status, t as (key: string) => string)}
              </Text>
            </View>
          </View>

          {/* Type + date */}
          <View style={styles.cardMidRow}>
            <View
              style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: typeColor, fontFamily: fonts.medium, fontSize: sz(11) },
                ]}
              >
                {getTypeLabel(complaint.complaintType, t as (key: string) => string, isAr)}
              </Text>
            </View>
            <Text
              style={[
                styles.cardDate,
                { fontFamily: fonts.regular, fontSize: sz(11) },
              ]}
            >
              {formatDate(complaint.createdAt, isAr)}
            </Text>
          </View>

          {/* Description preview */}
          <Text
            style={[
              styles.cardDesc,
              { fontFamily: fonts.regular, fontSize: sz(13) },
            ]}
            numberOfLines={2}
          >
            {complaint.description}
          </Text>
        </View>
      );
    },
    [fonts, sz, t, isAr],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: fonts.bold, fontSize: sz(18) },
          ]}
        >
          {t('reportsTracking')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text
            style={[
              styles.errorText,
              { fontFamily: fonts.medium, fontSize: sz(14) },
            ]}
          >
            {error}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchComplaints}>
            <Text
              style={[
                styles.retryText,
                { fontFamily: fonts.semibold, fontSize: sz(14) },
              ]}
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="document-text-outline"
              size={56}
              color={Colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              { fontFamily: fonts.bold, fontSize: sz(18) },
            ]}
          >
            {t('noReportsYet')}
          </Text>
          <Text
            style={[
              styles.emptyDesc,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
          >
            {t('noReportsDesc')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {complaints.map(renderComplaintCard)}
        </ScrollView>
      )}

      {/* FAB: New Report */}
      <TouchableOpacity style={styles.fab} onPress={handleNewReport}>
        <Ionicons name="add" size={24} color={Colors.white} />
        <Text
          style={[
            styles.fabText,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {t('newReport')}
        </Text>
      </TouchableOpacity>

      {/* New Report Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowForm(false); setFormType(null); setFormDescription(''); }}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); setFormType(null); setFormDescription(''); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text
              style={[
                styles.modalTitle,
                { fontFamily: fonts.bold, fontSize: sz(18) },
              ]}
            >
              {t('newReport')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type picker */}
            <Text
              style={[
                styles.label,
                { fontFamily: fonts.semibold, fontSize: sz(14) },
              ]}
            >
              {t('complaintType')}
            </Text>
            <View style={styles.chipsRow}>
              {/* Outage chip redirects */}
              <TouchableOpacity
                style={[styles.chip, styles.chipOutage]}
                onPress={() => {
                  setShowForm(false);
                  setFormType(null);
                  setFormDescription('');
                  router.push('/outage/');
                }}
              >
                <Ionicons name="flash-off" size={14} color="#E8930C" />
                <Text
                  style={[
                    styles.chipText,
                    { color: '#E8930C', fontFamily: fonts.medium, fontSize: sz(13) },
                  ]}
                >
                  {isAr ? 'انقطاع' : 'Outage'}
                </Text>
                <Ionicons name="open-outline" size={12} color="#E8930C" />
              </TouchableOpacity>

              {FORM_TYPES.map((option) => {
                const selected = formType === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setFormType(selected ? null : option.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                        { fontFamily: fonts.medium, fontSize: sz(13) },
                      ]}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description */}
            <Text
              style={[
                styles.label,
                { fontFamily: fonts.semibold, fontSize: sz(14) },
              ]}
            >
              {t('description')}
            </Text>
            <TextInput
              style={[
                styles.textarea,
                { fontFamily: fonts.regular, fontSize: sz(14) },
              ]}
              placeholder={t('describeIssue')}
              placeholderTextColor={Colors.textMuted}
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              numberOfLines={5}
              maxLength={500}
              textAlignVertical="top"
              textAlign={isAr ? 'right' : 'left'}
            />
            {formDescription.length > 300 && (
              <Text style={[styles.charCounter, { fontFamily: fonts.regular, fontSize: sz(11) }]}>
                {formDescription.length}/500
              </Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!formType || !formDescription.trim()) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!formType || !formDescription.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text
                  style={[
                    styles.submitBtnText,
                    { fontFamily: fonts.semibold, fontSize: sz(15) },
                  ]}
                >
                  {t('submitComplaint')}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text,
  },
  headerSpacer: { width: 36 },

  // Content states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorText: {
    color: Colors.danger,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryText: {
    color: Colors.white,
  },

  // Empty state
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardRef: {
    color: Colors.text,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {},
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeText: {},
  cardDate: {
    color: Colors.textMuted,
  },
  cardDesc: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Spacing.xxl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadows.lg,
  },
  fabText: {
    color: Colors.white,
  },

  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    color: Colors.text,
  },
  modalScroll: { flex: 1 },
  modalScrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  // Form fields
  label: {
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipOutage: {
    backgroundColor: '#FEF3C7',
    borderColor: '#E8930C' + '40',
  },
  chipSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
  },
  textarea: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 120,
  },
  charCounter: {
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    ...Shadows.md,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  submitBtnText: {
    color: Colors.white,
  },
});
