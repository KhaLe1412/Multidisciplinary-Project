# Coding Guidelines - Hệ thống Quản lý Máy Sấy

## 📋 General Guidelines

### Code Quality

- **TypeScript Strict**: Luôn sử dụng TypeScript strict mode, tránh `any` type
- **Functional Components**: Sử dụng functional components với hooks thay vì class components
- **Single Responsibility**: Mỗi component chỉ làm một việc duy nhất
- **Keep Components Small**: Component không nên quá 200 lines, split thành smaller components
- **Extract Custom Hooks**: Logic phức tạp nên được tách thành custom hooks
- **Error Boundaries**: Luôn wrap components trong ErrorBoundary để prevent crashes

### File Organization

```
src/components/
├── Layout.tsx              # Main layout component
├── Control.tsx             # Page-level component
├── DrierControl.tsx        # Feature component
├── ui/                     # Reusable UI components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
└── figma/                  # Specific utility components
    └── ImageWithFallback.tsx
```

### Naming Conventions

- **Components**: PascalCase (`DrierControl.tsx`)
- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase (`currentUser`, `isAuthenticated`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TEMP_THRESHOLD`)
- **Types/Interfaces**: PascalCase với suffix (`UserAccount`, `DrierStatus`)

---

## 🎨 Design System Guidelines

### Color Usage

- **Primary Actions**: Blue gradient `bg-gradient-to-r from-blue-600 to-blue-700`
- **Status Indicators**:
  - Active: `bg-green-100 text-green-700`
  - Inactive: `bg-slate-100 text-slate-500`
  - Warning: `bg-yellow-100 text-yellow-700`
  - Error: `bg-red-100 text-red-700`

### Typography

- **Headings**: Font weight 700 (bold)
- **Body Text**: Font weight 400 (normal)
- **Labels**: Font weight 600 (semibold)
- **Captions**: Font weight 400, text-slate-500

### Spacing

- **Card Padding**: `p-5` (20px)
- **Page Padding**: `p-6` (24px)
- **Component Gaps**: `gap-3` or `gap-4` cho consistency
- **Button Padding**: `px-4 py-2` cho standard buttons

---

## 🧩 Component Guidelines

### Props Interface Pattern

```typescript
// Always define props interface
interface DrierCardProps {
  dryer: Dryer;
  onSelect?: (dryer: Dryer) => void;
  className?: string;
  variant?: "default" | "compact";
}

// Use defaultProps cho optional props với default values
const DrierCard = ({
  dryer,
  onSelect,
  className = "",
  variant = "default",
}: DrierCardProps) => {
  // Component implementation
};
```

### State Management

```typescript
// Local state với useState
const [isLoading, setIsLoading] = useState(false);

// Global state với Context
const { dryers, setDryers, currentUser } = useApp();

// Derived state với useMemo
const filteredDryers = useMemo(() => {
  return dryers.filter((d) => d.status === "active");
}, [dryers]);
```

### Event Handling

```typescript
// Event handler naming: handle + Action
const handleDryerSelect = (dryer: Dryer) => {
  navigate(`/control/${dryer.id}`);
};

const handleStatusChange = (status: DryerStatus) => {
  setDryers((prev) =>
    prev.map((d) => (d.id === selectedDryer.id ? { ...d, status } : d)),
  );
};
```

---

## 📊 Data Guidelines

### Type Definitions

```typescript
// Use specific types instead of generic
type DryerStatus = "active" | "inactive"; // ✅ Good
type Status = string; // ❌ Bad

// Use interfaces for objects
interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: boolean;
}
```

### API Patterns

```typescript
// Use consistent CRUD patterns
const useDryers = () => {
  const { dryers, setDryers } = useApp();

  const addDryer = (dryer: Omit<Dryer, "id">) => {
    const id = generateId();
    setDryers((prev) => [{ ...dryer, id }, ...prev]);
    return id;
  };

  const updateDryer = (id: string, updates: Partial<Dryer>) => {
    setDryers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    );
  };

  return { dryers, addDryer, updateDryer };
};
```

---

## 🎯 UI/UX Guidelines

### Responsive Design

- **Mobile First**: Design cho mobile trước, sau đó scale up
- **Breakpoints**: Sử dụng Tailwind breakpoints (sm, md, lg, xl)
- **Grid Layouts**: Responsive grid với `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Accessibility

