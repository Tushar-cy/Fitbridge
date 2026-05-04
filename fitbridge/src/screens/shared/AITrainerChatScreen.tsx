import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, Image, ImageStyle, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────
const FREE_MINUTES   = 15;
const FREE_MS        = FREE_MINUTES * 60 * 1000;
// Local cache key — used only to avoid re-fetching DB on every mount
const CACHE_KEY = (userId: string, trainerId: string) =>
  `@fitbridge_chat_start_${userId}_${trainerId}`;

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: string;
}

const genId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Get or create the persistent session start time.
 * Priority: AsyncStorage cache → Supabase DB → create new row in DB.
 */
async function getOrCreateSessionStart(userId: string, trainerId: string): Promise<number> {
  const cacheKey = CACHE_KEY(userId, trainerId);

  // 1. Try local cache first (instant)
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return parseInt(cached, 10);
  } catch (_) {}

  // 2. Try Supabase (persistent across devices/reinstalls)
  try {
    const { data } = await supabase
      .from('ai_chat_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (data?.started_at) {
      const startMs = new Date(data.started_at).getTime();
      await AsyncStorage.setItem(cacheKey, String(startMs)); // cache locally
      return startMs;
    }
  } catch (err) {
    console.warn('[AIChat] Supabase session read failed, falling back to local:', err);
  }

  // 3. First time — create a new session row in Supabase
  const startMs = Date.now();
  try {
    await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id:    userId,
        trainer_id: trainerId,
        started_at: new Date(startMs).toISOString(),
      });
  } catch (err) {
    console.warn('[AIChat] Supabase session create failed, using local only:', err);
  }

  // Always save locally as backup
  await AsyncStorage.setItem(cacheKey, String(startMs));
  return startMs;
}

/**
 * Save a chat message to Supabase (non-blocking — won't crash UI if it fails).
 */
async function persistMessage(
  userId: string,
  trainerId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  try {
    await supabase.from('ai_chat_messages').insert({
      user_id:    userId,
      trainer_id: trainerId,
      role,
      content,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — chat still works even if message isn't persisted
    console.warn('[AIChat] message persist failed:', err);
  }
}





// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMessage; trainerAvatar: string }> = React.memo(({ msg, trainerAvatar }) => {
  const isMine = msg.role === 'user';
  const anim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }).start();
  }, []);

  return (
    <Animated.View
      style={[
        bS.row,
        isMine ? bS.rowRight : bS.rowLeft,
        { opacity: anim, transform: [{ scale: anim }] },
      ]}
    >
      {!isMine && (
        <Image source={{ uri: trainerAvatar }} style={bS.avatar as ImageStyle} />
      )}
      <View style={[bS.bubble, isMine ? bS.bubbleMine : bS.bubbleAI]}>
        {!isMine && (
          <Text style={bS.aiLabel}>✨ AI Trainer</Text>
        )}
        <Text style={[bS.text, isMine ? bS.textMine : bS.textAI]}>{msg.text}</Text>
        <Text style={[bS.time, isMine ? bS.timeMine : bS.timeAI]}>
          {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>
      </View>
    </Animated.View>
  );
});

const bS = StyleSheet.create({
  row:       { flexDirection: 'row', paddingHorizontal: SPACING.SCREEN_H_PAD, marginVertical: 4, alignItems: 'flex-end', gap: 10 } as ViewStyle,
  rowRight:  { justifyContent: 'flex-end' } as ViewStyle,
  rowLeft:   { justifyContent: 'flex-start' } as ViewStyle,
  avatar:    { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.PRIMARY } as ImageStyle,
  bubble:    { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 } as ViewStyle,
  bubbleMine:{ backgroundColor: COLORS.PRIMARY, borderBottomRightRadius: 4 } as ViewStyle,
  bubbleAI:  { backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: `${COLORS.INFO}44`, borderBottomLeftRadius: 4 } as ViewStyle,
  aiLabel:   { color: COLORS.INFO, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 } as TextStyle,
  text:      { fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, lineHeight: 22 } as TextStyle,
  textMine:  { color: COLORS.WHITE } as TextStyle,
  textAI:    { color: COLORS.TEXT_PRIMARY } as TextStyle,
  time:      { fontSize: 10, fontFamily: FONT_FAMILY.MONO, alignSelf: 'flex-end' } as TextStyle,
  timeMine:  { color: 'rgba(255,255,255,0.5)' } as TextStyle,
  timeAI:    { color: COLORS.TEXT_MUTED } as TextStyle,
});

