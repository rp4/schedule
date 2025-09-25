# Resource Scheduler

A high-performance, client-side resource scheduling and optimization tool built with Next.js 15. Handles 2000+ employees smoothly with advanced optimization algorithms and real-time visualization.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Performance](https://img.shields.io/badge/Performance-Optimized-green)

## ✨ Features

### 🚀 Performance at Scale
- **Handles 2000+ employees** without UI freezing
- **Virtual scrolling** for smooth 60 FPS performance
- **Web Workers** for non-blocking Excel parsing and optimization
- **Smart caching** with incremental metrics updates
- **Debounced persistence** to prevent UI blocking

### 📊 Advanced Scheduling
- **Three optimization algorithms**:
  - Genetic Algorithm for complex multi-objective optimization
  - Simulated Annealing for local optimization
  - Constraint Satisfaction for fast rule-based assignment
- **Real-time metrics**: Overtime tracking, utilization rates, skills matching
- **Multiple views**: Gantt chart, Hours grid, Skills matrix
- **Drag-and-drop** project timeline adjustments

### 🔒 Privacy First
- **100% client-side processing** - no data leaves your browser
- **No backend required** - works offline after initial load
- **localStorage persistence** - your data stays on your device
- **Static deployment** - host anywhere that serves HTML

## 🎯 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/rp4/Scheduler.git
cd Scheduler

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Production Build

```bash
# Create optimized production build
npm run build

# The static files will be in the 'out' directory
# Deploy these to any static hosting service
```

## 📁 Excel File Format

The application expects Excel files with the following sheets and columns:

### Employees Sheet
| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| ID | Unique identifier | Yes | EMP001 |
| Name | Employee name | Yes | John Doe |
| Email | Email address | No | john@example.com |
| Max Hours | Weekly hour limit | No | 40 |
| Team | Team assignment | No | Engineering |
| [Skills] | Skill columns | No | Expert/Intermediate/Beginner |

### Projects Sheet
| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| ID | Unique identifier | Yes | PROJ001 |
| Name | Project name | Yes | Website Redesign |
| Start Date | Project start | Yes | 2024-01-15 |
| End Date | Project end | Yes | 2024-06-30 |
| Required Skills | Comma-separated skills | No | React, TypeScript |
| Portfolio | Portfolio category | No | Product |

### Assignments Sheet (Option 1: Standard Format)
| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Employee ID | Employee reference | Yes | EMP001 or John Doe |
| Project ID | Project reference | Yes | PROJ001 or Website Redesign |
| Week | Week date | Yes | 2024-01-15 |
| Hours | Assigned hours | Yes | 20 |

### Assignments Sheet (Option 2: Pivot Format)
- First column: Employee ID/Name
- Second column: Project ID/Name
- Remaining columns: Week dates as headers with hours as values

### Skills Sheet (Optional)
- First column: Employee names
- Remaining columns: Skills with proficiency levels

## 🎮 Usage

### 1. Getting Started
- Click **"Download Sample"** to get a template Excel file
- Or click **"Try with Sample Data"** to explore with demo data
- Upload your own Excel file to begin

### 2. Views

#### Gantt Chart
- Visualize project timelines
- Drag to adjust project dates
- Double-click to edit project details
- Add new projects with the "+" button

#### Hours Grid
- View assignments by employee or project
- Click cells to edit hours directly
- Automatic overtime highlighting
- Sort by overtime or utilization

#### Skills View
- Skills gap analysis
- Employee skill matrix
- Project requirements overview

### 3. Optimization

Click the **"Optimize"** button to:
1. Choose an algorithm (Genetic, Simulated Annealing, or Constraint)
2. Adjust optimization weights:
   - Minimize overtime
   - Maximize utilization
   - Optimize skills matching
3. Preview changes before applying
4. Apply optimized schedule

## ⚡ Performance Features

### Automatic Optimizations
- **Virtual Scrolling**: Automatically enables for >100 rows
- **Web Workers**: Non-blocking for files >1MB
- **Incremental Updates**: Smart caching for >500 assignments
- **Debounced Saves**: 500ms delay prevents UI freezing

### Performance Benchmarks
| Operation | Small (50 emp) | Medium (500 emp) | Large (2000+ emp) |
|-----------|----------------|------------------|-------------------|
| Excel Import | <1s | 2-3s | 3-5s |
| Initial Render | <500ms | <1s | <2s |
| Optimization | <1s | 2-3s | 5-10s |
| Scroll FPS | 60 | 60 | 60 |

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **State**: Zustand with localStorage persistence
- **UI Components**: Radix UI primitives
- **Charts**: gantt-task-react
- **Excel**: XLSX parser
- **Optimization**: Custom algorithms with Web Workers
- **Performance**: React.memo, virtual scrolling, incremental updates

## 📦 Deployment

The application builds to static files and can be deployed anywhere:

### Vercel (Recommended)
```bash
vercel --prod
```

### GitHub Pages
1. Update `basePath` in `next.config.js`
2. Build and push to `gh-pages` branch

### Any Static Host
```bash
npm run build
# Upload contents of 'out' directory
```

## 🔐 Privacy & Security

- **No data transmission**: All processing happens in your browser
- **localStorage only**: Data persists locally on your device
- **No cookies**: No tracking or analytics
- **No external APIs**: Works completely offline
- **Sensitive data warning**: Be cautious with employee PII

⚠️ **Important**: This application stores schedule data in your browser's localStorage. This data:
- Remains on your device
- Is never transmitted to any server
- Can be cleared using browser settings
- May contain sensitive employee information

Please ensure you're comfortable with browser-based storage before uploading sensitive data.

## 🧪 Development

### Commands
```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint checks
npm run test         # Run tests
```

### Project Structure
```
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── features/    # Feature-specific components
│   ├── layout/      # Layout components
│   └── ui/          # Reusable UI components
├── lib/             # Business logic
│   ├── excel/       # Excel parsing
│   ├── optimization/# Scheduling algorithms
│   └── metrics/     # Metrics calculations
├── store/           # Zustand state management
└── types/           # TypeScript definitions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- Gantt chart by [gantt-task-react](https://github.com/MaTeMaTuK/gantt-task-react)

## 📧 Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/rp4/Scheduler/issues) page.

---

**Built with ❤️ for resource managers who need powerful, privacy-respecting tools**