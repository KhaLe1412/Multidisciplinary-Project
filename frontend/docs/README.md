# 📚 Documentation - Hệ thống Quản lý Máy Sấy

Chào mừng đến với tài liệu đầy đủ cho frontend của hệ thống quản lý máy sấy công nghiệp.

## 📖 Mục lục tài liệu

### 1. [Frontend Overview](./Frontend-Overview.md)

**Tổng quan về toàn bộ hệ thống frontend**

- Stack công nghệ (React, TypeScript, Vite)
- Cấu trúc dự án
- Hệ thốngAuthentiation & Authorization
- Tổng quan các tính năng chính
- Quy trình development

### 2. [Components Guide](./Components-Guide.md)

**Hướng dẫn chi tiết về các React Components**

- Layout & Navigation components
- Authentication components (Login, Profile)
- Control & Monitoring (Control, DrierControl)
- Device Management
- Schedule Management
- Analytics & Statistics
- Alerts & Monitoring
- Logging & Audit
- User Management
- UI Component library

### 3. [Data Models](./Data-Models.md)

**Tài liệu về data models và API patterns**

- Core data models (Dryer, Device, Schedule, etc.)
- Interface definitions với TypeScript
- Data relationships
- State management với React Context
- Mock API patterns
- CRUD operations

### 4. [UI/UX Design Guide](./UI-UX-Guide.md)

**Hướng dẫn thiết kế và styling**

- Design system và color palette
- Typography và spacing
- Component patterns (Cards, Buttons, Forms)
- Layout patterns (Sidebar, Grid)
- Responsive design
- Animation & transitions
- CSS naming conventions

## 🚀 Quick Start

### Đọc tài liệu theo thứ tự:

1. **Người mới bắt đầu**: Đọc [Frontend Overview](./Frontend-Overview.md) để hiểu tổng quan
2. **Developer**: Đọc [Components Guide](./Components-Guide.md) để hiểu cách implement
3. **Backend Developer**: Đọc [Data Models](./Data-Models.md) để hiểu API requirements
4. **Designer/Frontend**: Đọc [UI/UX Design Guide](./UI-UX-Guide.md) để hiểu design system

## 🏗️ Kiến trúc hệ thống

```
Frontend (React + TypeScript)
├── Authentication & Authorization
├── Real-time Monitoring Dashboard
├── Device Control Interface
├── Schedule Management System
├── Alert & Notification System
├── Analytics & Reporting
└── User Management
```

## 📊 Tính năng chính

### 🎛️ **Điều khiển máy sấy**

- Giám sát real-time các thiết bị
- Điều khiển thủ công từng thiết bị
- 3 chế độ hoạt động: Manual, Threshold, Schedule
- 3 trạng thái: `inactive`, `on`, `active`

### 🏢 **Quản lý khu vực & thiết bị**

- Quản lý khu vực chứa máy sấy
- Thêm máy sấy trực tiếp từ khu vực
- Chọn người quản lý/vận hành từ danh sách nhân viên
- Tự động đặt tên thiết bị khi chọn loại

### 📅 **Quản lý lịch trình**

- Lập lịch tự động cho máy sấy
- Multi-phase scheduling với offset giây
- Policy Objects được dùng chung giữa các pha
- Templates theo loại sản phẩm

### 🚨 **Hệ thống cảnh báo**

- Cặp [Điều kiện AND] → [Hành động]
- Giám sát ngưỡng an toàn
- Alert history và reporting

### 📈 **Thống kê & báo cáo**

- Performance metrics
- Energy consumption tracking
- Batch analytics

### 👥 **Quản lý người dùng**

- Role-based access control
- Activity logging
- User profiles

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI + Radix UI
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: React Context API
- **Icons**: Lucide React

## 📱 Supported Devices

- **Desktop**: Primary target (1200px+)
- **Tablet**: Responsive design (768px - 1199px)
- **Mobile**: Basic support (< 768px)

## 🎨 Design Principles

- **Clean & Modern**: Sử dụng white space và typography tốt
- **Consistent**: Design system thống nhất
- **Responsive**: Mobile-first approach
- **Accessible**: WCAG 2.1 compliance
- **Performance**: Optimized loading và rendering

## 📝 File Structure

```
docs/
├── README.md                # Tài liệu này
├── Frontend-Overview.md     # Tổng quan hệ thống
├── Components-Guide.md      # Hướng dẫn components
├── Data-Models.md          # Data models & API
├── UI-UX-Guide.md          # Design system
└── guidelines/
    └── Guidelines.md       # Code guidelines
```

## 🔄 Workflow phát triển

1. **Setup**: Clone repo và install dependencies
2. **Development**: Sử dụng `npm run dev` cho dev server
3. **Documentation**: Cập nhật docs khi thêm tính năng mới
4. **Testing**: Test trên multiple devices/browsers
5. **Build**: `npm run build` cho production

## ❓ FAQs

### Làm sao để thêm máy sấy mới?

Xem [Data Models - CRUD Operations](./Data-Models.md#mock-api-patterns)

### Làm sao để tùy chỉnh theme/colors?

Xem [UI/UX Guide - Color Palette](./UI-UX-Guide.md#color-palette)

### Làm sao để thêm component mới?

Xem [Components Guide](./Components-Guide.md) và follow naming conventions

### Responsive design hoạt động như thế nào?

Xem [UI/UX Guide - Responsive Design](./UI-UX-Guide.md#responsive-design)

## 📞 Contact & Support

- **Project Lead**: [Tên người phụ trách]
- **Frontend Team**: [Contact info]
- **Bug Reports**: Tạo issue trong repo
- **Feature Requests**: Discussion với team lead

---

**💡 Tip**: Bookmark trang này để dễ dàng reference tới các tài liệu khác!

## 🔖 Quick Links

- [Component Library](./Components-Guide.md#ui-components)
- [Data Models Reference](./Data-Models.md#core-data-models)
- [Design System](./UI-UX-Guide.md#design-system)
- [API Patterns](./Data-Models.md#mock-api-patterns)
- [Responsive Breakpoints](./UI-UX-Guide.md#responsive-design)
