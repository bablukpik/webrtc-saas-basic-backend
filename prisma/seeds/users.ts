import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from './prisma';

export async function seedUsers() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const users = [
    {
      email: 'admin@email.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
    {
      email: 'user@email.com',
      name: 'Test User',
      password: hashedPassword,
      role: UserRole.USER,
    },
  ];

  for (const user of users) {
    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });

    if (!existingUser) {
      const createdUser = await prisma.user.create({
        data: user,
      });

      console.log('User created:', createdUser);
    } else {
      console.log('User already exists');
    }
  }
}
