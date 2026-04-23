# ScholarBridge 前端设计规范

适用范围：Next.js App Router + React 19 + Tailwind CSS 4 + TypeScript

## 目录

1. [设计原则](#1-设计原则)
2. [色彩系统](#2-色彩系统)
3. [字体系统](#3-字体系统)
4. [组件规范](#4-组件规范)
5. [交互行为规范](#5-交互行为规范)
6. [表单规范](#6-表单规范)
7. [布局规范](#7-布局规范)

---

## 1. 设计原则

### 1.1 一致性优先

没有原型图时，所有页面遵循本规范统一约定，避免行为不一致。

### 1.2 反馈及时

所有用户操作必须有明确的视觉反馈（成功、失败、加载中）。

### 1.3 渐进增强

先保证功能可用，再优化体验。

---

## 2. 色彩系统

### 2.1 主色调

```css
/* 主色 - 用于按钮、链接、强调元素 */
--color-primary: #2C5F7C;        /* 深青蓝 */
--color-primary-hover: #4A8AA8;  /* 悬停态 */

/* 辅助色 */
--color-accent: #4A8AA8;
```

### 2.2 中性色

```css
/* 边框 */
--color-border: #E0D8CC;         /* 默认边框 */

/* 文字 */
--color-text-primary: #1A1A1A;    /* 主要文字 */
--color-text-secondary: #6B6B6B;   /* 次要文字 */

/* 背景 */
--color-background: #f8fafc;
--color-card: #ffffff;
```

### 2.3 功能色

```css
/* 成功 */
--color-success: #16a34a;
--color-success-bg: #dcfce7;

/* 错误/危险 */
--color-error: #dc2626;
--color-error-bg: #fee2e2;

/* 警告 */
--color-warning: #ca8a04;
--color-warning-bg: #fef9c3;

/* 信息 */
--color-info: #2563eb;
--color-info-bg: #dbeafe;
```

### 2.4 深色模式

```css
@media (prefers-color-scheme: dark) {
  --color-background: #0b1120;
  --color-foreground: #e2e8f0;
  --color-card: #111827;
  --color-primary: #60a5fa;
  --color-primary-muted: #1e3a5f;
}
```

---

## 3. 字体系统

### 3.1 字体栈

```css
font-family: var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif;
font-family-mono: var(--font-geist-mono), ui-monospace, monospace;
```

### 3.2 字号规范

| 名称 | 大小 | 用途 |
|------|------|------|
| `text-xs` | 12px | 辅助说明、时间戳 |
| `text-sm` | 14px | 次要文字、标签 |
| `text-base` | 16px | 正文 |
| `text-lg` | 18px | 副标题 |
| `text-xl` | 20px | 标题 |
| `text-2xl` | 24px | 页面标题 |

### 3.3 字重

```css
font-normal: 400;     /* 正文 */
font-medium: 500;     /* 强调 */
font-semibold: 600;   /* 按钮、标签 */
font-bold: 700;       /* 大标题 */
```

---

## 4. 组件规范

### 4.1 Button

```tsx
import { Button } from '@/components/ui/Button';

// variant: 'gold' | 'outline' | 'ghost'
// size: 'sm' | 'md' | 'lg'

<Button variant="gold" size="md">主要操作</Button>
<Button variant="outline" size="md">次要操作</Button>
<Button variant="ghost" size="md">文字按钮</Button>
```

**样式定义**：

| variant | 样式 |
|---------|------|
| `gold` | 背景 #2C5F7C，白字，悬停 #4A8AA8 |
| `outline` | 白底，#E0D8CC 边框，悬停边框变主色 |
| `ghost` | 透明底，浅边框，悬停显示主色背景 4% |

**使用场景**：
- `gold`：主要操作（提交、确认、保存）
- `outline`：次要操作（取消、返回）
- `ghost`：辅助操作（重置、更多选项）

### 4.2 Card

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';

// variant: 'default' | 'bordered' | 'elevated'

<Card variant="bordered">
  <CardHeader>标题</CardHeader>
  <CardContent>内容</CardContent>
  <CardFooter>操作</CardFooter>
</Card>
```

**样式定义**：

| variant | 样式 |
|---------|------|
| `default` | 白色背景，轻微阴影 |
| `bordered` | 白色背景，#E0D8CC 边框 |
| `elevated` | 更强阴影，悬停保持阴影 |

### 4.3 Input / Textarea

```tsx
import { Input, Textarea } from '@/components/ui/Input';

<Input placeholder="请输入..." />
<Textarea placeholder="请输入多行内容..." />
```

**样式定义**：
- 边框：#E0D8CC
- 聚焦：#2C5F7C 边框 + 3px 阴影 rgba(44,95,124,0.1)

### 4.4 Avatar

```tsx
import { Avatar } from '@/components/ui/Avatar';

// size: 'sm' (36px) | 'md' (50px) | 'lg' (85px)

<Avatar name="张三" size="md" />
<Avatar name="李四" src="/avatar.jpg" size="lg" />
```

**样式定义**：
- 无图片时：渐变背景 #2C5F7C → #4A8AA8，白字，显示首字母
- 圆角：全圆

### 4.5 Badge

```tsx
import { Badge } from '@/components/ui/Badge';

// variant: 'gold' | 'green' | 'blue' | 'red'

<Badge variant="gold">进行中</Badge>
<Badge variant="green">成功</Badge>
<Badge variant="blue">处理中</Badge>
<Badge variant="red">失败</Badge>
```

### 4.6 FileUpload

```tsx
import { FileUpload } from '@/components/ui/FileUpload';

<FileUpload
  accept=".pdf,.docx,.doc,.txt"
  maxSize={10 * 1024 * 1024}
  maxFiles={10}
  onFilesSelected={(files) => console.log(files)}
/>
```

---

## 5. 交互行为规范

### 5.1 操作反馈

| 场景 | 使用方式 | 禁止 |
|------|----------|------|
| 操作成功 | `toast.success('操作成功')` | `alert()` |
| 操作失败 | `toast.error(errorMessage)` | `console.error()` |
| 网络/系统错误 | `toast.error('操作失败，请稍后重试')` | 暴露技术细节 |

**Toast 规范**：
- 持续时间：默认 3 秒
- 位置：顶部居中
- 自动关闭，无需手动操作

### 5.2 删除/危险操作确认

使用 AlertDialog（待实现），结构如下：

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">删除</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>确认删除</AlertDialogTitle>
    <AlertDialogDescription>
      此操作不可撤销，确认要删除该记录吗？
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 5.3 加载状态

| 场景 | 使用方式 |
|------|----------|
| 列表/页面首次加载 | Skeleton 占位（模拟真实布局） |
| 按钮触发的异步操作 | 按钮加 `disabled={loading}` + 加载图标 |
| 全页面跳转加载 | 顶部进度条（NProgress） |

**禁止**：列表刷新时用全屏加载遮罩。

### 5.4 空状态

统一结构：图标（48px，lucide-react） + 标题 + 描述（可选） + 操作按钮（可选）。

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon name="inbox" size={48} className="text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium mb-2">暂无数据</h3>
  <p className="text-sm text-muted-foreground mb-4">描述说明...</p>
  <Button>创建第一个</Button>
</div>
```

### 5.5 弹窗 vs 抽屉

| 场景 | 使用 |
|------|------|
| 简单确认、警告 | AlertDialog |
| 表单填写（字段 ≤ 8 个） | Dialog |
| 表单填写（字段多）或详情查看 | Sheet（从右侧滑出） |
| 需要保留页面上下文的操作 | Sheet |

---

## 6. 表单规范

### 6.1 校验时机

- 单字段校验：blur 时触发
- 全量校验：提交时触发
- 提交失败：滚动到第一个错误字段

```tsx
const firstErrorRef = useRef<HTMLDivElement>(null);
if (errors.length > 0) {
  firstErrorRef.current?.scrollIntoView({ behavior: 'smooth' });
}
```

### 6.2 错误文案

- 具体说明原因，不要只写"格式错误"
- 例如："请输入有效的邮箱地址" 而非 "格式错误"

### 6.3 必填标记

- 使用红色星号：`<span className="text-red-500">*</span>`
- 放在标签末尾

---

## 7. 布局规范

### 7.1 页面边距

- 移动端：`px-4`
- 平板：`px-6`
- 桌面：`px-8`

### 7.2 卡片间距

- 卡片之间：`gap-4` 或 `gap-6`
- 卡片内边距：`p-5`

### 7.3 响应式断点

```css
sm: 640px   /* 手机横屏 */
md: 768px   /* 平板 */
lg: 1024px  /* 小桌面 */
xl: 1280px  /* 大桌面 */
2xl: 1536px /* 超大桌面 */
```

---

## 组件状态汇总

### Button

| State | gold | outline | ghost |
|-------|------|---------|-------|
| Default | bg:#2C5F7C | border:#E0D8CC | border:#E0D8CC |
| Hover | bg:#4A8AA8 | border:#2C5F7C | bg:rgba(44,95,124,0.04) |
| Disabled | opacity:0.5 | opacity:0.5 | opacity:0.5 |

### Input

| State | 样式 |
|-------|------|
| Default | border:#E0D8CC |
| Focus | border:#2C5F7C, shadow:3px rgba(44,95,124,0.1) |
| Error | border:#dc2626 |
| Disabled | bg:#f5f5f5, opacity:0.5 |

---

最后更新：2026-04-23
