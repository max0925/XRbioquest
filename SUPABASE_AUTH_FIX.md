# 🔧 Supabase Auth Error Fix

## 问题诊断

你遇到的 **"Failed to fetch"** 错误（`TypeError` + `AuthRetryableFetchError`）是因为 `.env.local` 文件中的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 格式不正确。

### ❌ 当前错误的格式：
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_TfmmJa3j6eQfu64vmAroLw_KNGbqBBN
```

这是错误的格式！Supabase anon key 应该是一个长JWT token，而不是 `sb_publishable_` 开头的短字符串。

### ✅ 正确的格式：
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcWltd3B3am5hbGR3dWliZXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzYzNzY5MDYsImV4cCI6MTk5MTk1MjkwNn0.EXAMPLE
```

---

## 🔍 排查结果

### 1. **.env.local 环境变量**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` 正确：`https://tqqimwpwjnaldwuibeqf.supabase.co`
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` **格式错误**：应该是JWT格式（以 `eyJ` 开头）

### 2. **Supabase Client 初始化**
- ✅ `lib/supabase/client.ts` 使用了正确的环境变量名
- ✅ 代码结构正确

### 3. **首页 Auth 调用**
- ✅ 首页本身不调用 Supabase auth
- ✅ **Navigation 组件**在每个页面都加载，会调用 `supabase.auth.getUser()`
- ✅ 已添加错误处理，失败时静默跳过（不再抛错）

---

## 🛠️ 修复步骤

### 步骤 1：获取正确的 Supabase Anon Key

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 选择你的项目（`tqqimwpwjnaldwuibeqf`）
3. 点击左侧菜单 **Settings** ⚙️
4. 点击 **API**
5. 在 **Project API keys** 部分找到 **anon public** key
6. 复制这个 **长JWT token**（应该以 `eyJ` 开头，非常长）

### 步骤 2：更新 .env.local 文件

打开 `/Users/deadpool/Desktop/XRbioquest/.env.local`，替换第4行：

**替换前：**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_TfmmJa3j6eQfu64vmAroLw_KNGbqBBN
```

**替换后：**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcWltd3B3am5hbGR3dWliZXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzYzNzY5MDYsImV4cCI6MTk5MTk1MjkwNn0.YOUR_ACTUAL_TOKEN_HERE
```

**重要：** 用你从 Supabase Dashboard 复制的 **实际 anon key** 替换上面的示例！

### 步骤 3：重启开发服务器

```bash
# 停止当前开发服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

### 步骤 4：验证修复

1. 刷新首页（`http://localhost:3000`）
2. 打开浏览器开发者工具（F12）
3. 查看 Console 标签
4. **应该不再看到** "Failed to fetch" 或 "AuthRetryableFetchError" 错误
5. 如果仍有问题，检查 Network 标签，确认 Supabase 请求返回 200 状态码

---

## 🎯 已完成的代码修复

### 1. **Navigation 组件错误处理** ✅

修改了 `components/Navigation.tsx`：

```typescript
// 添加了 try-catch 和错误处理
supabase.auth.getUser()
  .then(({ data: { user }, error }) => {
    if (error) {
      console.warn('[Navigation] Auth check failed:', error.message);
      setUser(null);
    } else {
      setUser(user);
    }
    setLoading(false);
  })
  .catch((err) => {
    console.warn('[Navigation] Auth check error:', err.message);
    setUser(null);
    setLoading(false);
  });
```

**效果：**
- Auth 失败时不会抛出未捕获的错误
- 静默处理，设置 `user = null`（显示为未登录状态）
- 不影响页面正常渲染

### 2. **环境变量模板** ✅

创建了 `.env.local.example` 文件，包含：
- 正确的 Supabase key 格式说明
- 所有必需环境变量的示例
- 清晰的注释和获取方式

---

## 📝 重要提醒

### ⚠️ 不要混淆两种 Key

Supabase 提供多种 API keys：

| Key 类型 | 格式 | 用途 | 正确示例 |
|---------|------|------|---------|
| ✅ **anon (public)** | JWT (以 `eyJ` 开头) | 客户端使用 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| ✅ **service_role** | JWT (以 `eyJ` 开头) | 服务端使用 | `SUPABASE_SERVICE_ROLE_KEY` |
| ❌ **Publishable Key** | `sb_publishable_xxx` | **Stripe 使用，不是 Supabase！** | 不适用 |

你之前用的 `sb_publishable_xxx` 是 **Stripe 的 publishable key**，不是 Supabase 的 anon key！

---

## 🔐 安全提醒

- **永远不要**将 `.env.local` 文件提交到 Git
- **永远不要**在客户端代码中使用 `SUPABASE_SERVICE_ROLE_KEY`
- **只有** `NEXT_PUBLIC_*` 变量会暴露给客户端
- Service role key 只能在服务端 API 路由中使用

---

## ✅ 验证清单

修复后，确认以下几点：

- [ ] `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是长JWT token（以 `eyJ` 开头）
- [ ] 重启了开发服务器（`npm run dev`）
- [ ] 首页不再显示 "Failed to fetch" 错误
- [ ] Navigation 组件正常显示（有登录按钮或用户头像）
- [ ] 浏览器控制台只有 warning（不是 error）

---

## 🆘 如果还有问题

如果按照上述步骤操作后仍有错误，请检查：

1. **确认复制了正确的 key**
   - 在 Supabase Dashboard > Settings > API
   - 复制 **anon public** key（不是 service_role）

2. **检查 key 中是否有多余空格**
   ```bash
   # 在终端运行，查看实际值
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **确认项目 URL 正确**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tqqimwpwjnaldwuibeqf.supabase.co
   ```
   （应该与你的 Supabase 项目 URL 完全匹配）

4. **查看浏览器 Network 标签**
   - 打开开发者工具 > Network
   - 刷新页面
   - 查找 `auth` 相关请求
   - 检查请求头中的 `apikey` 是否是正确的 JWT token

---

需要更多帮助？请提供：
- 浏览器控制台的完整错误信息
- Network 标签中失败请求的详细信息
- 确认你已经从 Supabase Dashboard 复制了正确的 anon key
