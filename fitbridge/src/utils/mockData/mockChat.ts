import { Message, ChatThread } from '../../types/chat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Chat Data — 3 threads seeded with real trainer IDs from mockTrainers.ts
// MY user: id='me', name='Rahul Verma' (the logged-in trainee)
// ─────────────────────────────────────────────────────────────────────────────

const MY_ID = 'me';
const MY_NAME = 'Rahul Verma';
const MY_AVATAR = 'https://picsum.photos/seed/trainee_me/200/200';

// ── Thread 1: Arjun Mehta (Strength & Powerlifting) ──────────────────────────
const thread1Id = 'thread_arjun';

const thread1Messages: Message[] = [
  {
    id: 'msg_a1',
    threadId: thread1Id,
    senderId: 'u1',
    senderName: 'Arjun Mehta',
    senderAvatar: 'https://picsum.photos/seed/trainer1/200/200',
    text: "Hey Rahul! Great session today 💪 Your squat form is really improving.",
    timestamp: '2026-05-03T09:15:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_a2',
    threadId: thread1Id,
    senderId: MY_ID,
    senderName: MY_NAME,
    senderAvatar: MY_AVATAR,
    text: "Thanks Coach! Those pause squats were brutal but I felt so much stronger.",
    timestamp: '2026-05-03T09:18:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_a3',
    threadId: thread1Id,
    senderId: 'u1',
    senderName: 'Arjun Mehta',
    senderAvatar: 'https://picsum.photos/seed/trainer1/200/200',
    text: "That's exactly the stimulus we need for hypertrophy. For Friday, focus on hitting 8 reps on bench press at 70% 1RM. I'll send you a revised plan tonight.",
    timestamp: '2026-05-03T09:21:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_a4',
    threadId: thread1Id,
    senderId: 'fitbridge_ai',
    senderName: 'FitBridge AI',
    senderAvatar: 'https://picsum.photos/seed/fitbridge_ai/200/200',
    text: "💡 AI Insight: Based on your recent sessions, adding 200–300 kcal to your daily intake could optimise recovery and support muscle growth at your current training volume.",
    timestamp: '2026-05-03T09:25:00.000Z',
    isRead: true,
    isAIInsight: true,
  },
  {
    id: 'msg_a5',
    threadId: thread1Id,
    senderId: MY_ID,
    senderName: MY_NAME,
    senderAvatar: MY_AVATAR,
    text: "Perfect, looking forward to the plan! See you Friday 🙌",
    timestamp: '2026-05-03T09:28:00.000Z',
    isRead: true,
  },
];

// ── Thread 2: Priya Sharma (Yoga & Mobility) ──────────────────────────────────
const thread2Id = 'thread_priya';

const thread2Messages: Message[] = [
  {
    id: 'msg_p1',
    threadId: thread2Id,
    senderId: 'u2',
    senderName: 'Priya Sharma',
    senderAvatar: 'https://picsum.photos/seed/trainer2/200/200',
    text: "Good morning Rahul! Don't forget we have a 7AM session tomorrow. Please make sure you warm up your hip flexors beforehand 🙏",
    timestamp: '2026-05-02T18:00:00.000Z',
    isRead: false,
  },
  {
    id: 'msg_p2',
    threadId: thread2Id,
    senderId: 'u2',
    senderName: 'Priya Sharma',
    senderAvatar: 'https://picsum.photos/seed/trainer2/200/200',
    text: "Also sending you this week's flexibility homework. Just 10 minutes before bed — it makes a huge difference.",
    timestamp: '2026-05-02T18:02:00.000Z',
    isRead: false,
  },
  {
    id: 'msg_p3',
    threadId: thread2Id,
    senderId: 'u2',
    senderName: 'Priya Sharma',
    senderAvatar: 'https://picsum.photos/seed/trainer2/200/200',
    mediaUrl: 'https://picsum.photos/seed/yoga_plan/600/400',
    mediaType: 'image',
    text: "Here's your personalised flexibility roadmap for this week 📋",
    timestamp: '2026-05-02T18:04:00.000Z',
    isRead: false,
  },
];

// ── Thread 3: Kavya Reddy (Running & Endurance) ───────────────────────────────
const thread3Id = 'thread_kavya';

