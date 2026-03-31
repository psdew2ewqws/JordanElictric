import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

function generateRefNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `REF-${num}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => (isAr ? Math.max(11, en * 0.85) : en);

  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: t('chatWelcome'),
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const quickActions = [
    t('reportIssue'),
    t('billingQuestion'),
    t('generalInquiry'),
  ];

  const addBotResponse = useCallback(() => {
    const ref = generateRefNumber();
    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      text: `${t('chatThankYou')} ${ref}`,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMsg]);
  }, [t]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        text: trimmed,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      setTimeout(() => {
        addBotResponse();
      }, 1000);
    },
    [addBotResponse],
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === 'user';
      return (
        <View
          style={[
            styles.messageBubbleWrap,
            isUser ? styles.messageBubbleWrapUser : styles.messageBubbleWrapBot,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.botText,
                { fontFamily: fonts.regular, fontSize: sz(14) },
              ]}
            >
              {item.text}
            </Text>
          </View>
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.timestampUser : styles.timestampBot,
              { fontFamily: fonts.regular },
            ]}
          >
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      );
    },
    [fonts, sz],
  );

  const showQuickActions = messages.length <= 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.onlineDot} />
            <Text
              style={[
                styles.headerTitle,
                { fontFamily: fonts.bold, fontSize: sz(18) },
              ]}
            >
              {t('chatTitle')}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            showQuickActions ? (
              <View style={styles.quickActionsWrap}>
                <Text
                  style={[
                    styles.quickActionsLabel,
                    { fontFamily: fonts.medium, fontSize: sz(12) },
                  ]}
                >
                  {isAr ? 'اختر موضوعًا:' : 'Choose a topic:'}
                </Text>
                <View style={styles.quickActionsRow}>
                  {quickActions.map((action) => (
                    <TouchableOpacity
                      key={action}
                      style={styles.quickActionChip}
                      onPress={() => handleQuickAction(action)}
                    >
                      <Text
                        style={[
                          styles.quickActionText,
                          { fontFamily: fonts.medium, fontSize: sz(13) },
                        ]}
                      >
                        {action}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={[
              styles.textInput,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
            placeholder={t('typeMessage')}
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            textAlign={isAr ? 'right' : 'left'}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? Colors.white : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  headerTitle: {
    color: Colors.text,
  },
  headerSpacer: { width: 36 },

  // Messages
  messageList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    flexGrow: 1,
  },
  messageBubbleWrap: {
    marginBottom: Spacing.md,
    maxWidth: '80%',
  },
  messageBubbleWrapUser: {
    alignSelf: 'flex-end',
  },
  messageBubbleWrapBot: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Spacing.xs,
  },
  botBubble: {
    backgroundColor: Colors.surfaceAlt,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    lineHeight: 20,
  },
  userText: {
    color: Colors.white,
  },
  botText: {
    color: Colors.text,
  },
  timestamp: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  timestampUser: {
    textAlign: 'right',
  },
  timestampBot: {
    textAlign: 'left',
  },

  // Quick actions
  quickActionsWrap: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionsLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  quickActionText: {
    color: Colors.primary,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
});
