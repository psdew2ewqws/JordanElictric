import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// expo-haptics removed for Expo Go compatibility
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { supabase, jepcoProxy } from '../../src/services/supabase';
import { fetch as expoFetch } from 'expo/fetch';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { t, fonts, language, sz } = useLanguage();
  const { user } = useAuth();
  const isAr = language === 'ar';

  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: isAr
        ? 'أهلاً! أنا ضياء، مساعدك الكهربائي. كيف بقدر أساعدك؟'
        : "Hi! I'm Diaa, your electricity assistant. How can I help?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  // Pre-warm jepco cache so tools have data when Claude calls them
  useEffect(() => {
    jepcoProxy.smartMeter().catch(() => {});
  }, []);

  const quickActions = [
    { label: t('chatBilling'), key: 'billing' },
    { label: t('chatCalculate'), key: 'calculate' },
    { label: t('chatComplaint'), key: 'complaint' },
    { label: t('chatTariff'), key: 'tariff' },
    { label: t('chatStatus'), key: 'status' },
  ];

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        text: trimmed,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsLoading(true);

      // Add streaming placeholder
      const botMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, text: '', sender: 'bot', timestamp: new Date(), isStreaming: true },
      ]);

      try {
        // Use expoFetch (not global fetch) for ReadableStream support on native
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const token = authSession?.access_token;
        const fnUrl = `${(supabase as any).supabaseUrl}/functions/v1/chat`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60_000);

        const response = await expoFetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': (supabase as any).supabaseKey,
          },
          body: JSON.stringify({ message: trimmed, session_id: sessionId }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          let msg = t('sorryError');
          try { const p = JSON.parse(errBody); msg = p.error || msg; } catch {}
          throw new Error(msg);
        }

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
          // Stream SSE chunks
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.thinking) {
                    // Claude is calling a tool — show thinking state
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === botMsgId ? { ...m, text: t('checkingYourData'), isStreaming: true } : m
                      )
                    );
                  } else if (parsed.text) {
                    fullText += parsed.text;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === botMsgId ? { ...m, text: fullText, isStreaming: true } : m
                      )
                    );
                  }
                  if (parsed.session_id) {
                    setSessionId(parsed.session_id);
                  }
                } catch (e) {
                  if (__DEV__) console.warn('[Chat] SSE parse error:', line, e);
                }
              }
            }
          } else {
            // Fallback: ReadableStream not available, parse full SSE response text
            const raw = await response.text();
            for (const line of raw.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text) fullText += parsed.text;
                if (parsed.session_id) setSessionId(parsed.session_id);
              } catch {}
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? { ...m, text: fullText || t('sorryError'), isStreaming: false }
                : m
            )
          );
        } else {
          // JSON response (complaint flow, templates, errors)
          const data = await response.json();
          const text = data.reply || data.error || t('sorryError');
          if (data.session_id) setSessionId(data.session_id);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId ? { ...m, text, isStreaming: false } : m
            )
          );
        }
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  text: err?.message && !isTimeout ? err.message : t('sorryErrorRetry'),
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        Keyboard.dismiss();
      }
    },
    [isLoading, sessionId, t]
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
            {item.isStreaming && !item.text ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userText : styles.botText,
                  { fontFamily: fonts.regular, fontSize: sz(14) },
                ]}
              >
                {item.text}
              </Text>
            )}
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
    [fonts, sz]
  );

  const showQuickActions = messages.length <= 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.onlineDot} />
            <Text style={[styles.headerTitle, { fontFamily: fonts.bold, fontSize: sz(18) }]}>
              {t('appName')}
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            showQuickActions ? (
              <View style={styles.quickActionsWrap}>
                <Text style={[styles.quickActionsLabel, { fontFamily: fonts.medium, fontSize: sz(12) }]}>
                  {t('chooseTopic')}
                </Text>
                <View style={styles.quickActionsRow}>
                  {quickActions.map((action) => (
                    <TouchableOpacity
                      key={action.key}
                      style={styles.quickActionChip}
                      onPress={() => sendMessage(action.label)}
                    >
                      <Text style={[styles.quickActionText, { fontFamily: fonts.medium, fontSize: sz(13) }]}>
                        {action.label}
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
          <View style={{ flex: 1 }}>
            <TextInput
              style={[styles.textInput, { fontFamily: fonts.regular, fontSize: sz(14) }]}
              placeholder={t('typeMessage')}
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              textAlign={isAr ? 'right' : 'left'}
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(inputText)}
              {...(Platform.OS === 'web' ? {
                onKeyPress: (e: any) => {
                  if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault();
                    sendMessage(inputText);
                  }
                },
              } : {})}
            />
            {inputText.length > 400 && (
              <Text style={styles.charCounter}>{inputText.length}/500</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? Colors.white : Colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

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
  charCounter: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
    marginRight: 4,
  },
});
