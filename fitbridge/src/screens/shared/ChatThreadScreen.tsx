import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ViewStyle, TextStyle, ImageStyle,
  Image, KeyboardAvoidingView, Platform, Keyboard,
  Animated, ActivityIndicator, Alert, ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { chatService } from '../../services/api/chatService';
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from '../../services/api/cloudinaryService';
import { Message } from '../../types/chat.types';

type Props = NativeStackScreenProps<any, 'ChatThread'>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const THIRTY_MIN_MS   = 30 * 60 * 1000;
const MY_BUBBLE_COLOR = COLORS.PRIMARY;           // #4F46E5 Electric Blue
const RX_BUBBLE_COLOR = COLORS.SURFACE_2;         // #253347 Mid Slate
const AI_TINT         = `${COLORS.INFO}18`;       // 10% cyan
const AI_BORDER       = `${COLORS.INFO}44`;       // 27% cyan

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format absolute time for timestamp dividers — JetBrains Mono */
const formatDivider = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    month: 'short', day: 'numeric',
  });

/** Format bubble time — e.g. "9:15 AM" */
const formatBubbleTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

/** Generate a unique-enough ID for optimistic messages */
const genId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Timestamp Divider
// ─────────────────────────────────────────────────────────────────────────────

const TimeDivider: React.FC<{ timestamp: string }> = ({ timestamp }) => (
  <View style={divS.wrap}>
    <View style={divS.line} />
    <Text style={divS.text}>{formatDivider(timestamp)}</Text>
    <View style={divS.line} />
  </View>
);

const divS = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: SPACING.MD, paddingHorizontal: SPACING.SCREEN_H_PAD,
  } as ViewStyle,
  line: { flex: 1, height: 1, backgroundColor: COLORS.CARD_BORDER } as ViewStyle,
  text: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
    marginHorizontal: SPACING.SM,
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Insight Card
// ─────────────────────────────────────────────────────────────────────────────

const AIInsightCard: React.FC<{ message: Message }> = ({ message }) => (
  <View style={aiS.wrap}>
    <View style={aiS.card}>
      <View style={aiS.header}>
        <Text style={aiS.sparkle}>✨</Text>
        <Text style={aiS.label}>FitBridge AI Insight</Text>
      </View>
      <Text style={aiS.body}>{message.text}</Text>
      <Text style={aiS.time}>{formatBubbleTime(message.timestamp)}</Text>
    </View>
  </View>
);

const aiS = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.SCREEN_H_PAD, marginVertical: SPACING.SM, alignItems: 'center' } as ViewStyle,
  card: {
    backgroundColor: AI_TINT,
    borderWidth: 1, borderColor: AI_BORDER,
    borderRadius: TYPOGRAPHY.RADIUS.XL,
    padding: SPACING.MD,
    gap: 6,
    maxWidth: '88%',
  } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.XS } as ViewStyle,
  sparkle: { fontSize: 14 } as TextStyle,
  label: {
    color: COLORS.INFO,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  body: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY,
    lineHeight: 20,
  } as TextStyle,
  time: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
    alignSelf: 'flex-end',
    marginTop: 2,
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  participantAvatar: string;
}

