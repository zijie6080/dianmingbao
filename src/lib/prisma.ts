import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function intFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or POSTGRES_PRISMA_URL must be set");
  }
  const adapter = new PrismaPg({
    connectionString,
    // Serverless 下每个实例都有自己的连接池，必须保持很小，否则会耗尽数据库连接数。
    // 生产环境请使用 Supabase 的连接池地址（pooler，端口 6543）。
    max: intFromEnv("DB_POOL_MAX", 5),
    // 拿不到连接时 10 秒内失败，而不是无限挂起直到函数超时
    connectionTimeoutMillis: intFromEnv("DB_CONNECT_TIMEOUT_MS", 10_000),
    idleTimeoutMillis: 30_000,
    // 单条 SQL 最长执行时间，防止慢查询拖垮连接池
    statement_timeout: intFromEnv("DB_STATEMENT_TIMEOUT_MS", 15_000),
  });
  return new (PrismaClient as unknown as new (args: { adapter: PrismaPg }) => PrismaClient)({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 生产环境也缓存到 globalThis：同一实例内的热重载 / 多次 import 复用同一个连接池
globalForPrisma.prisma = prisma;
