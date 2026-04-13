// Mock environment variables
process.env.DATABASE_URL = 'file:./dev.db'
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only'

// Mock iron-session
jest.mock('iron-session', () => ({
  getIronSession: jest.fn(() => ({
    userId: 'test-user-id',
    role: 'STUDENT',
    save: jest.fn()
  }))
}))

// Setup test database
let prisma

beforeAll(async () => {
  try {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  } catch (error) {
    console.log('Prisma client not available - running tests without database cleanup')
  }
})

afterEach(async () => {
  // Clean up test data after each test
  if (prisma && prisma.user) {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    })
  }
})

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
})
