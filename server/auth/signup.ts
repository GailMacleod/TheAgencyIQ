import { z } from 'zod';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';

// Enhanced signup schema with mobile validation
const signupSchema = insertUserSchema.extend({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  userId: z.string().min(10, 'Phone number must be at least 10 digits'),
});

export type SignupData = z.infer<typeof signupSchema>;

export async function createUser(signupData: SignupData) {
  // Validate input
  const validatedData = signupSchema.parse(signupData);
  
  // Check for existing user by email
  const existingUser = await storage.getUserByEmail(validatedData.email);
  if (existingUser) {
    throw new Error(`User with email ${validatedData.email} already exists`);
  }

  // Check for existing user by phone (if provided)
  if (validatedData.userId) {
    const existingPhoneUser = await storage.getUserByPhone(validatedData.userId);
    if (existingPhoneUser) {
      throw new Error(`User with phone ${validatedData.userId} already exists`);
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(validatedData.password, 10);
  
  // Create user with default values
  const newUser = await storage.createUser({
    ...validatedData,
    password: hashedPassword,
    subscriptionPlan: 'starter',
    subscriptionActive: false,
    remainingPosts: 0,
    totalPosts: 0,
    subscriptionSource: 'none',
  });

  // Remove password from response
  const { password, ...userWithoutPassword } = newUser;
  
  console.log(`✅ User created successfully: ${newUser.email} (ID: ${newUser.id})`);
  return userWithoutPassword;
}

export async function authenticateUser(email: string, password: string) {
  // Get user by email
  const user = await storage.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  
  console.log(`✅ User authenticated successfully: ${user.email} (ID: ${user.id})`);
  return userWithoutPassword;
}