const MessageBubble: React.FC<BubbleProps> = React.memo(({
  message, isMine, showAvatar, participantAvatar,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 220, useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (message.isAIInsight) return <AIInsightCard message={message} />;

  return (
    <Animated.View
      style={[
        bubS.row,
        isMine ? bubS.rowMine : bubS.rowRx,
        { opacity: fadeAnim },
      ]}
    >
      {/* Received: avatar on left */}
      {!isMine && (
        <View style={bubS.avatarCol}>
          {showAvatar ? (
            <Image
              source={{ uri: participantAvatar }}
              style={bubS.avatar as ImageStyle}
            />
          ) : (
            <View style={bubS.avatarPlaceholder} />
          )}
        </View>
      )}

      {/* Bubble */}
      <View
        style={[
          bubS.bubble,
          isMine ? bubS.bubbleMine : bubS.bubbleRx,
          // Tail shaping: flatten the corner closest to avatar/edge
          isMine ? bubS.tailMine : (showAvatar ? bubS.tailRx : null),
        ]}
      >
        {/* Message text */}
        <Text style={[bubS.text, isMine ? bubS.textMine : bubS.textRx]}>
          {message.text}
        </Text>

        {/* Time — right-aligned within bubble */}
        <Text style={[bubS.time, isMine ? bubS.timeMine : bubS.timeRx]}>
          {formatBubbleTime(message.timestamp)}
          {isMine && <Text style={bubS.tick}>  ✓</Text>}
        </Text>
      </View>
    </Animated.View>
  );
});

const bubS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    marginVertical: 3,
    alignItems: 'flex-end',
    gap: SPACING.SM,
  } as ViewStyle,
  rowMine: { justifyContent: 'flex-end' } as ViewStyle,
  rowRx:   { justifyContent: 'flex-start' } as ViewStyle,

  // Avatar slot (received side)
  avatarCol: { width: 32, flexShrink: 0 } as ViewStyle,
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER } as ImageStyle,
  avatarPlaceholder: { width: 32, height: 32 } as ViewStyle,

  // Bubble base
  bubble: {
    maxWidth: '75%',
    borderRadius: TYPOGRAPHY.RADIUS.LG,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  } as ViewStyle,
  bubbleMine: {
    backgroundColor: MY_BUBBLE_COLOR,
    borderBottomRightRadius: 4,    // flattened tail
  } as ViewStyle,
  bubbleRx: {
    backgroundColor: RX_BUBBLE_COLOR,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    borderBottomLeftRadius: 4,     // default; flattened when showAvatar
  } as ViewStyle,
  tailMine: { borderBottomRightRadius: 4 } as ViewStyle,
  tailRx:   { borderBottomLeftRadius: 4 } as ViewStyle,

  // Text
  text: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, lineHeight: 22 } as TextStyle,
  textMine: { color: COLORS.WHITE } as TextStyle,
  textRx:   { color: COLORS.TEXT_PRIMARY } as TextStyle,

  // Timestamp row inside bubble
  time: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.MONO,
    alignSelf: 'flex-end',
  } as TextStyle,
  timeMine: { color: 'rgba(255,255,255,0.55)' } as TextStyle,
  timeRx:   { color: COLORS.TEXT_MUTED } as TextStyle,
  tick:     { color: 'rgba(255,255,255,0.55)' } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Input Bar
// ─────────────────────────────────────────────────────────────────────────────

interface InputBarProps {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
  onAttach: (source: 'camera' | 'library') => void;
  attaching?: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ value, onChange, onSend, onAttach, attaching }) => {
  const canSend = value.trim().length > 0;

  const handleAttachPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', '📷 Camera', '🖼️ Photo Library'], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) onAttach('camera'); else if (idx === 2) onAttach('library'); },
      );
    } else {
      // On Android show an Alert with options (no ActionSheet built-in)
      Alert.alert('Attach Media', 'Choose source', [
        { text: 'Camera',        onPress: () => onAttach('camera') },
        { text: 'Photo Library', onPress: () => onAttach('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={inS.wrap}>
      {/* Camera / attachment button */}
      <TouchableOpacity style={inS.iconBtn} activeOpacity={0.7} onPress={handleAttachPress} disabled={attaching}>
        {attaching
          ? <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          : <Text style={inS.iconText}>📷</Text>
        }
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        style={inS.input}
        value={value}
        onChangeText={onChange}
        placeholder="Message…"
        placeholderTextColor={COLORS.TEXT_MUTED}
        multiline
        numberOfLines={1}
        maxLength={2000}
        returnKeyType="default"
        blurOnSubmit={false}
      />

      {/* Send button */}
      <TouchableOpacity
        style={[inS.sendBtn, canSend ? inS.sendActive : inS.sendDisabled]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.8}
      >
        <Text style={[inS.sendIcon, canSend && inS.sendIconActive]}>➤</Text>
      </TouchableOpacity>
    </View>
  );
};

const inS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    paddingBottom: SPACING.MD,
    gap: SPACING.XS,
    backgroundColor: COLORS.SURFACE_1,
    borderTopWidth: 1,
    borderTopColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  iconBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: TYPOGRAPHY.RADIUS.SM,
  } as ViewStyle,
  iconText: { fontSize: 18, opacity: 0.65 } as TextStyle,
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,           // ~4 lines
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    borderRadius: TYPOGRAPHY.RADIUS.XL,
    paddingHorizontal: 16,
    paddingVertical: SPACING.SM,
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY,
    lineHeight: 22,
  } as TextStyle,
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 0,
  } as ViewStyle,
  sendActive: { backgroundColor: COLORS.PRIMARY } as ViewStyle,
  sendDisabled: { backgroundColor: COLORS.SURFACE_3 } as ViewStyle,
  sendIcon: { color: COLORS.TEXT_MUTED, fontSize: 16 } as TextStyle,
  sendIconActive: { color: COLORS.WHITE } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  participantName: string;
  participantAvatar: string;
  isTyping: boolean;
  onBack: () => void;
}