const thread3Messages: Message[] = [
  {
    id: 'msg_k1',
    threadId: thread3Id,
    senderId: MY_ID,
    senderName: MY_NAME,
    senderAvatar: MY_AVATAR,
    text: "Hi Kavya! Just completed my 5K run — finished in 28 mins. Is that a good time for my level?",
    timestamp: '2026-05-01T07:45:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_k2',
    threadId: thread3Id,
    senderId: 'u6',
    senderName: 'Kavya Reddy',
    senderAvatar: 'https://picsum.photos/seed/trainer6/200/200',
    text: "That's a solid time for 6 weeks of training! 🏃‍♂️ You're already in the 'intermediate beginner' zone. Next goal: sub-27 minutes by end of May.",
    timestamp: '2026-05-01T08:10:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_k3',
    threadId: thread3Id,
    senderId: 'fitbridge_ai',
    senderName: 'FitBridge AI',
    senderAvatar: 'https://picsum.photos/seed/fitbridge_ai/200/200',
    text: "💡 AI Insight: Your pace improved by 12% over the last 4 weeks. At this rate, a sub-25 min 5K is achievable within 8–10 weeks with consistent training.",
    timestamp: '2026-05-01T08:12:00.000Z',
    isRead: true,
    isAIInsight: true,
  },
  {
    id: 'msg_k4',
    threadId: thread3Id,
    senderId: MY_ID,
    senderName: MY_NAME,
    senderAvatar: MY_AVATAR,
    text: "Let's go!! I'll keep at it 🔥",
    timestamp: '2026-05-01T08:15:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_k5',
    threadId: thread3Id,
    senderId: 'u6',
    senderName: 'Kavya Reddy',
    senderAvatar: 'https://picsum.photos/seed/trainer6/200/200',
    text: "Your Wednesday long run should be 7K this week. Slow and steady — don't push pace, focus on time on feet.",
    timestamp: '2026-05-01T08:20:00.000Z',
    isRead: true,
  },
];

// ── Thread metadata ───────────────────────────────────────────────────────────
export const mockChatThreads: ChatThread[] = [
  {
    id: thread1Id,
    participantIds: [MY_ID, 'u1'],
    participantNames: [MY_NAME, 'Arjun Mehta'],
    participantAvatars: [MY_AVATAR, 'https://picsum.photos/seed/trainer1/200/200'],
    lastMessage: {
      text: "Perfect, looking forward to the plan! See you Friday 🙌",
      timestamp: '2026-05-03T09:28:00.000Z',
      senderId: MY_ID,
      isRead: true,
    },
    unreadCount: 0,
    updatedAt: '2026-05-03T09:28:00.000Z',
  },
  {
    id: thread2Id,
    participantIds: [MY_ID, 'u2'],
    participantNames: [MY_NAME, 'Priya Sharma'],
    participantAvatars: [MY_AVATAR, 'https://picsum.photos/seed/trainer2/200/200'],
    lastMessage: {
      text: "Here's your personalised flexibility roadmap for this week 📋",
      timestamp: '2026-05-02T18:04:00.000Z',
      senderId: 'u2',
      isRead: false,
    },
    unreadCount: 3,
    updatedAt: '2026-05-02T18:04:00.000Z',
  },
  {
    id: thread3Id,
    participantIds: [MY_ID, 'u6'],
    participantNames: [MY_NAME, 'Kavya Reddy'],
    participantAvatars: [MY_AVATAR, 'https://picsum.photos/seed/trainer6/200/200'],
    lastMessage: {
      text: "Your Wednesday long run should be 7K this week. Slow and steady — don't push pace, focus on time on feet.",
      timestamp: '2026-05-01T08:20:00.000Z',
      senderId: 'u6',
      isRead: true,
    },
    unreadCount: 0,
    updatedAt: '2026-05-01T08:20:00.000Z',
  },
];

// Messages keyed by threadId — matches chatStore.messages shape
export const mockChatMessages: Record<string, Message[]> = {
  [thread1Id]: thread1Messages,
  [thread2Id]: thread2Messages,
  [thread3Id]: thread3Messages,
};
