# Plan: Chrome Bookmark Navigator

**Source PRD**: `plan.md`
**Selected Milestone**: Phase 1 — 基础能力 (Manifest V3 + 快捷键 + Overlay + Bookmark API)
**Complexity**: Medium

## Summary

开发一个 Chrome Extension (Manifest V3)，实现类似 Vimium/Telescope 的书签快速导航。用户按 `Alt+B` 在当前页面弹出双栏书签选择器，支持 `hjkl` 导航、模糊搜索、Enter 打开书签、Esc 关闭。采用 TypeScript + React + Vite + Fuse.js + TailwindCSS 技术栈，Content Script 注入 Overlay UI，Background Service Worker 处理书签读取与缓存。

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | Greenfield — 无既有代码 | `kebab-case` 文件名，`PascalCase` React 组件 |
| Errors | Greenfield | `Result<T, E>` 风格错误处理，chrome.runtime.lastError 检查 |
| Logging | Greenfield | `console.debug` 带 `[BookmarkNav]` 前缀 |
| Data access | Greenfield | Chrome Bookmarks API → 内存索引 + chrome.storage.local 持久化 |
| Tests | Greenfield | Vitest 单元测试 + Playwright E2E |

## Files to Change

| File | Action | Why |
|---|---|---|
| `package.json` | CREATE | 项目依赖与脚本 |
| `tsconfig.json` | CREATE | TypeScript 配置 |
| `vite.config.ts` | CREATE | Vite 构建配置（多入口：content script + background + popup） |
| `tailwind.config.js` | CREATE | TailwindCSS 配置 |
| `postcss.config.js` | CREATE | PostCSS 配置 |
| `src/manifest.json` | CREATE | Manifest V3 配置（权限、快捷键） |
| `src/background/service-worker.ts` | CREATE | Background Service Worker：监听快捷键、缓存书签树 |
| `src/content/overlay.tsx` | CREATE | Content Script 入口：注入 React Overlay |
| `src/content/index.html` | CREATE | Content Script HTML 宿主 |
| `src/content/overlay.css` | CREATE | Overlay 样式（毛玻璃、深色主题） |
| `src/shared/types.ts` | CREATE | 类型定义（BookmarkFolder, BookmarkItem, AppState） |
| `src/shared/bookmark.ts` | CREATE | 书签树读取与索引构建 |
| `src/shared/search.ts` | CREATE | Fuse.js 模糊搜索封装 |
| `src/shared/storage.ts` | CREATE | chrome.storage.local 最近访问管理 |
| `src/shared/keys.ts` | CREATE | Vim 快捷键解析器 |
| `src/ui/App.tsx` | CREATE | 主 React 组件（状态管理 + 键盘路由） |
| `src/ui/FolderPane.tsx` | CREATE | 左栏文件夹列表 |
| `src/ui/BookmarkPane.tsx` | CREATE | 右栏书签列表 |
| `src/ui/SearchInput.tsx` | CREATE | 搜索输入框 |
| `src/ui/Overlay.tsx` | CREATE | Overlay 容器（背景半透明 + 居中弹窗） |

## Tasks

### Task 1: 项目脚手架搭建
- **Action**: 使用 Vite 创建 Chrome Extension 项目骨架，配置 TypeScript、React、TailwindCSS、多入口构建
- **Mirror**: Vite Chrome Extension 模板惯例
- **Validate**: `npm run build` 成功输出 dist/ 目录

### Task 2: Manifest V3 + 快捷键注册
- **Action**: 编写 `manifest.json`，声明 `bookmarks`、`storage`、`tabs` 权限，注册 `Alt+B` 快捷键命令
- **Mirror**: Chrome Extension Manifest V3 规范
- **Validate**: 加载 unpacked extension 后 `chrome://extensions/shortcuts` 显示 Alt+B