const ChatHeader: React.FC<HeaderProps> = ({
  participantName, participantAvatar, isTyping, onBack,
}) => (
  <View style={hdS.wrap}>
    {/* Back */}
    <TouchableOpacity style={hdS.backBtn} onPress={onBack} activeOpacity={0.7}>
      <Text style={hdS.backArrow}>←</Text>
    </TouchableOpacity>

    {/* Avatar + name + status */}
    <View style={hdS.mid}>
      <View style={hdS.avatarWrap}>
        <Image source={{ uri: participantAvatar }} style={hdS.avatar as ImageStyle} />
        {/* Online dot — static for now; backend will drive this */}
        <View style={hdS.onlineDot} />
      </View>
      <View style={hdS.nameCol}>
        <Text style={hdS.name} numberOfLines={1}>{participantName}</Text>
        <Text style={hdS.status}>
          {isTyping ? '✍️ typing…' : '● Online'}
        </Text>
      </View>
    </View>

    {/* Call — Placeholder for future video/voice call flow */}
    <TouchableOpacity
      style={hdS.actionBtn}
      activeOpacity={0.7}
      onPress={() => Alert.alert('Coming Soon', 'Video and voice calling will be available in the next release.')}
    >
      <Text style={hdS.actionIcon}>📞</Text>
    </TouchableOpacity>
  </View>
);

