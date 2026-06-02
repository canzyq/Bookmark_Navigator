# Chrome Bookmark Navigator

## 项目目标

开发一个 Chrome Extension (Manifest V3)，实现类似 Vimium / Telescope 的书签快速导航功能。

用户按下全局快捷键后，在当前页面弹出一个 Bookmark Picker 对话框：

- 展示所有 Bookmark Folder 和 Bookmark

- 支持键盘全程操作

- 支持 Vim 风格快捷键

- 支持模糊搜索

- 支持快速打开 Bookmark

- 无需鼠标操作

目标体验类似：

```text
┌────────────────────────────────────┐
│ Search: docker                     │
├────────────────────────────────────┤
│ > Dev                              │
│   Docs                             │
│   Blogs                            │
│   Tools                            │
├────────────────────────────────────┤
│ > Docker Docs                      │
│   Docker Hub                       │
│   Docker Compose                   │
│   Docker Buildx                    │
└────────────────────────────────────┘
```

---

# 功能需求

## 1. 打开弹窗

用户配置 Chrome Commands：

```text
Alt+B
```

触发后：

- 在当前页面显示 Overlay

- Overlay 居中

- 背景半透明

示意：

```text
─────────────────────────────
           页面内容

      ┌──────────────┐
      │ Bookmark UI  │
      └──────────────┘

─────────────────────────────
```

---

## 2. 读取 Bookmarks

使用：

```javascript
chrome.bookmarks.getTree()
```

读取完整书签树。

转换为：

```typescript
interface BookmarkFolder {
    id: string;
    title: string;
    children: BookmarkItem[];
}

interface BookmarkItem {
    id: string;
    title: string;
    url: string;
}
```

构建内存索引。

---

## 3. 双栏结构

界面分为两列：

```text
┌─────────────────────────────────────┐
│ Search:                             │
├──────────────┬──────────────────────┤
│ Folder List  │ Bookmark List        │
│              │                      │
│ > Dev        │ > Docker Docs        │
│   Blogs      │   Docker Hub         │
│   Linux      │   Kubernetes         │
│              │                      │
└──────────────┴──────────────────────┘
```

左侧：

- Folder

右侧：

- 当前 Folder 下的 Bookmark

---

## 4. Vim 导航

### Folder 切换

```text
j
```

下一 Folder

```text
k
```

上一 Folder

### 切换焦点

```text
h
```

回到 Folder List

```text
l
```

进入 Bookmark List

---

## 5. Bookmark 导航

当焦点位于 Bookmark List：

```text
j
```

下一项

```text
k
```

上一项

---

## 6. 打开 Bookmark

```text
Enter
```

打开当前 Bookmark

默认：

```javascript
chrome.tabs.update({
    url: bookmark.url
})
```

可选配置：

```text
新标签页打开
当前标签页打开
后台标签页打开
```

---

## 7. 搜索

输入任意字符：

```text
docker
```

实时过滤。

匹配：

- Bookmark title

- Folder title

- URL

---

## 8. 模糊搜索

推荐：

```text
fuzzysort
```

或：

```text
Fuse.js
```

排序依据：

```text
1. 标题命中
2. Folder 命中
3. URL 命中
```

---

## 9. ESC 关闭

```text
Esc
```

关闭 Overlay。

---

## 10. 最近访问

维护：

```typescript
chrome.storage.local
```

结构：

```typescript
{
    recentBookmarks: string[]
}
```

排序时优先展示最近使用项。

---

# 技术架构

## Manifest V3

```text
src/
├── manifest.json
├── background/
│   └── service-worker.ts
├── content/
│   └── overlay.ts
├── popup/
├── options/
├── shared/
│   ├── bookmark.ts
│   ├── search.ts
│   └── storage.ts
└── ui/
    ├── App.tsx
    ├── FolderPane.tsx
    ├── BookmarkPane.tsx
    └── SearchInput.tsx
```

---

# 技术栈

推荐：

```text
TypeScript
React
Vite
Manifest V3
Fuse.js
TailwindCSS
```

构建：

```bash
npm create vite@latest
```

---

# 权限

manifest.json

```json
{
  "permissions": [
    "bookmarks",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

---

# 快捷键设计

Chrome Command：

```json
{
  "commands": {
    "open-bookmark-navigator": {
      "suggested_key": {
        "default": "Alt+B"
      },
      "description": "Open Bookmark Navigator"
    }
  }
}
```

---

# 状态管理

```typescript
interface AppState {
    folders: Folder[];
    selectedFolderIndex: number;

    bookmarks: Bookmark[];

    selectedBookmarkIndex: number;

    focusPane: "folder" | "bookmark";

    searchText: string;

    isOpen: boolean;
}
```

---

# 性能要求

支持：

```text
5000+
Bookmarks
500+
Folders
```

要求：

- 打开时间 < 100ms

- 搜索响应 < 30ms

- 键盘切换无卡顿

优化：

- 启动时缓存 Bookmark Tree

- 增量刷新

- Virtual List

推荐：

```text
react-window
```

---

# UI 设计要求

风格：

```text
Telescope.nvim
Raycast
Spotlight
```

特点：

- 深色主题

- 圆角

- 毛玻璃背景

- 高亮选中项

- 键盘优先

---

# MVP 开发顺序

## Phase 1

基础能力

- Manifest V3

- 快捷键

- Overlay

- Bookmark API

验收：

```text
Alt+B
→ 显示全部书签
```

---

## Phase 2

导航

- hjkl

- Enter

- Esc

验收：

```text
无需鼠标即可打开书签
```

---

## Phase 3

搜索

- Fuse.js

- 实时过滤

验收：

```text
输入 docker
→ 实时定位 Docker Docs
```

---

## Phase 4

增强

- 最近访问

- 排序优化

- Virtual List

---

## Phase 5

发布

- 打包

- Chrome Web Store

- README

- 截图

- 图标

---

# Stretch Goals

后续版本可增加：

## 书签编辑

```text
d
删除书签
```

```text
r
重命名
```

---

## 快速创建

```text
a
添加当前页面
```

---

## 多动作菜单

```text
Ctrl+Enter
```

显示：

```text
Open
Open New Tab
Copy URL
Edit
Delete
```

---

## 最近使用模式

```text
gr
```

查看最近打开书签。

---

# 最终验收标准

用户在任意网页：

```text
Alt+B
↓
出现 Bookmark Navigator
↓
hjkl 导航
↓
输入关键词过滤
↓
Enter 打开
↓
Esc 关闭
```

- `gg` 跳到列表顶部
- `G` 跳到底部
- `/` 进入搜索模式
- `Ctrl+j/k` 搜索结果快速跳转
- `Tab` 在 Folder/Bookmark 间切换焦点