- **Form Labels**: Luôn có label cho input fields
- **Alt Text**: Alt text cho images
- **Keyboard Navigation**: Đảm bảo có thể navigate bằng keyboard
- **Color Contrast**: Đảm bảo contrast ratio > 4.5:1

### Performance

- **Lazy Loading**: Sử dụng React.lazy cho code splitting
- **Memoization**: useMemo và useCallback cho expensive operations
- **Image Optimization**: WebP format, lazy loading cho images

---

## 🔧 Development Guidelines

### Git Workflow

```bash
# Branch naming
feature/dryer-control-enhancement
bugfix/device-status-display
hotfix/authentication-issue

# Commit messages (Vietnamese OK)
feat: thêm tính năng điều khiển máy sấy từ xa
fix: sửa lỗi hiển thị trạng thái thiết bị
docs: cập nhật tài liệu API
```

### Code Review

- **Check TypeScript**: Không có any types
- **Test Functionality**: Test tất cả use cases
- **Responsive**: Test trên mobile/tablet
- **Performance**: Check bundle size, loading times

### Testing Priorities

1. **Critical Paths**: Login, dryer control, emergency stop
2. **Data Validation**: Form validation, API responses
3. **UI Interactions**: Button clicks, modal behaviors
4. **Edge Cases**: Empty states, error states

---

## ⚠️ Common Pitfalls

### Avoid These

```typescript
// ❌ Bad: Using any
const handleData = (data: any) => { ... }

// ✅ Good: Specific typing
const handleData = (data: DrierData) => { ... }

// ❌ Bad: Inline styles
<div style={{ marginTop: '20px', color: 'red' }}>

// ✅ Good: Tailwind classes
<div className="mt-5 text-red-600">

// ❌ Bad: Direct state mutation
dryers[0].status = 'inactive';

// ✅ Good: Immutable updates
setDryers(prev => prev.map(d =>
  d.id === id ? { ...d, status: 'inactive' } : d
));
```

### Performance Anti-patterns

```typescript
// ❌ Bad: Object creation in render
<Component style={{ marginTop: spacing }} />

// ✅ Good: Static styles or useMemo
const styles = useMemo(() => ({ marginTop: spacing }), [spacing]);
<Component style={styles} />

// ❌ Bad: No dependencies in useEffect
useEffect(() => {
  fetchData();
}); // Missing dependency array

// ✅ Good: Proper dependencies
useEffect(() => {
  fetchData();
}, [filters]); // With dependencies
```

---

## 📝 Documentation Standards

### Component Documentation

```typescript
/**
 * DrierCard component hiển thị thông tin tóm tắt của máy sấy
 *
 * @param dryer - Dữ liệu máy sấy
 * @param onSelect - Callback khi click vào card
 * @param className - CSS class tùy chỉnh
 */
interface DrierCardProps {
  dryer: Dryer;
  onSelect?: (dryer: Dryer) => void;
  className?: string;
}
```

### README Updates

- Cập nhật README.md khi thêm tính năng mới
- Document breaking changes
- Provide migration guides cho major updates

---

## 🚀 Deployment Guidelines

### Build Optimization

```bash
# Check bundle size
npm run build
npm run analyze

# Performance audit
npm run lighthouse
```

### Environment Variables

```bash
# Development
VITE_API_URL=http://localhost:3000
VITE_APP_VERSION=dev

# Production
VITE_API_URL=https://api.dryercontrol.com
VITE_APP_VERSION=1.0.0
```

---

**💡 Remember**: Những guidelines này để ensure consistency và maintainability. Khi có doubt, hỏi team lead!
