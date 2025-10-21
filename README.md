# 5CSwipe - Smart Course Discovery for the Claremont Colleges 🎓

A modern, Tinder-style course discovery and schedule builder app for students at the 5 Claremont Colleges (Pomona, Claremont McKenna, Harvey Mudd, Scripps, Pitzer, and Keck Graduate Institute).

**Swipe right on classes you love. Build your perfect schedule.**

---

## 🌟 Features

### Course Discovery
- **Swipe Interface**: Tinder-style card swipe for course browsing
- **Smart Filters**: Filter by school, time slots, credits, and availability
- **Real Course Data**: Live integration with Python scraper API + Supabase fallback
- **Course Details**: View professors, meeting times, enrollment, and descriptions

### Schedule Building
- **Desktop Calendar View**: Drag-and-drop weekly schedule builder with pastel-colored course blocks
- **Mobile Swipe View**: Intuitive card-based interface for course discovery on phones
- **Multiple Plans**: Create and manage multiple schedule variants
- **Real-Time Sync**: Changes sync instantly across all your devices via Supabase

### Authentication & Profiles
- **Email/Password Auth**: Secure authentication with Supabase
- **School Selection**: Choose from 6 Claremont Colleges
- **Onboarding Wizard**: 4-step setup (year, major, minor, preferences)
- **Profile Management**: Track academic progress and graduation requirements

### Academic Progress
- **Requirement Tracking**: Monitor progress toward major/minor completion
- **Credit System Support**: Both HMC (9-unit) and standard (3-credit) systems
- **Degree Visualization**: Interactive charts showing completed/remaining requirements

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native (Expo), TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Course Data**: Python scraper API → Supabase → Mock data fallback
- **Routing**: Expo Router (file-based)
- **State Management**: React Context API
- **Styling**: StyleSheet API with custom design system

### Project Structure
```
5c-swipe/
├── app/                          # Expo Router pages
│   ├── (tabs)/                  # Main tab navigation
│   │   ├── index.tsx            # Home (swipe interface)
│   │   ├── schedule.tsx         # Schedule builder
│   │   └── profile.tsx          # User profile
│   └── auth/                    # Authentication screens
│       ├── login.tsx
│       ├── signup.tsx
│       ├── welcome.tsx
│       ├── onboarding.tsx
│       ├── reset-password.tsx
│       └── email-verification.tsx
├── components/                   # Reusable UI components
│   ├── SwipeableStack.tsx       # Card stack for swiping
│   ├── DesktopCalendarView.tsx  # Weekly calendar with drag-and-drop
│   ├── HyperscheduleCalendar.tsx # Mobile calendar view
│   ├── AuthGuard.tsx            # Navigation protection
│   └── [50+ other components]
├── contexts/                     # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── LikedCoursesContext.tsx  # Saved courses with real-time sync
│   ├── ScheduleVariantsContext.tsx # Schedule plans with real-time sync
│   ├── FilterContext.tsx        # Course filtering
│   ├── CreditSystemContext.tsx  # HMC vs standard credits
│   └── PremiumContext.tsx       # Premium features
├── services/                     # API layer
│   ├── likedCoursesService.ts   # Supabase course operations
│   ├── scheduleVariantsService.ts # Supabase schedule operations
│   ├── courseService.ts         # Course data fetching
│   └── dataHarmonizer.ts        # Data format standardization
├── hooks/                        # Custom React hooks
│   └── useCourses.ts            # Course data fetching hook
└── data/                         # Mock data and types
    └── mockCourses.ts           # Fallback course data
```

---

## 🗄️ Database Schema

### Supabase Tables

**`user_profiles`** - Extended user information
```sql
- id (uuid, primary key)
- email (text)
- school (text) - Pomona, CMC, HMC, Scripps, Pitzer, KGI
- graduation_year (integer)
- major (text)
- minor (text)
- credit_system (text) - 'hmc' or 'standard'
- onboarding_completed (boolean)
- created_at (timestamp)
```

**`user_liked_courses`** - Saved courses
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- course_id (text)
- is_super_like (boolean)
- user_notes (text, nullable)
- priority (integer, 1-10, nullable)
- swipe_direction (text) - 'right', 'left', 'super'
- created_at (timestamp)
```

**`user_schedule_plans`** - Multiple schedule variants
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- name (text)
- description (text, nullable)
- semester (text)
- is_active (boolean)
- is_public (boolean)
- share_token (text, nullable)
- color (text)
- total_credits (integer)
- has_conflicts (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

**`user_preferences`** - App settings
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- school_filters (jsonb)
- time_preferences (jsonb)
- ui_theme (text)
- notification_settings (jsonb)
```

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data:
```sql
CREATE POLICY "Users can only view their own data"
  ON user_liked_courses FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   cd /Users/willhammond/5CSwipe/5c-swipe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   EXPO_PUBLIC_PYTHON_API_URL=http://localhost:5000
   EXPO_PUBLIC_ENV=development
   ```

