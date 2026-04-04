import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { billApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';

// ─── Menu Item ───────────────────────────────────────────

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuLeft}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.danger : Colors.textSecondary}
        />
        <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Bottom Sheet Modal ──────────────────────────────────

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Option Row ──────────────────────────────────────────

interface OptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function OptionRow({ label, selected, onPress }: OptionRowProps) {
  return (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.6}>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────

const COMPANIES = ['JEPCO', 'IDECO', 'EDCO'] as const;
const COMPANY_LABELS: Record<string, string> = {
  JEPCO: 'JEPCO — Central (Amman)',
  IDECO: 'IDECO — North (Irbid)',
  EDCO: 'EDCO — South (Aqaba)',
};
const COMPANY_LABELS_AR: Record<string, string> = {
  JEPCO: 'JEPCO — الوسط (عمّان)',
  IDECO: 'IDECO — الشمال (إربد)',
  EDCO: 'EDCO — الجنوب (العقبة)',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser, subscription, logout, updateSubscription, updateUser, refreshProfile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isAr = language === 'ar';

  const [billCount, setBillCount] = useState(0);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [subscriberModal, setSubscriberModal] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [householdModal, setHouseholdModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);

  // Edit state
  const [editSubscriberNum, setEditSubscriberNum] = useState('');

  useEffect(() => {
    billApi.list(0, 0).then((r) => setBillCount(r.total)).catch(() => {});
    AsyncStorage.getItem('diaa_notifications').then((v) => {
      if (v !== null) setNotificationsOn(v === 'on');
    });
  }, []);

  const user = {
    name: authUser?.name || 'User',
    email: authUser?.email || '',
    subscriberNumber: subscription?.subscriberNumber || '—',
    distributionCompany: subscription?.distributionCompany || 'JEPCO',
    householdSize: subscription?.householdSize || 1,
  };

  // ─── Handlers ────────────────────────────────────────────

  const handleSaveSubscriberNumber = async () => {
    if (!editSubscriberNum.trim()) return;
    setSaving(true);
    try {
      await updateSubscription({ subscriberNumber: editSubscriberNum.trim() });
      setSubscriberModal(false);
    } catch (e: any) {
      Alert.alert(t('errorSaving'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCompany = async (company: string) => {
    setSaving(true);
    try {
      await updateSubscription({ distributionCompany: company });
      setCompanyModal(false);
    } catch (e: any) {
      Alert.alert(t('errorSaving'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectHousehold = async (size: number) => {
    setSaving(true);
    try {
      await updateSubscription({ householdSize: size });
      setHouseholdModal(false);
    } catch (e: any) {
      Alert.alert(t('errorSaving'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectLanguage = async (lang: 'en' | 'ar') => {
    setLanguage(lang);
    try {
      await updateUser({ language: lang === 'ar' ? 'AR' : 'EN' });
    } catch {
      // Local language change still works even if API fails
    }
    setLanguageModal(false);
  };

  const handleToggleNotifications = async () => {
    const newVal = !notificationsOn;
    setNotificationsOn(newVal);
    await AsyncStorage.setItem('diaa_notifications', newVal ? 'on' : 'off');
  };

  const handleAppearance = () => {
    Alert.alert(t('comingSoon'), t('comingSoonDesc'));
  };

  const handleExportData = () => {
    Alert.alert(t('comingSoon'), t('comingSoonDesc'));
  };

  const handleAbout = () => {
    Alert.alert(t('aboutCpaTitle'), t('aboutCpaDesc'));
  };

  const handleTerms = () => {
    Alert.alert(t('termsTitle'), t('termsDesc'));
  };

  const handleHelp = () => {
    Alert.alert(t('helpTitle2'), t('helpDesc2'));
  };

  const handleLogout = () => {
    Alert.alert(t('logoutTitle'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logOut'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>{t('account')}</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="flash-outline"
            label={t('subscriberNumber')}
            value={user.subscriberNumber}
            onPress={() => {
              setEditSubscriberNum(subscription?.subscriberNumber || '');
              setSubscriberModal(true);
            }}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="business-outline"
            label={t('distributionCompany')}
            value={user.distributionCompany}
            onPress={() => setCompanyModal(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="people-outline"
            label={t('householdSize')}
            value={`${user.householdSize} ${t('people')}`}
            onPress={() => setHouseholdModal(true)}
          />
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionLabel}>{t('settings')}</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="globe-outline"
            label={t('languageSetting')}
            value={language === 'ar' ? t('arabic') : t('english')}
            onPress={() => setLanguageModal(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="notifications-outline"
            label={t('notifications')}
            value={notificationsOn ? t('notifOn') : t('notifOff')}
            onPress={handleToggleNotifications}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="moon-outline"
            label={t('appearance')}
            value={t('light')}
            onPress={handleAppearance}
          />
        </View>

        {/* Data Section */}
        <Text style={styles.sectionLabel}>{t('data')}</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="receipt-outline"
            label={t('billHistory')}
            value={`${billCount} ${t('bills')}`}
            onPress={() => router.push('/bill')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="download-outline"
            label={t('exportData')}
            onPress={handleExportData}
          />
        </View>

        {/* About Section */}
        <Text style={styles.sectionLabel}>{t('about')}</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="shield-checkmark-outline"
            label={t('aboutCpa')}
            onPress={handleAbout}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="document-text-outline"
            label={t('termsPrivacy')}
            onPress={handleTerms}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="help-circle-outline"
            label={t('helpSupport')}
            onPress={handleHelp}
          />
        </View>

        {/* Logout */}
        <View style={[styles.menuCard, { marginTop: Spacing.lg }]}>
          <MenuItem
            icon="log-out-outline"
            label={t('logOut')}
            danger
            onPress={handleLogout}
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>{t('version')}</Text>
        <Text style={styles.versionSub}>{t('builtForCpa')}</Text>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── Subscriber Number Modal ─────────────────────── */}
      <BottomSheet
        visible={subscriberModal}
        onClose={() => setSubscriberModal(false)}
        title={t('editSubscriberNumber')}
      >
        <Text style={styles.modalHint}>{t('enterSubscriberNumber')}</Text>
        <TextInput
          style={styles.modalInput}
          value={editSubscriberNum}
          onChangeText={setEditSubscriberNum}
          placeholder="2018080012345"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={13}
          autoFocus
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={styles.modalBtnCancel}
            onPress={() => setSubscriberModal(false)}
          >
            <Text style={styles.modalBtnCancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalBtnSave, saving && { opacity: 0.6 }]}
            onPress={handleSaveSubscriberNumber}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.modalBtnSaveText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* ─── Distribution Company Modal ──────────────────── */}
      <BottomSheet
        visible={companyModal}
        onClose={() => setCompanyModal(false)}
        title={t('selectCompany')}
      >
        {COMPANIES.map((c) => (
          <OptionRow
            key={c}
            label={isAr ? COMPANY_LABELS_AR[c] : COMPANY_LABELS[c]}
            selected={user.distributionCompany === c}
            onPress={() => handleSelectCompany(c)}
          />
        ))}
        {saving && (
          <ActivityIndicator style={{ marginTop: Spacing.md }} color={Colors.primary} />
        )}
      </BottomSheet>

      {/* ─── Household Size Modal ────────────────────────── */}
      <BottomSheet
        visible={householdModal}
        onClose={() => setHouseholdModal(false)}
        title={t('selectHouseholdSize')}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <OptionRow
            key={n}
            label={`${n} ${n === 1 ? t('person') : t('people')}`}
            selected={user.householdSize === n}
            onPress={() => handleSelectHousehold(n)}
          />
        ))}
        {saving && (
          <ActivityIndicator style={{ marginTop: Spacing.md }} color={Colors.primary} />
        )}
      </BottomSheet>

      {/* ─── Language Modal ──────────────────────────────── */}
      <BottomSheet
        visible={languageModal}
        onClose={() => setLanguageModal(false)}
        title={t('selectLanguage')}
      >
        <OptionRow
          label="English"
          selected={language === 'en'}
          onPress={() => handleSelectLanguage('en')}
        />
        <OptionRow
          label="العربية"
          selected={language === 'ar'}
          onPress={() => handleSelectLanguage('ar')}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.xl },

  // User Header
  userHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.white,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Sections
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Menu
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  menuValue: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 52,
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xxl,
  },
  versionSub: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    paddingTop: Spacing.md,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  modalHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalBtnSaveText: {
    fontSize: FontSize.md,
    color: Colors.white,
    fontWeight: '600',
  },

  // Option rows
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