const hdS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingVertical: SPACING.MD,
    gap: SPACING.MD,
    backgroundColor: COLORS.DARK_BG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  backBtn: {
    width: 38, height: 38, borderRadius: TYPOGRAPHY.RADIUS.MD,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  backArrow: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  mid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  avatarWrap: { position: 'relative' } as ViewStyle,
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: COLORS.CARD_BORDER,
  } as ImageStyle,
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: COLORS.SECONDARY,
    borderWidth: 2, borderColor: COLORS.DARK_BG,
  } as ViewStyle,
  nameCol: { flex: 1 } as ViewStyle,
  name: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '700',
  } as TextStyle,
  status: {
    color: COLORS.SECONDARY,
    fontSize: 11,
    fontFamily: FONT_FAMILY.MONO,
    marginTop: 1,
  } as TextStyle,
  actionBtn: {
    width: 38, height: 38, borderRadius: TYPOGRAPHY.RADIUS.MD,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  actionIcon: { fontSize: 18 } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export const ChatThreadScreen: React.FC<Props> = ({ route, navigation }) => {
  const { threadId, participantName, participantAvatar } = route.params as {
    threadId: string;
    participantName: string;
    participantAvatar: string;
  };

  const user    = useAuthStore((s) => s.user);
  const myId    = user?.id ?? 'me';
  const myAvatar = user?.avatar ?? 'https://picsum.photos/seed/trainee_me/200/200';
  const myName   = user?.name ?? 'Me';

  const { messages: allMessages, isTyping, addMessage, markThreadRead, setActiveThread } =
    useChatStore();

  const threadMessages: Message[] = allMessages[threadId] ?? [];

  const [inputText, setInputText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending]     = useState(false);
  const [attaching, setAttaching] = useState(false);
  const listRef    = useRef<FlatList<any>>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Load history + subscribe on mount ────────────────────────────────────
  useEffect(() => {
    setActiveThread(threadId);

    // 1. Load message history from Supabase
    chatService.getMessages(threadId, 50)
      .then((msgs) => {
        msgs.forEach((msg) => addMessage(threadId, msg));
      })
      .catch((err) => console.warn('[ChatThread] getMessages:', err))
      .finally(() => setLoadingHistory(false));

    // 2. Subscribe to new real-time messages
    channelRef.current = chatService.subscribeToThread(
      threadId,
      (msg: Message) => {
        const myCurrentId = useAuthStore.getState().user?.id;
        // Don't double-add our own optimistic messages
        if (msg.senderId !== myCurrentId) {
          addMessage(threadId, msg);
        }
      },
    );

    // 3. Mark thread as read in Supabase
    chatService.markThreadRead(threadId).catch(() => {});
    markThreadRead(threadId); // also update local store

    return () => {
      setActiveThread(null);
      // Unsubscribe Realtime channel
      if (channelRef.current) {
        chatService.unsubscribeFromThread(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to newest on message change
  useEffect(() => {
    if (threadMessages.length > 0) {
      listRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  }, [threadMessages.length]);

  // ── Send handler ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    // Optimistic: add to local store immediately
    const optimisticMsg: Message = {
      id:           genId(),
      threadId,
      senderId:     myId,
      senderName:   myName,
      senderAvatar: myAvatar,
      text,
      timestamp:    new Date().toISOString(),
      isRead:       true,
    };
    addMessage(threadId, optimisticMsg);
    setInputText('');
    Keyboard.dismiss();

    // Persist to Supabase (Realtime will NOT echo back to sender,
    // so optimistic is the final version for our own bubble)
    try {
      setSending(true);
      await chatService.sendMessage(threadId, text);
    } catch (err) {
      console.warn('[ChatThread] sendMessage failed:', err);
      // Could implement rollback here if needed
    } finally {
      setSending(false);
    }
  }, [inputText, sending, threadId, myId, myName, myAvatar, addMessage]);

  // ── Attachment handler ───────────────────────────────────────────────────────────
  const handleAttach = useCallback(async (source: 'camera' | 'library') => {
    if (attaching) return;
    setAttaching(true);
    Keyboard.dismiss();

    try {
      // 1. Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Camera required', 'Please grant camera access in Settings.'); return; }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission required', 'Please grant photo library access.'); return; }
      }

      // 2. Launch picker
      const pickerResult = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85, exif: false });

      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      const asset = pickerResult.assets[0];

      // 3. Upload to Cloudinary
      const result = await uploadToCloudinary(asset.uri, {
        folder: CLOUDINARY_FOLDERS.CHAT_MEDIA,
        resourceType: 'image',
      });

      // 4. Send as media message
      const optimisticMsg: Message = {
        id:           genId(),
        threadId,
        senderId:     myId,
        senderName:   myName,
        senderAvatar: myAvatar,
        text:         '',
        mediaUrl:     result.secureUrl,
        mediaType:    'image',
        timestamp:    new Date().toISOString(),
        isRead:       true,
      };
      addMessage(threadId, optimisticMsg);
      await chatService.sendMessage(threadId, undefined, result.secureUrl, 'image');
    } catch (err: any) {
      Alert.alert('Attachment failed', err.message ?? 'Could not send media.');
    } finally {
      setAttaching(false);
    }
  }, [attaching, threadId, myId, myName, myAvatar, addMessage]);

  // ── Render item (inverted list — newest first in data, displayed at bottom) ─
  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMine = item.senderId === myId;

      // Check if we need a time divider above this message.
      // Because the list is inverted, the message "above" in time is at index+1.
      const olderMsg = threadMessages[index + 1];
      const showDivider =
        olderMsg &&
        new Date(item.timestamp).getTime() - new Date(olderMsg.timestamp).getTime() >
          THIRTY_MIN_MS;

      // Show avatar only on the last received message in a group
      const nextMsg = threadMessages[index - 1];
      const showAvatar = Boolean(
        !isMine && (!nextMsg || nextMsg.senderId === myId || nextMsg.isAIInsight)
      );

      return (
        <>
          {showDivider && <TimeDivider timestamp={item.timestamp} />}
          <MessageBubble
            message={item}
            isMine={isMine}
            showAvatar={showAvatar}
            participantAvatar={participantAvatar}
          />
        </>
      );
    },
    [threadMessages, myId, participantAvatar],
  );

  // FlatList receives messages newest-first for the inverted layout
  const invertedMessages = [...threadMessages].reverse();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <ChatHeader
        participantName={participantName}
        participantAvatar={participantAvatar}
        isTyping={isTyping[threadId] ?? false}
        onBack={() => navigation.goBack()}
      />

      {/* ── Messages + Input (KeyboardAvoidingView handles keyboard) ────────── */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={invertedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={() => {
            // Graceful fallback — scroll to end if index fails (e.g. empty list)
            listRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Input bar */}
        <InputBar
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          onAttach={handleAttach}
          attaching={attaching}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,
  listContent: {
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.SM,
  } as ViewStyle,
});

export default ChatThreadScreen;
