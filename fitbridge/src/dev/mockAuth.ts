// DEV ONLY — never import in production screens
import { supabase } from '../lib/supabase';

export const loginAsMockTraineeDB = async () => {
  // Uses a real Supabase test account rather than setting fake Zustand tokens
  const { error } = await supabase.auth.signInWithPassword({
    email: 'trainee@test.fitbridge.app', // Replace with your actual test account
    password: 'password123',
  });
  if (error) console.error('Mock Trainee login failed:', error);
};

export const loginAsMockTrainerDB = async () => {
  // Uses a real Supabase test account rather than setting fake Zustand tokens
  const { error } = await supabase.auth.signInWithPassword({
    email: 'trainer@test.fitbridge.app', // Replace with your actual test account
    password: 'password123',
  });
  if (error) console.error('Mock Trainer login failed:', error);
};
