import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("DATABASE_URL is required"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new (PrismaClient as unknown as new (args: { adapter: PrismaPg }) => PrismaClient)({ adapter });

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dianmingbao.tech" },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: { email: "admin@dianmingbao.tech", password, name: "系统管理员", role: "ADMIN", status: "ACTIVE" },
  });
  console.log(`Admin: admin@dianmingbao.tech / admin123`);

  // Set existing teacher role
  const teacher = await prisma.user.findUnique({ where: { email: "teacher@demo.com" } });
  if (teacher && teacher.role !== "TEACHER") {
    await prisma.user.update({ where: { email: "teacher@demo.com" }, data: { role: "TEACHER", status: "ACTIVE" } });
    console.log("Teacher role updated");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