4. **Run database migrations**
   Execute the SQL migration in Supabase dashboard:
   ```bash
   # Found in: supabase/migrations/
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Open on your device**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser (desktop calendar works best here!)
   - Scan QR code with Expo Go app on physical device

---

## 🎨 Key Components

### Desktop Calendar View
**File**: `components/DesktopCalendarView.tsx`

Features:
- Drag-and-drop course scheduling
- Monday-Friday, 8 AM - 9 PM grid
- Pastel color-coded course blocks
- Searchable course sidebar
- Auto-detection of course meeting times
- Real-time sync with Supabase

```tsx
// Automatically switches between mobile swipe and desktop calendar
const isDesktop = Platform.OS === 'web' && windowWidth >= 1024;

{isDesktop && viewMode === 'calendar' ? (
  <DesktopCalendarView />
) : (
  <SwipeableStack courses={filteredCourses} />
)}
```

### Real-Time Sync Pattern
**Files**: `contexts/LikedCoursesContext.tsx`, `contexts/ScheduleVariantsContext.tsx`

All user data syncs in real-time via Supabase PostgreSQL subscriptions:

```tsx
// Subscribe to changes
const channel = supabase
  .channel('user_liked_courses_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_liked_courses',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    console.log('📡 Real-time update received');
    loadFromSupabase(); // Refresh data
  })
  .subscribe();
```

### Course Data Flow
**Priority**: Python API → Supabase → Mock Data

```tsx
const { courses, loading, error, dataSource } = useCourses({ semester: 'FA 2025' });

// dataSource will be: 'python-api' | 'supabase' | 'mock'
```

---

## 🔐 Authentication Flow

1. **Welcome Screen** → 3-slide animated carousel
2. **Sign Up** → Email/password + school selection
3. **Email Verification** → Check inbox + resend cooldown
4. **Onboarding Wizard** → 4 steps:
   - Graduation year
   - Major selection
   - Minor selection (optional)
   - Credit system preference
5. **Home Screen** → Start swiping!

**Protected Routes**: AuthGuard wraps entire app, redirects to `/auth/login` if not authenticated.

---

## 📱 Mobile vs Desktop Experience

### Mobile (< 1024px)
- **Swipe interface** for course discovery
- **Vertical card stack** with gestures
- **Compact calendar view** in schedule tab
- **Touch-optimized** controls

### Desktop (≥ 1024px)
- **Toggle button** to switch between swipe and calendar views
- **Drag-and-drop** weekly schedule builder
- **Searchable sidebar** with all liked courses
- **Mouse-optimized** interactions
- **Larger information density**

---

## 🎯 Development Roadmap

### ✅ Completed (Weeks 1-2)
- Authentication system with Supabase
- Real-time sync for liked courses and schedules
- Desktop calendar with drag-and-drop
- Mobile swipe interface
- Multiple schedule variants
- Course data integration (Python API + Supabase + Mock)

### 🚧 In Progress (Week 3)
- Desktop calendar testing and refinement
- Visual conflict detection
- Course notes and priority ranking
- Google Calendar export

### 📋 Planned (Weeks 4-8)
- **Week 4**: Conflict resolution, smart recommendations
- **Week 5**: Social features (schedule sharing, reviews)
- **Week 6**: Notifications and automation
- **Week 7**: Architecture optimization, offline PWA
- **Week 8**: Testing and quality assurance

### 💡 Future Ideas
- AI-powered course recommendations
- Study group matching
- Campus navigation with walking times
- Textbook price comparison
- Grade distribution visualization

---

## 🧪 Testing

### Run Type Checking
```bash
npx tsc --noEmit
```

### Run Linter
```bash
npx expo lint
```

### Clear Cache
```bash
npx expo start --clear
rm -rf .expo node_modules/.cache
watchman watch-del-all
```

---

## 📊 Performance Metrics

### Real-Time Sync
- **Latency**: <500ms for cross-device updates
- **Reliability**: >95% sync success rate
- **Offline Support**: AsyncStorage fallback

### Web Vitals (Desktop)
- **LCP (Largest Contentful Paint)**: <2.5s
- **FID (First Input Delay)**: <100ms
- **CLS (Cumulative Layout Shift)**: <0.1

---

## 🤝 Contributing

This is a student project for the Claremont Colleges. Contributions welcome!

### Development Workflow
1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Make changes and test thoroughly
3. Update documentation as needed
4. Commit with clear messages: `git commit -m "Add amazing feature"`
5. Push and create pull request

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Comprehensive error handling
- Real-time sync with optimistic updates
- Platform-specific code when needed

---

## 📝 License

Private student project - All rights reserved

---

## 🙏 Acknowledgments

- **Claremont Colleges** - Course data and academic requirements
- **Supabase** - Backend infrastructure and real-time database
- **Expo** - React Native development platform
- **Students** - Feedback and feature requests

---

## 📞 Contact

**Developer**: Will Hammond
**School**: Harvey Mudd College
**Email**: [Your Email]
**Project**: 5CSwipe - Smart Course Discovery

---

## 🔗 Related Projects

- **Hyperschedule** - Original Claremont schedule builder
- **Portal** - Official course registration system
- **CourseSwipe competitors** - Similar apps at other colleges

---

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Built with ❤️ for Claremont College students**
