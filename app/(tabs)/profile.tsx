import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { mockUser } from '../../src/utils/mockData';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
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

export default function ProfileScreen() {
  const user = mockUser;

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
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="flash-outline"
            label="Subscriber Number"
            value={user.subscriberNumber}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="business-outline"
            label="Distribution Company"
            value={user.distributionCompany}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="people-outline"
            label="Household Size"
            value={`${user.householdSize} people`}
          />
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="globe-outline"
            label="Language"
            value="English"
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            value="On"
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="moon-outline"
            label="Appearance"
            value="Light"
          />
        </View>

        {/* Data Section */}
        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="receipt-outline"
            label="Bill History"
            value="12 bills"
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="download-outline"
            label="Export Data"
          />
        </View>

        {/* About Section */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="shield-checkmark-outline"
            label="About CPA Jordan"
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="document-text-outline"
            label="Terms & Privacy"
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
          />
        </View>

        {/* Logout */}
        <View style={[styles.menuCard, { marginTop: Spacing.lg }]}>
          <MenuItem
            icon="log-out-outline"
            label="Log Out"
            danger
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>JordanElectricity v1.0.0</Text>
        <Text style={styles.versionSub}>Built for CPA Jordan</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
});
