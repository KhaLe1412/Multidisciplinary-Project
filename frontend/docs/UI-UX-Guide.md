# UI/UX Design Guide

## 🎨 Design System

### Color Palette

#### Primary Colors

```css
/* Primary Blue Gradient */
--primary: #3b82f6;
--primary-dark: #1d4ed8;
--primary-light: #60a5fa;

/* Sidebar Dark Theme */
--sidebar-bg: linear-gradient(180deg, #0c1a2e 0%, #0f2a4a 50%, #0c1a2e 100%);
--sidebar-border: rgba(99, 179, 237, 0.1);

/* Status Colors */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

#### Device Type Colors

```css
--temperature: #f59e0b; /* Orange */
--humidity: #3b82f6; /* Blue */
--motion: #8b5cf6; /* Violet */
--fan: #06b6d4; /* Cyan */
--door: #10b981; /* Emerald */
--lcd: #64748b; /* Slate */
--heater: #ef4444; /* Red */
```

#### Mode Colors

```css
--mode-manual: { bg: #f1f5f9, text: #475569, border: #cbd5e1 };
--mode-threshold: { bg: #faf5ff, text: #7c3aed, border: #c4b5fd };
--mode-schedule: { bg: #eff6ff, text: #2563eb, border: #93c5fd };
```

---

### Typography

#### Font Weights

```css
.font-light {
  font-weight: 300;
}
.font-normal {
  font-weight: 400;
}
.font-medium {
  font-weight: 500;
}
.font-semibold {
  font-weight: 600;
}
.font-bold {
  font-weight: 700;
}
.font-extrabold {
  font-weight: 800;
}
```

#### Text Sizes

```css
.text-xs {
  font-size: 12px;
  line-height: 16px;
}
.text-sm {
  font-size: 14px;
  line-height: 20px;
}
.text-base {
  font-size: 16px;
  line-height: 24px;
}
.text-lg {
  font-size: 18px;
  line-height: 28px;
}
.text-xl {
  font-size: 20px;
  line-height: 28px;
}
.text-2xl {
  font-size: 24px;
  line-height: 32px;
}
```

---

### Spacing System

#### Padding/Margin Scale (Tailwind)

```css
p-1  = 4px    m-1  = 4px
p-2  = 8px    m-2  = 8px
p-3  = 12px   m-3  = 12px
p-4  = 16px   m-4  = 16px
p-5  = 20px   m-5  = 20px
p-6  = 24px   m-6  = 24px
p-8  = 32px   m-8  = 32px
```

#### Component Spacing

- **Card padding**: `p-5` (20px)
- **Modal padding**: `p-6` (24px)
- **Button padding**: `px-4 py-2` (16px horizontal, 8px vertical)
- **Input padding**: `px-3 py-2` (12px horizontal, 8px vertical)

---

## 🧩 Component Patterns

### Card Components

```tsx
// Standard Card Pattern
<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
  {/* Card Header */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
        <Icon size={22} className="text-blue-600" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900">Title</h3>
        <p className="text-sm text-slate-500">Subtitle</p>
      </div>
    </div>
    <button className="text-slate-400 hover:text-slate-600">
      <MoreHorizontal size={18} />
    </button>
  </div>

  {/* Card Body */}
  <div className="space-y-3">{/* Content here */}</div>
</div>
```

### Status Indicators

```tsx
// Status Badge Component
interface StatusBadgeProps {
  status: "active" | "inactive" | "warning" | "error";
  children: React.ReactNode;
}

const StatusBadge = ({ status, children }: StatusBadgeProps) => {
  const styles = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-500",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${styles[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-green-500" : "bg-slate-400"}`}
      />
      {children}
    </span>
  );
};
```

### Button Variants

```tsx
// Primary Button
<button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm">
  Primary Action
</button>

// Secondary Button
<button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-all">
  Secondary Action
</button>

// Danger Button
<button className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 transition-all">
  Danger Action
</button>

// Icon Button
<button className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
  <Icon size={18} />
</button>
```

### Input Components

```tsx
// Standard Input
<div className="space-y-1">
  <label className="text-sm font-semibold text-slate-700">Label</label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
    placeholder="Enter value..."
  />
</div>

// Select Dropdown
<select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white">
  <option value="">Select option...</option>
  <option value="1">Option 1</option>
</select>
```

---

## 📱 Layout Patterns

### Sidebar Layout

```tsx
const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Factory size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">DryerControl</h1>
              <p className="text-slate-400 text-sm">Nhà máy ABC</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Page Title</h1>
            <div className="flex items-center gap-4">
              {/* User menu, notifications, etc. */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
```

### Grid Layouts

```tsx
// Responsive Grid for Dryer Cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {dryers.map((dryer) => (
    <DryerCard key={dryer.id} dryer={dryer} />
  ))}
</div>

// Dashboard Stats Grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {stats.map((stat) => (
    <StatCard key={stat.label} {...stat} />
  ))}
</div>
```

---

## 🎭 Animation & Transitions

### CSS Transitions

```css
/* Standard transition for interactive elements */
.transition-all {
  transition: all 0.2s ease-in-out;
}
.transition-colors {
  transition:
    color,
    background-color,
    border-color 0.2s ease-in-out;
}

/* Hover effects */
.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.hover-scale:hover {
  transform: scale(1.02);
}
```

### Loading States

```tsx
// Skeleton Loading
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
</div>

// Spinner Component
<div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
```

---

## 📊 Data Visualization Patterns

### Chart Color Schemes

```tsx
const chartColors = {
  temperature: "#f59e0b",
  humidity: "#3b82f6",
  energy: "#10b981",
  performance: "#8b5cf6",
};

// Usage in charts
<Line
  data={{
    datasets: [
      {
        label: "Nhiệt độ",
        data: temperatureData,
        borderColor: chartColors.temperature,
        backgroundColor: `${chartColors.temperature}20`,
      },
    ],
  }}
/>;
```

### Status Metrics

```tsx
// Gauge Chart for Real-time Values
<div className="relative w-32 h-32">
  <svg className="transform -rotate-90" viewBox="0 0 32 32">
    <circle
      cx="16"
      cy="16"
      r="14"
      fill="transparent"
      stroke="#e2e8f0"
      strokeWidth="2"
    />
    <circle
      cx="16"
      cy="16"
      r="14"
      fill="transparent"
      stroke="#3b82f6"
      strokeWidth="2"
      strokeDasharray={`${percentage * 0.88} 88`}
      className="transition-all duration-500"
    />
  </svg>
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="text-2xl font-bold text-slate-900">{value}°C</span>
  </div>
</div>
```

---

## 📱 Responsive Design

### Breakpoint System

```css
/* Tailwind breakpoints */
sm: '640px'   /* Small devices */
md: '768px'   /* Medium devices */
lg: '1024px'  /* Large devices */
xl: '1280px'  /* Extra large devices */
2xl: '1536px' /* 2X large devices */
```

### Responsive Patterns

```tsx
// Responsive Grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// Responsive Text
<h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Title</h1>

// Responsive Spacing
<div className="p-4 sm:p-6 lg:p-8">
  {/* Content */}
</div>

// Hide/Show on Different Screens
<div className="hidden sm:block">Desktop only content</div>
<div className="block sm:hidden">Mobile only content</div>
```

### Mobile-First Approach

```tsx
// Mobile-optimized sidebar
const [sidebarOpen, setSidebarOpen] = useState(false);

return (
  <div className="flex h-screen">
    {/* Mobile overlay */}
    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}

    {/* Sidebar */}
    <aside
      className={`
      fixed lg:static inset-y-0 left-0 z-50 w-64 
      transform transition-transform duration-300 ease-in-out
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}
    >
      {/* Sidebar content */}
    </aside>

    {/* Main content */}
    <main className="flex-1 lg:ml-0">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={24} />
      </button>
      {/* Page content */}
    </main>
  </div>
);
```

---

## 🏷️ CSS Naming Conventions

### BEM-inspired Classes

```css
/* Component */
.dryer-card {
  /* base styles */
}

/* Element */
.dryer-card__header {
  /* header styles */
}
.dryer-card__body {
  /* body styles */
}

/* Modifier */
.dryer-card--active {
  /* active state styles */
}
.dryer-card--inactive {
  /* inactive state styles */
}
```

### Custom CSS Classes

```css
/* Utility classes */
.bg-gradient-primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.text-gradient {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.shadow-glow {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}
```
