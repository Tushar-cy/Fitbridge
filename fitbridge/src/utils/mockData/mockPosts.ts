export interface Post {
  id: string;
  type: 'post' | 'reel';
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  mediaUrl: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
}

export const mockPosts: Post[] = [
  {
    id: 'p1',
    type: 'post',
    authorId: 't1',
    authorName: 'Arjun Mehta',
    authorRole: 'Strength Trainer',
    authorAvatar: 'https://picsum.photos/seed/trainer1/80/80',
    mediaUrl: 'https://picsum.photos/seed/post1/600/750',
    caption: 'Just crushed a new deadlift PR with my client Alex 🔥 Progressive overload is the key — consistent incremental growth compounds over time. Who else hit a PR this week? Drop it in the comments! #Powerlifting #StrengthTraining #FitBridge',
    likes: 1247,
    comments: 89,
    shares: 34,
    createdAt: '2024-04-10T08:30:00Z',
  },
  {
    id: 'p2',
    type: 'reel',
    authorId: 't2',
    authorName: 'Priya Sharma',
    authorRole: 'Yoga Instructor',
    authorAvatar: 'https://picsum.photos/seed/trainer2/80/80',
    mediaUrl: 'https://picsum.photos/seed/post2/600/750',
    caption: '5-minute morning mobility routine ✨ Start your day right with this spine + hip flow. Save this for tomorrow morning! #Yoga #MorningRoutine #Mobility #Wellness',
    likes: 3891,
    comments: 214,
    shares: 567,
    createdAt: '2024-04-09T07:00:00Z',
  },
  {
    id: 'p3',
    type: 'post',
    authorId: 't3',
    authorName: 'Rohan Kapoor',
    authorRole: 'HIIT Coach',
    authorAvatar: 'https://picsum.photos/seed/trainer3/80/80',
    mediaUrl: 'https://picsum.photos/seed/post3/600/750',
    caption: 'Client transformation: 8 weeks of HIIT + smart nutrition 💪 Before → After. This is what happens when you commit. No shortcuts. #Transformation #HIIT #Results',
    likes: 5239,
    comments: 341,
    shares: 892,
    createdAt: '2024-04-08T10:00:00Z',
  },
  {
    id: 'p4',
    type: 'reel',
    authorId: 't8',
    authorName: 'Sanya Kapoor',
    authorRole: 'Calisthenics Coach',
    authorAvatar: 'https://picsum.photos/seed/trainer8/80/80',
    mediaUrl: 'https://picsum.photos/seed/post4/600/750',
    caption: 'From zero pull-ups to muscle-up in 90 days 🤸 The calisthenics journey is real. Body weight mastery > any machine. Details in my programme 🔗 #Calisthenics #BodyWeightTraining #FitBridge',
    likes: 8104,
    comments: 523,
    shares: 1240,
    createdAt: '2024-04-07T18:00:00Z',
  },
  {
    id: 'p5',
    type: 'post',
    authorId: 't7',
    authorName: 'Amit Patel',
    authorRole: 'Sports Nutritionist',
    authorAvatar: 'https://picsum.photos/seed/trainer7/80/80',
    mediaUrl: 'https://picsum.photos/seed/post5/600/750',
    caption: 'A day in my meal plan 🥗 High protein, balanced macros, zero suffering. Eating healthy doesn\'t have to be boring. Drop your biggest nutrition question below! #Nutrition #MealPrep #SportsDiet',
    likes: 2678,
    comments: 187,
    shares: 445,
    createdAt: '2024-04-06T12:00:00Z',
  },
  {
    id: 'p6',
    type: 'reel',
    authorId: 't6',
    authorName: 'Kavya Reddy',
    authorRole: 'Running Coach',
    authorAvatar: 'https://picsum.photos/seed/trainer6/80/80',
    mediaUrl: 'https://picsum.photos/seed/post6/600/750',
    caption: '30 days of running challenge starts NOW 🏃‍♀️ Comment "IN" to join. I\'ll be your accountability partner for the entire month. Zero to 5K is possible, I promise! #RunningChallenge #Marathon #CardioLife',
    likes: 4312,
    comments: 892,
    shares: 1450,
    createdAt: '2024-04-05T06:00:00Z',
  },
];
