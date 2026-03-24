// server/scripts/ensureDefaultAdmin.js
// 作用：确保系统里至少有一个管理员账号。
// - 如果已经存在 role = 'admin' 的用户，则不做任何修改；
// - 如果不存在，则创建一个默认管理员账号。

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";


// ================== 1. 连接数据库的函数 ==================
// ⚠️ TODO-1：根据你自己的 db.js 改这一行

// 情况 A：如果 server/src/db.js 里是：
//   export async function connectDB() { ... }
// 就这样写：
import { connectDB } from "../src/db.js";

// 情况 B：如果 server/src/db.js 里是：
//   export default async function connectDB() { ... }
// 就改成：
// import connectDB from "../src/db.js";

// （二选一，把另一个注释掉即可）
// ======================================================

// import User from "../src/models/User.js";

// ================== 2. 默认管理员账号信息 ==================
// 你有两种选择：
//   方案 1：全部写死在这里（最简单，适合本地实验）
//   方案 2：从 .env 里读（适合以后部署服务器）

// 方案 1：直接写死（可以改成你自己的邮箱和密码）
// ⚠️ TODO-2：这里可以改成你自己想要的默认管理员账号
const HARDCODED_ADMIN_EMAIL = "al72886828@gmail.com";
const HARDCODED_ADMIN_PASSWORD = "#Al72886828#";  // 记得自己保存好
const HARDCODED_ADMIN_NAME = "系统管理员";

// 方案 2：支持 .env（如果 .env 里没写，就用上面的默认值）
const DEFAULT_ADMIN_EMAIL =
  process.env.DEFAULT_ADMIN_EMAIL || HARDCODED_ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD || HARDCODED_ADMIN_PASSWORD;
const DEFAULT_ADMIN_NAME =
  process.env.DEFAULT_ADMIN_NAME || HARDCODED_ADMIN_NAME;
// ======================================================

async function main() {
  // 1. 连接 MongoDB
  await connectDB();

  // 2. 是否已经有管理员
  const adminExists = await User.exists({ role: "admin" });
  if (adminExists) {
    console.log("✅ 系统中已经存在管理员账号，不再创建默认管理员。");
    await mongoose.connection.close();
    process.exit(0);
  }

  // 3. 没有管理员 -> 创建一个
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const admin = await User.create({
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash,
    name: DEFAULT_ADMIN_NAME,
    role: "admin",
  });

  console.log("✅ 默认管理员账号已创建：");
  console.log("   Email   :", DEFAULT_ADMIN_EMAIL);
  console.log("   Password:", DEFAULT_ADMIN_PASSWORD);
  console.log("   用户ID  :", admin._id.toString());

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ ensureDefaultAdmin 执行失败：", err);
  process.exit(1);
});