// ── Timer bar ─────────────────────────────────────────────────────────────────
const TimerBar: React.FC<{ remainingMs: number }> = ({ remainingMs }) => {
  const pct = Math.max(0, (remainingMs / FREE_MS) * 100);
  const color = pct > 40 ? COLORS.SUCCESS : pct > 15 ? COLORS.WARNING : COLORS.ERROR;

  return (
    <View style={tS.wrap}>
      <View style={tS.track}>
        <Animated.View style={[tS.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[tS.label, { color }]}>⏱ {formatTime(remainingMs)} free</Text>
    </View>
  );
};
const tS = StyleSheet.create({
  wrap:  { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.CARD_BORDER } as ViewStyle,
  track: { flex: 1, height: 4, backgroundColor: COLORS.SURFACE_3, borderRadius: 2, overflow: 'hidden' } as ViewStyle,
  fill:  { height: '100%', borderRadius: 2 } as ViewStyle,
  label: { fontSize: 11, fontFamily: FONT_FAMILY.MONO, fontWeight: '700', minWidth: 65, textAlign: 'right' } as TextStyle,
});

// ── Upgrade wall ──────────────────────────────────────────────────────────────
const UpgradeWall: React.FC<{ trainerName: string; onClose: () => void }> = ({ trainerName, onClose }) => (
  <View style={uS.overlay}>
    <LinearGradient colors={['rgba(10,10,20,0.1)', COLORS.DARK_BG]} style={uS.grad} />
    <View style={uS.card}>
      <Text style={uS.icon}>🔒</Text>
      <Text style={uS.title}>Free Chat Ended</Text>
      <Text style={uS.sub}>
        Your 15-minute free chat with{'\n'}
        <Text style={uS.name}>{trainerName}</Text> has ended.
      </Text>
      <View style={uS.featureList}>
        {[
          'Unlimited AI coaching sessions',
          'Personalised workout plans',
          'Direct messaging with trainer',
          'Progress tracking & feedback',
        ].map((f) => (
          <View key={f} style={uS.feature}>
            <Text style={uS.featureDot}>✓</Text>
            <Text style={uS.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={uS.upgradeBtn}
        onPress={() => Alert.alert('Upgrade', 'Premium plans launching soon! We\'ll notify you when available.')}
        activeOpacity={0.85}
      >
        <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={uS.upgradeBtnGrad}>
          <Text style={uS.upgradeBtnText}>Upgrade to Premium 🚀</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={uS.closeLink}>
        <Text style={uS.closeLinkText}>← Back to Profile</Text>
      </TouchableOpacity>
    </View>
  </View>
);
const uS = StyleSheet.create({
  overlay:       { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: SPACING.XXL, paddingHorizontal: SPACING.LG, zIndex: 99 } as ViewStyle,
  grad:          { ...StyleSheet.absoluteFillObject } as ViewStyle,
  card:          { backgroundColor: COLORS.SURFACE_1, borderRadius: 28, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.XL, alignItems: 'center', gap: SPACING.MD, width: '100%' } as ViewStyle,
  icon:          { fontSize: 52 } as TextStyle,
  title:         { color: COLORS.TEXT_PRIMARY, fontSize: 24, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  sub:           { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.SECONDARY, textAlign: 'center', lineHeight: 24 } as TextStyle,
  name:          { color: COLORS.PRIMARY_LIGHT, fontWeight: '800' } as TextStyle,
  featureList:   { width: '100%', gap: SPACING.SM } as ViewStyle,
  feature:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  featureDot:    { color: COLORS.SUCCESS, fontSize: 14, fontWeight: '800', width: 20 } as TextStyle,
  featureText:   { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, flex: 1 } as TextStyle,
  upgradeBtn:    { width: '100%', borderRadius: 16, overflow: 'hidden' } as ViewStyle,
  upgradeBtnGrad:{ paddingVertical: 16, alignItems: 'center' } as ViewStyle,
  upgradeBtnText:{ color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: 0.5 } as TextStyle,
  closeLink:     { paddingVertical: 4 } as ViewStyle,
  closeLinkText: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export const AITrainerChatScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation, route }) => {
  const { trainerId, trainerName, trainerAvatar, trainerSpeciality } =
    route.params as {
      trainerId: string;
      trainerName: string;
      trainerAvatar: string;
      trainerSpeciality: string;
    };

  const userId = useAuthStore((s) => s.user?.id) ?? 'anon';
  const token  = useAuthStore((s) => s.token);

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [limitHit,  setLimitHit]  = useState(false);
  const [remaining, setRemaining] = useState(FREE_MS);

  const listRef    = useRef<FlatList<any>>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef<number | null>(null); // epoch ms when session started

  // ── Load or create session start time (Supabase-backed) ─────────────────
  useEffect(() => {
    getOrCreateSessionStart(userId, trainerId).then((startMs) => {
      startedRef.current = startMs;
      const elapsed = Date.now() - startMs;
      if (elapsed >= FREE_MS) {
        setRemaining(0);
        setLimitHit(true);
      } else {
        setRemaining(FREE_MS - elapsed);
        startTimer(startMs);
      }
    });

    // 1. Set greeting
    const greetingMsg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      text: `Hey! 👋 I'm an AI trained on ${trainerSpeciality || 'fitness'} coaching. Ask me anything about workouts, nutrition, or your fitness goals. You have ${FREE_MINUTES} minutes free!`,
      ts: new Date().toISOString(),
    };
    setMessages([greetingMsg]);

    // 2. Load historical messages from Supabase
    if (userId && trainerId) {
      supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (data && !error && data.length > 0) {
            const historyMsgs = data.map((row: any) => ({
              id: row.id,
              role: row.role,
              text: row.content,
              ts: row.created_at,
            }));
            setMessages([greetingMsg, ...historyMsgs]);
            // Scroll to bottom after loading
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
          }
        });
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [userId, trainerId, trainerSpeciality]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = (startMs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const rem = FREE_MS - elapsed;
      if (rem <= 0) {
        setRemaining(0);
        setLimitHit(true);
        clearInterval(timerRef.current!);
      } else {
        setRemaining(rem);
      }
    }, 1000);
  };

  // ── Send to Groq via backend proxy ─────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || limitHit) return;

    // Optimistic user bubble
    const userMsg: ChatMessage = { id: genId(), role: 'user', text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history for context (last 6 messages)
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trainerName,
          trainerSpeciality: trainerSpeciality || 'fitness',
          userMessage: text,
          history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const { reply } = await res.json();
      const aiMsg: ChatMessage = { id: genId(), role: 'assistant', text: reply, ts: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);
      // Persist both messages to Supabase (non-blocking)
      persistMessage(userId, trainerId, 'user', text);
      persistMessage(userId, trainerId, 'assistant', reply);
    } catch (e: any) {
      console.error('[AITrainerChat] send failed:', e.message);
      const errMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        text: `Sorry, I couldn't respond right now. Please try again! 🙏`,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading, limitHit, messages, token, trainerName, trainerSpeciality]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Image source={{ uri: trainerAvatar }} style={s.headerAvatar as ImageStyle} />
        <View style={s.headerMid}>
          <Text style={s.headerName}>{trainerName}</Text>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeText}>✨ AI Mode</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Text style={s.speciality}>{trainerSpeciality}</Text>
        </View>
      </View>

      {/* Timer bar */}
      <TimerBar remainingMs={remaining} />

      {/* Upgrade wall overlay */}
      {limitHit && (
        <UpgradeWall trainerName={trainerName} onClose={() => navigation.goBack()} />
      )}

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <Bubble msg={item} trainerAvatar={trainerAvatar} />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Typing indicator */}
        {loading && (
          <View style={s.typingRow}>
            <Image source={{ uri: trainerAvatar }} style={s.typingAvatar as ImageStyle} />
            <View style={s.typingBubble}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={s.typingText}>Thinking…</Text>
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={limitHit ? 'Free chat ended — upgrade to continue' : 'Ask about workouts, diet, goals…'}
            placeholderTextColor={COLORS.TEXT_MUTED}
            multiline
            maxLength={500}
            editable={!limitHit}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading || limitHit) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading || limitHit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!input.trim() || loading || limitHit) ? [COLORS.SURFACE_3, COLORS.SURFACE_3] : COLORS.GRADIENT_PRIMARY}
              style={s.sendBtnGrad}
            >
              <Text style={s.sendIcon}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  flex:          { flex: 1 } as ViewStyle,
  // Header
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: COLORS.CARD_BORDER, gap: 12 } as ViewStyle,
  backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backArrow:     { color: COLORS.TEXT_PRIMARY, fontSize: 18, fontWeight: '700' } as TextStyle,
  headerAvatar:  { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: COLORS.PRIMARY } as ImageStyle,
  headerMid:     { flex: 1, gap: 3 } as ViewStyle,
  headerName:    { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.HEADING, fontWeight: '800' } as TextStyle,
  aiBadge:       { alignSelf: 'flex-start', backgroundColor: `${COLORS.INFO}22`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: `${COLORS.INFO}44` } as ViewStyle,
  aiBadgeText:   { color: COLORS.INFO, fontSize: 9, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800', letterSpacing: 0.5 } as TextStyle,
  headerRight:   { alignItems: 'flex-end' } as ViewStyle,
  speciality:    { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  // List
  listContent:   { paddingVertical: SPACING.LG, paddingBottom: SPACING.MD } as ViewStyle,
  // Typing indicator
  typingRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.SM } as ViewStyle,
  typingAvatar:  { width: 28, height: 28, borderRadius: 14 } as ImageStyle,
  typingBubble:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.SURFACE_2, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: `${COLORS.INFO}33` } as ViewStyle,
  typingText:    { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,
  // Input
  inputBar:      { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: SPACING.MD, paddingVertical: SPACING.SM, paddingBottom: SPACING.MD, borderTopWidth: 1, borderTopColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_1 } as ViewStyle,
  input:         { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: COLORS.SURFACE_2, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, lineHeight: 22, borderWidth: 1, borderColor: COLORS.CARD_BORDER } as TextStyle,
  sendBtn:       { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' } as ViewStyle,
  sendBtnDisabled: { opacity: 0.4 } as ViewStyle,
  sendBtnGrad:   { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  sendIcon:      { color: COLORS.WHITE, fontSize: 16, marginLeft: 2 } as TextStyle,
});

export default AITrainerChatScreen;