### Task 3: Background Service Worker
- **Action**: 实现 `service-worker.ts`：监听 `onCommand` 事件，向当前 tab 注入 content script 或发送消息触发 Overlay 显示；启动时缓存书签树
- **Mirror**: Chrome Extension Message Passing 模式
- **Validate**: 按 Alt+B 后 service worker 收到命令并触发 overlay

### Task 4: Content Script + Overlay UI
- **Action**: 实现 `overlay.tsx` 入口和 `Overlay.tsx` 组件：在当前页面 DOM 中创建 Shadow DOM 容器，渲染半透明背景 + 居中弹窗；支持 Esc 关闭
- **Mirror**: Content Script Shadow DOM 隔离模式
- **Validate**: Alt+B 弹出 Overlay，Esc 关闭，不干扰宿主页面样式

### Task 5: Bookmark 数据层
- **Action**: 实现 `bookmark.ts`：调用 `chrome.bookmarks.getTree()` 获取完整书签树，转换为 `BookmarkFolder[]` / `BookmarkItem[]` 结构，构建内存索引
- **Mirror**: plan.md 中的数据类型定义
- **Validate**: 能正确解析包含 5000+ 书签的树结构

### Task 6: 双栏 UI + hjkl 导航
- **Action**: 实现 `App.tsx`（状态管理）、`FolderPane.tsx`（左栏）、`BookmarkPane.tsx`（右栏）：选中 folder 时右栏显示其 bookmarks；`hjkl` 在 folder/bookmark 间切换焦点和上下移动；`Enter` 打开书签
- **Mirror**: plan.md 中的 UI 布局和快捷键设计
- **Validate**: hjkl 全程键盘导航，Enter 在当前/新标签页打开书签

### Task 7: 模糊搜索
- **Action**: 实现 `search.ts`：使用 Fuse.js 对书签标题、URL、文件夹名进行模糊搜索；`SearchInput.tsx` 实时过滤；搜索时切换为全结果视图
- **Mirror**: Fuse.js 最佳实践
- **Validate**: 输入 "docker" 实时过滤出 Docker 相关书签，响应 < 30ms

### Task 8: 最近访问 + 性能优化
- **Action**: 实现 `storage.ts`：使用 `chrome.storage.local` 存储最近访问的书签 ID；实现 Virtual List（react-window）优化大量书签渲染
- **Mirror**: plan.md 性能要求
- **Validate**: 5000+ 书签滚动流畅无卡顿

## Validation

```bash
# 构建验证
npm run build

# 类型检查
npx tsc --noEmit

# 单元测试
npx vitest run

# 手动验证：加载到 Chrome
# 1. chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → dist/
# 2. 任意页面按 Alt+B → 弹出 Overlay
# 3. hjkl 导航 + Enter 打开 + Esc 关闭
# 4. 搜索框输入关键词 → 实时过滤
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Content Script CSS 与宿主页面冲突 | High | 使用 Shadow DOM 隔离样式 |
| Vite 多入口构建配置复杂 | Medium | 使用 `@crxjs/vite-plugin` 或手动 rollup 配置 |
| Chrome Commands API 快捷键被占用 | Medium | 提供可配置快捷键，fallback 到 popup 激活 |
| 5000+ 书签搜索性能 | Low | Fuse.js + 预索引 + react-window 虚拟滚动 |
| Manifest V3 Service Worker 生命周期限制 | Medium | 缓存书签到 chrome.storage，唤醒时重新加载 |

## Acceptance
- [ ] 项目脚手架搭建完成，`npm run build` 通过
- [ ] Manifest V3 + Alt+B 快捷键注册成功
- [ ] Background Service Worker 监听命令并触发 Overlay
- [ ] Overlay 弹出/关闭正常，不影响宿主页面
- [ ] Bookmark API 读取完整书签树
- [ ] 双栏 UI + hjkl 导航流畅
- [ ] Enter 打开书签（当前/新标签页）
- [ ] Fuse.js 模糊搜索实时过滤
- [ ] Esc 关闭 Overlay