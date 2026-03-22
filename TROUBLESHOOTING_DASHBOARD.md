# Dashboard 排查步骤

## 问题：Dashboard 项目卡片没有显示真实数据

## 排查步骤

### 1. 检查 Supabase 中是否存在 `user_projects` 表

**操作步骤：**
1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧菜单 **Table Editor**
4. 查看表列表中是否有 `user_projects` 表

**如果表不存在：**
1. 点击左侧菜单 **SQL Editor**
2. 点击 **New Query**
3. 复制 `supabase_user_projects_table.sql` 文件中的所有内容
4. 粘贴到 SQL 编辑器
5. 点击 **Run** 执行 SQL
6. 验证表已创建：返回 **Table Editor**，应该能看到 `user_projects` 表

### 2. 检查浏览器控制台日志

**操作步骤：**
1. 打开浏览器开发者工具（F12 或 Cmd+Option+I）
2. 切换到 **Console** 标签
3. 访问 `/dashboard` 页面
4. 查看控制台输出

**预期日志：**
```
[DASHBOARD] Auth check: { user: { id: "xxx", email: "xxx@xxx.com" }, authError: null }
[DASHBOARD] Fetching projects for user: xxx-xxx-xxx
[DASHBOARD] Query result: { data: [...], error: null, count: N }
```

**可能的错误：**

#### 错误 1: 表不存在
```
[DASHBOARD] Supabase query error: { code: "42P01", message: "relation \"public.user_projects\" does not exist" }
```
**解决方案：** 执行步骤 1 创建表

#### 错误 2: 权限不足
```
[DASHBOARD] Supabase query error: { code: "42501", message: "permission denied for table user_projects" }
```
**解决方案：**
- 检查 RLS 策略是否正确设置
- 重新运行 `supabase_user_projects_table.sql` 中的 RLS 部分

#### 错误 3: 无认证用户
```
[DASHBOARD] No authenticated user
```
**解决方案：**
- 确保你已登录（访问 `/login`）
- 检查 Supabase Auth 配置

#### 错误 4: 查询返回空数组
```
[DASHBOARD] Query result: { data: [], error: null, count: 0 }
```
**解决方案：**
- 表存在但没有数据
- 需要先在 VR Studio 中保存一个场景

### 3. 检查用户认证和数据匹配

**在 Supabase SQL Editor 中运行以下查询：**

```sql
-- 1. 查看所有用户
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. 查看 user_projects 表中的所有数据
SELECT id, user_id, name, status, created_at, updated_at
FROM public.user_projects
ORDER BY updated_at DESC
LIMIT 20;

-- 3. 检查当前登录用户的项目（替换 'your-user-id' 为实际 user_id）
SELECT id, name, thumbnail_url, status, updated_at
FROM public.user_projects
WHERE user_id = 'your-user-id'::uuid
ORDER BY updated_at DESC;

-- 4. 检查 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_projects';
```

### 4. 测试保存功能

**操作步骤：**
1. 访问 `/environment-design`
2. 创建一个简单场景（添加一个模型或生成一个环境）
3. 点击 **Export** 按钮保存场景
4. 打开浏览器控制台，查看日志

**预期日志（在 /api/scenes/save）：**
```
[SAVE] Authenticated user detected: xxx-xxx-xxx
[SAVE] Extracted project metadata: { name: "...", thumbnail: "...", short_id: "abc123" }
[SAVE] ✓ Created new project: yyy-yyy-yyy for user: xxx-xxx-xxx
```

**保存后：**
1. 返回 `/dashboard`
2. 应该能看到刚才保存的项目

### 5. 手动插入测试数据

如果上述步骤都正常但仍然没有数据，可以手动插入测试数据：

**在 Supabase SQL Editor 中运行：**

```sql
-- 替换 'your-user-id' 为你的实际用户 ID（从 auth.users 表获取）
INSERT INTO public.user_projects (user_id, name, scene_data, status, thumbnail_url)
VALUES (
    'your-user-id'::uuid,
    'Test VR Lab',
    '{"environment": {"name": "Science Lab", "type": "environment-ai", "imagePath": "https://placehold.co/400x300/emerald/white?text=Test+Lab"}, "models": []}'::jsonb,
    'draft',
    'https://placehold.co/400x300/emerald/white?text=Test+Lab'
);
```

刷新 Dashboard 应该能看到这个测试项目。

## 常见问题

### Q: Dashboard 显示 "Failed to load projects"
**A:** 检查：
1. Supabase 环境变量是否正确（`.env.local`）
2. 浏览器控制台的具体错误信息
3. Supabase Dashboard 中的 API 日志

### Q: 点击 "New Project" 按钮没反应
**A:** 检查：
1. 浏览器控制台是否有错误
2. 是否已登录
3. user_projects 表是否存在

### Q: VR Studio Export 后 Dashboard 还是空的
**A:** 检查：
1. 浏览器控制台的 `[SAVE]` 日志
2. Supabase Table Editor 中 user_projects 表是否有新数据
3. 刷新 Dashboard 页面

## 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. 浏览器控制台的完整日志（包括所有 `[DASHBOARD]` 和 `[SAVE]` 开头的日志）
2. Supabase SQL 查询结果截图
3. 用户 ID 和邮箱（从 auth.users 表）
4. Dashboard 页面截图
