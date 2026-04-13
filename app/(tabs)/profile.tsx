import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert,
  ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useToast } from '../../src/contexts/ToastContext';
import { billApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useFabScroll } from '../../src/components/DiaaFab';

const C = {
  white: '#FFFFFF',
  offWhite: '#F4F6F8',
  gray100: '#EAEDF0',
  gray200: '#D1D5DB',
  gray400: '#111827',
  gray600: '#4B5563',
  gray800: '#1F2937',
  navy: '#1B4965',
  red: '#B91C1C',
  redBg: '#FEF2F2',
};
const COMPANIES = ['JEPCO', 'IDECO', 'EDCO'] as const;

// ─── Components ──────────────────────────────────────────

function Row({ icon, label, value, onPress }: { icon: string; label: string; value?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon as any} size={18} color={C.gray400} style={{ width: 24 }} />
      <Text style={s.rowLabel}>{label}</Text>
      {value && <Text style={s.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={15} color={C.gray200} />
    </TouchableOpacity>
  );
}

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{title}</Text>
            {children}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Pick({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.pick, { backgroundColor: selected ? 'rgba(20, 61, 92, 0.06)' : 'transparent' }]} onPress={onPress} activeOpacity={0.6}>
      <Text style={[s.pickText, selected && s.pickTextActive]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color={C.navy} />}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user: au, subscription: sub, logout, updateSubscription, updateUser } = useAuth();
  const { t, language, setLanguage, fonts } = useLanguage();
  const { showToast } = useToast();
  const { onScroll: onFabScroll } = useFabScroll();
  const isAr = language === 'ar';

  const [billCount, setBillCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subModal, setSubModal] = useState(false);
  const [coModal, setCoModal] = useState(false);
  const [hhModal, setHhModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [editNum, setEditNum] = useState('');

  const fetchProfileData = () => {
    billApi.list(0, 0).then((r) => setBillCount(r.total)).catch(() => {});
    AsyncStorage.getItem('diaa_notifications').then((v) => { if (v !== null) setNotifOn(v === 'on'); });
  };

  useEffect(() => { fetchProfileData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    fetchProfileData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const name = au?.name || 'User';
  const email = au?.email || '';
  const subNum = sub?.subscriberNumber || '—';
  const co = sub?.distributionCompany || 'JEPCO';
  const hh = sub?.householdSize || 1;

  const saveSub = async () => { if (!editNum.trim()) return; setSaving(true); try { await updateSubscription({ subscriberNumber: editNum.trim() }); setSubModal(false); showToast(t('saved'), 'success'); } catch { showToast(t('saveFailed'), 'error'); } finally { setSaving(false); } };
  const pickCo = async (v: string) => { setSaving(true); try { await updateSubscription({ distributionCompany: v }); setCoModal(false); } catch {} finally { setSaving(false); } };
  const pickHh = async (n: number) => { setSaving(true); try { await updateSubscription({ householdSize: n }); setHhModal(false); } catch {} finally { setSaving(false); } };
  const pickLang = async (l: 'en' | 'ar') => { setLanguage(l); try { await updateUser({ language: l === 'ar' ? 'AR' : 'EN' }); } catch {} setLangModal(false); };
  const toggleNotif = async () => { const v = !notifOn; setNotifOn(v); await AsyncStorage.setItem('diaa_notifications', v ? 'on' : 'off'); };
  const doLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('logoutConfirm'))) {
        (async () => { await logout(); router.replace('/auth/login'); })();
      }
    } else {
      Alert.alert(t('logoutTitle'), t('logoutConfirm'), [{ text: t('cancel'), style: 'cancel' }, { text: t('logOut'), style: 'destructive', onPress: async () => { await logout(); router.replace('/auth/login'); } }]);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} onScroll={onFabScroll} scrollEventThrottle={32} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Identity — no avatar circle, just clean text */}
        <View style={s.identity}>
          <Text style={[s.name, { fontFamily: fonts.bold, letterSpacing: isAr ? 0 : -0.3 }]}>{name}</Text>
          <Text style={[s.email, { fontFamily: fonts.regular }]}>{email}</Text>
        </View>

        {/* Account */}
        <Text style={[s.section, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.8 }]}>{t('account')}</Text>
        <View style={s.group}>
          <Row icon="flash-outline" label={t('subscriberNumber')} value={subNum} onPress={() => { setEditNum(sub?.subscriberNumber || ''); setSubModal(true); }} />
          <Row icon="business-outline" label={t('distributionCompany')} value={co} onPress={() => setCoModal(true)} />
          <Row icon="people-outline" label={t('householdSize')} value={`${hh} ${t('people')}`} onPress={() => setHhModal(true)} />
        </View>

        {/* Settings */}
        <Text style={[s.section, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.8 }]}>{t('settings')}</Text>
        <View style={s.group}>
          <Row icon="globe-outline" label={t('languageSetting')} value={language === 'ar' ? t('arabic') : t('english')} onPress={() => setLangModal(true)} />
          <Row icon="notifications-outline" label={t('notifications')} value={notifOn ? t('notifOn') : t('notifOff')} onPress={toggleNotif} />
        </View>

        {/* Data */}
        <Text style={[s.section, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.8 }]}>{t('data')}</Text>
        <View style={s.group}>
          <Row icon="receipt-outline" label={t('billHistory')} value={`${billCount}`} onPress={() => router.push('/bill')} />
        </View>

        {/* About */}
        <Text style={[s.section, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.8 }]}>{t('about')}</Text>
        <View style={s.group}>
          <Row icon="information-circle-outline" label={t('aboutCpa')} onPress={() => Alert.alert(t('aboutCpaTitle'), t('aboutCpaDesc'))} />
          <Row icon="document-text-outline" label={t('termsPrivacy')} onPress={() => Alert.alert(t('termsTitle'), t('termsDesc'))} />
          <Row icon="help-circle-outline" label={t('helpSupport')} onPress={() => Alert.alert(t('helpTitle2'), t('helpDesc2'))} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutRow} onPress={doLogout}>
          <Ionicons name="log-out-outline" size={18} color={C.red} />
          <Text style={[s.logoutText, { fontFamily: fonts.medium }]}>{t('logOut')}</Text>
        </TouchableOpacity>

        <Text style={[s.ver, { fontFamily: fonts.regular }]}>{t('version')}</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modals — lazy: only mount when open */}
      {subModal && (
        <Sheet visible={subModal} onClose={() => setSubModal(false)} title={t('editSubscriberNumber')}>
          <TextInput style={s.input} value={editNum} onChangeText={setEditNum} placeholder="2018080012345" placeholderTextColor={C.gray400} keyboardType="number-pad" maxLength={13} autoFocus />
          <View style={s.sheetBtns}>
            <TouchableOpacity onPress={() => setSubModal(false)}><Text style={s.cancelText}>{t('cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveSub} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>{t('save')}</Text>}
            </TouchableOpacity>
          </View>
        </Sheet>
      )}
      {coModal && (
        <Sheet visible={coModal} onClose={() => setCoModal(false)} title={t('selectCompany')}>
          {COMPANIES.map((c) => <Pick key={c} label={c} selected={co === c} onPress={() => pickCo(c)} />)}
        </Sheet>
      )}
      {hhModal && (
        <Sheet visible={hhModal} onClose={() => setHhModal(false)} title={t('selectHouseholdSize')}>
          {[1,2,3,4,5,6,7,8,9,10].map((n) => <Pick key={n} label={`${n} ${n === 1 ? t('person') : t('people')}`} selected={hh === n} onPress={() => pickHh(n)} />)}
        </Sheet>
      )}
      {langModal && (
        <Sheet visible={langModal} onClose={() => setLangModal(false)} title={t('selectLanguage')}>
          <Pick label="English" selected={language === 'en'} onPress={() => pickLang('en')} />
          <Pick label="العربية" selected={language === 'ar'} onPress={() => pickLang('ar')} />
        </Sheet>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.offWhite },
  identity: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },
  name: { fontSize: 22, color: C.gray800 },
  email: { fontSize: 13, color: C.gray400, marginTop: 3 },
  section: { fontSize: 11, color: C.gray400, textTransform: 'uppercase', paddingHorizontal: 20, marginTop: 22, marginBottom: 6 },
  group: { marginHorizontal: 16, backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 10 },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', color: C.gray800 },
  rowValue: { fontSize: 13, fontFamily: 'Inter-Regular', color: C.gray400 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 28, backgroundColor: C.redBg, borderRadius: 10, paddingVertical: 13, gap: 8 },
  logoutText: { fontSize: 14, color: C.red },
  ver: { textAlign: 'center', fontSize: 11, color: C.gray400, marginTop: 20 },

  // Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 10, maxHeight: '70%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.gray200, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: C.gray800, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter-Regular', color: C.gray800, backgroundColor: C.offWhite },
  sheetBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 18 },
  cancelText: { fontSize: 14, fontFamily: 'Inter-Medium', color: C.gray400 },
  saveBtn: { backgroundColor: C.navy, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  saveText: { fontSize: 14, fontFamily: 'Inter-Bold', color: C.white },
  pick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.gray100, borderRadius: 8, marginHorizontal: -4 },
  pickText: { fontSize: 14, fontFamily: 'Inter-Regular', color: C.gray800 },
  pickTextActive: { fontFamily: 'Inter-Bold', color: C.navy },
});
