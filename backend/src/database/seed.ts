import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { AdminSchema } from '../auth/schemas/admin.schema.js';
import { sanitizeMongoUri } from './database.module.js';

export interface SeedResult {
  success: boolean;
  adminEmail: string;
  action: 'created' | 'updated';
}

export async function runSeed(
  customDatabaseUrl?: string,
): Promise<SeedResult> {
  // Load local .env file if environment variables are not already populated
  try {
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile('.env.local');
      } catch {
        try {
          process.loadEnvFile('.env');
        } catch {
          // No .env file, rely on existing environment
        }
      }
    }
  } catch {
    // Ignore environment file loading errors
  }

  const databaseUrl =
    customDatabaseUrl ||
    process.env.DATABASE_URL ||
    'mongodb://localhost:27017/cream-treat';

  const adminName = process.env.SEED_ADMIN_NAME || 'Cream Treat Admin';
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL || 'admin@creamtreat.local'
  ).toLowerCase().trim();
  const rawPassword =
    process.env.SEED_ADMIN_PASSWORD || 'Admin@CreamTreat2026!';

  console.log(
    `[Seed] Connecting to MongoDB: ${sanitizeMongoUri(databaseUrl)}`,
  );

  const connection = await mongoose.createConnection(databaseUrl, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  try {
    const AdminModel = connection.model('Admin', AdminSchema);

    // Hash the password securely with bcrypt salt rounds = 10
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const existingAdmin = await AdminModel.findOne({ email: adminEmail });

    let action: 'created' | 'updated' = 'created';

    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.passwordHash = passwordHash;
      await existingAdmin.save();
      action = 'updated';
      console.log(
        `[Seed] Existing admin account (${adminEmail}) successfully updated.`,
      );
    } else {
      await AdminModel.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
      });
      console.log(
        `[Seed] Development admin account (${adminEmail}) successfully created.`,
      );
    }

    // STRICT CHECK: Ensure NO fake menu items or orders are created
    console.log(
      '[Seed] Note: Real restaurant menu will be entered via Admin Menu Management. No fake menu items created.',
    );

    return {
      success: true,
      adminEmail,
      action,
    };
  } finally {
    await connection.close();
    console.log('[Seed] Database connection closed.');
  }
}

// Execute directly if run as main CLI script
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed.ts'));

if (isMainModule) {
  runSeed()
    .then(() => {
      console.log('[Seed] Database seeding completed successfully.');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error(
        `[Seed] Seeding failed: ${error.message || 'Unknown database error'}`,
      );
      process.exit(1);
    });
}
