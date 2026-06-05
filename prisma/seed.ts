import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new (PrismaClient as unknown as new (args: { adapter: PrismaPg }) => PrismaClient)({ adapter });

async function main() {
  console.log("Seeding database...");

  // 创建示例教师
  const password = await bcrypt.hash("123456", 10);
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@demo.com" },
    update: {},
    create: {
      email: "teacher@demo.com",
      password,
      name: "张教授",
    },
  });

  console.log(`Teacher: teacher@demo.com / 123456`);

  // 创建示例课程
  const course = await prisma.course.create({
    data: {
      name: "高等数学",
      semester: "2026春季",
      userId: teacher.id,
    },
  });

  console.log(`Course: ${course.name} (${course.semester})`);

  // 批量导入示例学生
  const students = [
    { studentId: "2024001", name: "张三" },
    { studentId: "2024002", name: "李四" },
    { studentId: "2024003", name: "王五" },
    { studentId: "2024004", name: "赵六" },
    { studentId: "2024005", name: "孙七" },
    { studentId: "2024006", name: "周八" },
    { studentId: "2024007", name: "吴九" },
    { studentId: "2024008", name: "郑十" },
    { studentId: "2024009", name: "陈一" },
    { studentId: "2024010", name: "刘二" },
  ];

  for (const s of students) {
    await prisma.student.create({
      data: {
        studentId: s.studentId,
        name: s.name,
        courseId: course.id,
      },
    });
  }

  console.log(`Students: ${students.length} imported`);
  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
