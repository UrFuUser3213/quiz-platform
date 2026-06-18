/**
 * Демо-данные для группового тестирования QuizLive.
 * Запуск: npm run db:seed
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const DEMO = {
  organizer: {
    email: "organizer@demo.local",
    password: "demo1234",
    displayName: "Демо Организатор",
  },
  participants: [
    { email: "player1@demo.local", password: "demo1234", displayName: "Игрок 1" },
    { email: "player2@demo.local", password: "demo1234", displayName: "Игрок 2" },
    { email: "player3@demo.local", password: "demo1234", displayName: "Игрок 3" },
    { email: "player4@demo.local", password: "demo1234", displayName: "Игрок 4" },
    { email: "player5@demo.local", password: "demo1234", displayName: "Игрок 5" },
  ],
  quiz: {
    title: "Демо-квиз для тестирования",
    description: "Готовый квиз с 4 вопросами для проверки на группе",
    category: "IT",
    defaultTimeSec: 25,
    scoringMode: "SPEED" as const,
  },
};

async function upsertUser(
  email: string,
  password: string,
  displayName: string,
  role: "ORGANIZER" | "PARTICIPANT"
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, displayName, role },
    update: { passwordHash, displayName, role },
  });
}

async function main() {
  console.log("Создание демо-аккаунтов…");

  const organizer = await upsertUser(
    DEMO.organizer.email,
    DEMO.organizer.password,
    DEMO.organizer.displayName,
    "ORGANIZER"
  );

  for (const p of DEMO.participants) {
    await upsertUser(p.email, p.password, p.displayName, "PARTICIPANT");
  }

  const existing = await prisma.quiz.findFirst({
    where: { organizerId: organizer.id, title: DEMO.quiz.title },
    include: { questions: true },
  });

  if (existing && existing.questions.length >= 4) {
    console.log("\nДемо-квиз уже существует:", existing.title);
    console.log("ID:", existing.id);
    console.log("\nУчётные записи:");
    console.log("  Организатор:", DEMO.organizer.email, "/", DEMO.organizer.password);
    console.log("  Участники:  player1@demo.local … player5@demo.local / demo1234");
    return;
  }

  if (existing) {
    await prisma.quiz.delete({ where: { id: existing.id } });
  }

  const quiz = await prisma.quiz.create({
    data: {
      organizerId: organizer.id,
      title: DEMO.quiz.title,
      description: DEMO.quiz.description,
      category: DEMO.quiz.category,
      defaultTimeSec: DEMO.quiz.defaultTimeSec,
      scoringMode: DEMO.quiz.scoringMode,
      status: "PUBLISHED",
      questions: {
        create: [
          {
            orderIndex: 0,
            type: "SINGLE",
            mediaType: "TEXT",
            text: "Сколько будет 2 + 2?",
            timeLimitSec: 20,
            points: 1000,
            options: {
              create: [
                { text: "3", isCorrect: false, orderIndex: 0 },
                { text: "4", isCorrect: true, orderIndex: 1 },
                { text: "5", isCorrect: false, orderIndex: 2 },
              ],
            },
          },
          {
            orderIndex: 1,
            type: "MULTIPLE",
            mediaType: "TEXT",
            text: "Выберите языки программирования",
            timeLimitSec: 30,
            points: 1500,
            options: {
              create: [
                { text: "JavaScript", isCorrect: true, orderIndex: 0 },
                { text: "HTML", isCorrect: false, orderIndex: 1 },
                { text: "Python", isCorrect: true, orderIndex: 2 },
                { text: "CSS", isCorrect: false, orderIndex: 3 },
              ],
            },
          },
          {
            orderIndex: 2,
            type: "SINGLE",
            mediaType: "IMAGE",
            text: "Что изображено на картинке?",
            imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/JavaScript-logo.png/240px-JavaScript-logo.png",
            timeLimitSec: 25,
            points: 1200,
            options: {
              create: [
                { text: "JavaScript", isCorrect: true, orderIndex: 0 },
                { text: "Java", isCorrect: false, orderIndex: 1 },
                { text: "Python", isCorrect: false, orderIndex: 2 },
              ],
            },
          },
          {
            orderIndex: 3,
            type: "SINGLE",
            mediaType: "TEXT",
            text: "Какой протокол использует Socket.IO по умолчанию?",
            timeLimitSec: 25,
            points: 1000,
            options: {
              create: [
                { text: "WebSocket (с fallback)", isCorrect: true, orderIndex: 0 },
                { text: "FTP", isCorrect: false, orderIndex: 1 },
                { text: "SMTP", isCorrect: false, orderIndex: 2 },
              ],
            },
          },
        ],
      },
    },
    include: { questions: { include: { options: true } } },
  });

  console.log("\nГотово!");
  console.log("Квиз:", quiz.title, `(${quiz.questions.length} вопросов)`);
  console.log("ID квиза:", quiz.id);
  console.log("\nУчётные записи для тестирования:");
  console.log("  Организатор:", DEMO.organizer.email, "/", DEMO.organizer.password);
  console.log("  Участники:  player1@demo.local … player5@demo.local / demo1234");
  console.log("\nДальше: npm run dev → http://localhost:3000");
  console.log("Войдите как организатор → Дашборд → «Запустить» на демо-квизе");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
