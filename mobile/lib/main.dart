import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

// ─── Config (keep these out of UI) ──────────────────────────────────────────
const _supabaseUrl = 'https://lcdatsdgmdukomrcsyqi.supabase.co';
const _supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZGF0c2RnbWR1a29tcmNzeXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjYxOTIsImV4cCI6MjA5Njg0MjE5Mn0.EncHvSM5CZ1e2hQIeXGeFJq05ADxWkT0D5qjRJLHhAk';
const _apiBase = 'https://mareli-backend.onrender.com/api';

// ─── Design tokens ───────────────────────────────────────────────────────────
const kPrimary = Color(0xFF1A6B3C);
const kSecondary = Color(0xFFF5A623);
const kAccent = Color(0xFFE63946);
const kSurface = Color(0xFFFDFAF5);
const kInk = Color(0xFF17212B);
const kBorder = Color(0xFFE9E2D8);
const kMuted = Color(0xFF9CA3AF);

// ─── Bootstrap ───────────────────────────────────────────────────────────────
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  await Supabase.initialize(url: _supabaseUrl, publishableKey: _supabaseKey);
  runApp(const MareliApp());
}

SupabaseClient get db => Supabase.instance.client;

// ─── Helpers ─────────────────────────────────────────────────────────────────
String txt(Map<String, dynamic>? row, String key, [String fb = '']) =>
    row?[key]?.toString() ?? fb;

num num0(Map<String, dynamic>? row, String key) {
  final v = row?[key];
  if (v is num) return v;
  return num.tryParse(v?.toString() ?? '') ?? 0;
}

String money(num n) {
  final s = n
      .round()
      .abs()
      .toString()
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ');
  return 'XAF $s';
}

String today() => DateTime.now().toIso8601String().split('T').first;

void snack(BuildContext ctx, String msg, {bool err = false}) {
  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
    content: Text(msg),
    backgroundColor: err ? kAccent : kPrimary,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
  ));
}

// ─── API layer (routes never shown to user) ───────────────────────────────────
class _Api {
  static Future<T> _get<T>(String path, T Function(dynamic) parse) async {
    final res = await http.get(Uri.parse('$_apiBase$path'));
    if (res.statusCode >= 400)
      throw Exception('Server error ${res.statusCode}');
    return parse(jsonDecode(res.body));
  }

  static Future<bool> healthy() async {
    try {
      final res = await http
          .get(Uri.parse('$_apiBase/health'))
          .timeout(const Duration(seconds: 5));
      return res.statusCode < 400;
    } catch (_) {
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> users() =>
      _get('/users', (d) => (d as List).cast<Map<String, dynamic>>());

  static Future<List<Map<String, dynamic>>> streams({String? yearId}) {
    final q = yearId != null ? '?academic_year_id=$yearId' : '';
    return _get('/streams$q', (d) => (d as List).cast<Map<String, dynamic>>());
  }
}

// ─── App root ─────────────────────────────────────────────────────────────────
class MareliApp extends StatelessWidget {
  const MareliApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MARELI School',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: kSurface,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: kPrimary,
          primary: kPrimary,
          secondary: kSecondary,
          surface: kSurface,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: kSurface,
          foregroundColor: kInk,
          elevation: 0,
          scrolledUnderElevation: 1,
          shadowColor: kBorder,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: kInk,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: kBorder),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: kBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: kPrimary, width: 1.5),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: kPrimary,
            foregroundColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        dividerTheme: const DividerThemeData(color: kBorder, space: 1),
      ),
      home: const _AuthGate(),
    );
  }
}

// ─── Auth gate ────────────────────────────────────────────────────────────────
class _AuthGate extends StatefulWidget {
  const _AuthGate();
  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  Session? _session;
  late final StreamSubscription<AuthState> _sub;

  @override
  void initState() {
    super.initState();
    _session = db.auth.currentSession;
    _sub = db.auth.onAuthStateChange.listen((s) {
      if (mounted) setState(() => _session = s.session);
    });
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      _session == null ? const LoginScreen() : const HomeShell();
}

// ─── Login ────────────────────────────────────────────────────────────────────
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      snack(context, 'Enter your email and password', err: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await db.auth.signInWithPassword(
          email: _email.text.trim(), password: _password.text);
    } on AuthException catch (e) {
      if (mounted) snack(context, e.message, err: true);
    } catch (e) {
      if (mounted) snack(context, 'Login failed', err: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo + school name
                  Center(
                    child: Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        color: kPrimary.withAlpha(12),
                        shape: BoxShape.circle,
                        border: Border.all(color: kBorder, width: 1.5),
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/images/logo_ma.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.school,
                            size: 44,
                            color: kPrimary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Ss. Mary & Elizabeth',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w900, color: kInk),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Nursery and Primary Academy',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: kPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'School Management System',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 32),

                  // Card
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: kBorder),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(8),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Staff Sign In',
                          style: TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [kAccent, kPrimary, kSecondary]
                              .map((c) => Container(
                                    width: 32,
                                    height: 3,
                                    margin: const EdgeInsets.only(right: 4),
                                    decoration: BoxDecoration(
                                        color: c,
                                        borderRadius: BorderRadius.circular(8)),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 22),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'Email address',
                            prefixIcon: Icon(Icons.mail_outline, size: 20),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _password,
                          obscureText: _obscure,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _signIn(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon:
                                const Icon(Icons.lock_outline, size: 20),
                            suffixIcon: IconButton(
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                size: 20,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: FilledButton.icon(
                            onPressed: _loading ? null : _signIn,
                            icon: _loading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.login, size: 18),
                            label: Text(
                              _loading ? 'Signing in…' : 'Sign In',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'MARELI Academy · Buea, Cameroon',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Home shell ───────────────────────────────────────────────────────────────
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  Map<String, dynamic>? _profile;
  bool _loadingProfile = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loadingProfile = true);
    try {
      final user = db.auth.currentUser;
      if (user != null) {
        _profile =
            await db.from('profiles').select().eq('id', user.id).maybeSingle();
      }
    } finally {
      if (mounted) setState(() => _loadingProfile = false);
    }
  }

  String get _role => txt(_profile, 'role', 'staff');
  bool get _isTeacher => _role == 'teacher';
  bool get _isAdmin =>
      _role == 'admin' || _role == 'headmaster' || _role == 'secretary';
  bool get _isBursar => _role == 'bursar';

  @override
  Widget build(BuildContext context) {
    if (_loadingProfile) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: kPrimary)),
      );
    }

    final pages = [
      DashboardScreen(profile: _profile),
      StudentsScreen(profile: _profile),
      AttendanceScreen(profile: _profile),
      GradesScreen(profile: _profile),
      if (!_isTeacher) FeesScreen(profile: _profile),
      MoreScreen(profile: _profile, onRefreshProfile: _loadProfile),
    ];

    final navItems = [
      const NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Home',
      ),
      const NavigationDestination(
        icon: Icon(Icons.groups_outlined),
        selectedIcon: Icon(Icons.groups),
        label: 'Students',
      ),
      const NavigationDestination(
        icon: Icon(Icons.fact_check_outlined),
        selectedIcon: Icon(Icons.fact_check),
        label: 'Attend.',
      ),
      const NavigationDestination(
        icon: Icon(Icons.grade_outlined),
        selectedIcon: Icon(Icons.grade),
        label: 'Grades',
      ),
      if (!_isTeacher)
        const NavigationDestination(
          icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long),
          label: 'Fees',
        ),
      const NavigationDestination(
        icon: Icon(Icons.apps_outlined),
        selectedIcon: Icon(Icons.apps),
        label: 'More',
      ),
    ];

    // Clamp tab index if switching roles
    final safeTab = _tab.clamp(0, pages.length - 1);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: kBorder),
              ),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/logo_ma.png',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      const Icon(Icons.school, size: 20, color: kPrimary),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'MARELI School',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                Text(
                  txt(_profile, 'full_name', _role).split(' ').first,
                  style: const TextStyle(fontSize: 11, color: kMuted),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => db.auth.signOut(),
            icon: const Icon(Icons.logout, size: 20),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: IndexedStack(index: safeTab, children: pages),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: kBorder)),
        ),
        child: NavigationBar(
          selectedIndex: safeTab,
          height: 64,
          backgroundColor: Colors.white,
          indicatorColor: kPrimary.withAlpha(24),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: navItems,
        ),
      ),
    );
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.profile});
  final Map<String, dynamic>? profile;
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _classes = [];
  List<Map<String, dynamic>> _fees = [];
  List<Map<String, dynamic>> _terms = [];
  List<Map<String, dynamic>> _sequences = [];
  List<Map<String, dynamic>> _staff = [];
  bool _backendOk = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final isTeacher = txt(widget.profile, 'role') == 'teacher';
      final uid = widget.profile?['id']?.toString();

      final results = await Future.wait<dynamic>([
        db
            .from('students')
            .select(
                'id, full_name, class_level, gender, section, created_at, photo_url')
            .order('created_at', ascending: false),
        isTeacher && uid != null
            ? db.from('classes').select().eq('teacher_id', uid).order('name')
            : db.from('classes').select().order('name'),
        db.from('student_fees').select('total_owed, total_paid'),
        db.from('terms').select().order('created_at', ascending: false),
        db.from('sequences').select().order('created_at', ascending: false),
        db.from('profiles').select('id, role, full_name'),
        _Api.healthy().then((v) => [v]),
      ]);

      _students = (results[0] as List).cast<Map<String, dynamic>>();
      _classes = (results[1] as List).cast<Map<String, dynamic>>();
      _fees = (results[2] as List).cast<Map<String, dynamic>>();
      _terms = (results[3] as List).cast<Map<String, dynamic>>();
      _sequences = (results[4] as List).cast<Map<String, dynamic>>();
      _staff = (results[5] as List).cast<Map<String, dynamic>>();
      _backendOk = (results[6] as List).first as bool;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    if (_error != null) return _ErrorView(msg: _error!, onRetry: _fetch);

    final totalOwed = _fees.fold<num>(0, (s, f) => s + num0(f, 'total_owed'));
    final totalPaid = _fees.fold<num>(0, (s, f) => s + num0(f, 'total_paid'));
    final activeTerm = _terms.where((t) => t['is_active'] == true).firstOrNull;
    final activeSeq =
        _sequences.where((s) => s['is_active'] == true).firstOrNull;
    final role = txt(widget.profile, 'role');
    final isTeacher = role == 'teacher';
    final name = txt(widget.profile, 'full_name', 'there').split(' ').first;

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text('Good day, $name 👋',
              style: const TextStyle(
                  fontSize: 22, fontWeight: FontWeight.w900, color: kInk)),
          const SizedBox(height: 2),
          Text(
              'Live system · ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
              style: const TextStyle(fontSize: 13, color: kMuted)),
          const SizedBox(height: 16),

          // Stat grid
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _StatCard(
                  label: 'Students',
                  value: '${_students.length}',
                  icon: Icons.groups_rounded,
                  color: kPrimary),
              _StatCard(
                  label: 'Classes',
                  value: '${_classes.length}',
                  icon: Icons.class_rounded,
                  color: const Color(0xFF2563EB)),
              if (!isTeacher) ...[
                _StatCard(
                    label: 'Collected',
                    value: money(totalPaid),
                    icon: Icons.payments_rounded,
                    color: kPrimary),
                _StatCard(
                    label: 'Outstanding',
                    value: money(totalOwed - totalPaid),
                    icon: Icons.warning_amber_rounded,
                    color: kAccent),
              ] else ...[
                _StatCard(
                    label: 'Staff',
                    value:
                        '${_staff.where((s) => s['role'] != 'admin').length}',
                    icon: Icons.badge_rounded,
                    color: kSecondary),
                _StatCard(
                    label: 'My Classes',
                    value: '${_classes.length}',
                    icon: Icons.assignment_rounded,
                    color: kAccent),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Status card
          _SectionCard(
            title: 'Live Status',
            icon: Icons.circle,
            iconColor: _backendOk ? kPrimary : kAccent,
            children: [
              _InfoRow(Icons.cloud_done_outlined, 'Backend API',
                  _backendOk ? 'Online ✓' : 'Offline'),
              _InfoRow(Icons.calendar_month_outlined, 'Active Term',
                  txt(activeTerm, 'name', 'Not set')),
              _InfoRow(Icons.timeline_outlined, 'Active Sequence',
                  txt(activeSeq, 'name', 'Not set')),
              _InfoRow(Icons.person_outline, 'Signed in as',
                  txt(widget.profile, 'role', '—').toUpperCase()),
            ],
          ),
          const SizedBox(height: 16),

          const _Label('Recent Students'),
          const SizedBox(height: 8),
          ..._students.take(5).map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _StudentCard(student: s),
              )),
        ],
      ),
    );
  }
}

// ─── Students ─────────────────────────────────────────────────────────────────
class StudentsScreen extends StatefulWidget {
  const StudentsScreen({super.key, required this.profile});
  final Map<String, dynamic>? profile;
  @override
  State<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends State<StudentsScreen> {
  bool _loading = true;
  String? _error;
  String _q = '';
  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _classes = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  bool get _isTeacher => txt(widget.profile, 'role') == 'teacher';

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_isTeacher) {
        final uid = widget.profile?['id']?.toString();
        if (uid == null) {
          _students = [];
          return;
        }
        final myClasses =
            await db.from('classes').select('id').eq('teacher_id', uid);
        final classIds = myClasses.map((c) => c['id']).toList();
        _classes = myClasses.cast<Map<String, dynamic>>();
        if (classIds.isEmpty) {
          _students = [];
          return;
        }
        final links = await db
            .from('class_students')
            .select('student_id')
            .inFilter('class_id', classIds);
        final ids = links.map((l) => l['student_id']).toList();
        if (ids.isEmpty) {
          _students = [];
          return;
        }
        _students = (await db
                .from('students')
                .select()
                .inFilter('id', ids)
                .order('full_name'))
            .cast<Map<String, dynamic>>();
      } else {
        final results = await Future.wait<dynamic>([
          db.from('students').select().order('full_name'),
          db.from('classes').select('id, name, level').order('name'),
        ]);
        _students = (results[0] as List).cast<Map<String, dynamic>>();
        _classes = (results[1] as List).cast<Map<String, dynamic>>();
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addStudent() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StudentFormDialog(classes: _classes),
    );
    if (ok == true) _fetch();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    if (_error != null) return _ErrorView(msg: _error!, onRetry: _fetch);

    final filtered = _students.where((s) {
      final h =
          '${s['full_name']} ${s['class_level']} ${s['parent_name'] ?? ''}'
              .toLowerCase();
      return h.contains(_q.toLowerCase());
    }).toList();

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Row(children: [
            const Expanded(
                child: Text('Students',
                    style:
                        TextStyle(fontSize: 22, fontWeight: FontWeight.w900))),
            if (!_isTeacher)
              FilledButton.icon(
                onPressed: _addStudent,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add'),
                style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10)),
              ),
          ]),
          const SizedBox(height: 12),
          TextField(
            onChanged: (v) => setState(() => _q = v),
            decoration: const InputDecoration(
              hintText: 'Search name, class or parent…',
              prefixIcon: Icon(Icons.search, size: 20),
            ),
          ),
          const SizedBox(height: 6),
          Text('${filtered.length} student${filtered.length == 1 ? '' : 's'}',
              style: const TextStyle(fontSize: 12, color: kMuted)),
          const SizedBox(height: 10),
          if (filtered.isEmpty)
            const _EmptyState(msg: 'No students found.')
          else
            ...filtered.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _StudentCard(student: s, showDetails: true),
                )),
        ],
      ),
    );
  }
}

// ─── Attendance ───────────────────────────────────────────────────────────────
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key, required this.profile});
  final Map<String, dynamic>? profile;
  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _date = today();
  String? _classId;
  List<Map<String, dynamic>> _classes = [];
  List<Map<String, dynamic>> _students = [];
  Map<String, String> _att = {};

  static const _statuses = ['present', 'absent', 'late', 'excused'];
  static const _colors = {
    'present': kPrimary,
    'absent': kAccent,
    'late': kSecondary,
    'excused': Color(0xFF6366F1),
  };
  static const _icons = {
    'present': Icons.check_circle,
    'absent': Icons.cancel,
    'late': Icons.watch_later,
    'excused': Icons.info,
  };

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  bool get _isTeacher => txt(widget.profile, 'role') == 'teacher';

  Future<void> _loadClasses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final uid = widget.profile?['id']?.toString();
      _classes = _isTeacher && uid != null
          ? (await db
                  .from('classes')
                  .select()
                  .eq('teacher_id', uid)
                  .order('name'))
              .cast<Map<String, dynamic>>()
          : (await db.from('classes').select().order('name'))
              .cast<Map<String, dynamic>>();
      if (_classes.isNotEmpty) {
        _classId = _classes.first['id'].toString();
        await _loadAttendance();
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadAttendance() async {
    if (_classId == null) return;
    final links = await db
        .from('class_students')
        .select('student_id, students(id, full_name, gender, photo_url)')
        .eq('class_id', _classId!);
    _students = links
        .map<Map<String, dynamic>?>(
            (r) => r['students'] as Map<String, dynamic>?)
        .whereType<Map<String, dynamic>>()
        .toList();
    _att = {for (final s in _students) s['id'].toString(): 'present'};
    if (_students.isNotEmpty) {
      final rows = await db
          .from('attendance')
          .select('student_id, status')
          .eq('date', _date)
          .inFilter('student_id', _students.map((s) => s['id']).toList());
      for (final r in rows) {
        _att[r['student_id'].toString()] = r['status'].toString();
      }
    }
    if (mounted) setState(() {});
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.parse(_date),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx)
            .copyWith(colorScheme: const ColorScheme.light(primary: kPrimary)),
        child: child!,
      ),
    );
    if (picked != null) {
      _date = picked.toIso8601String().split('T').first;
      await _loadAttendance();
    }
  }

  Future<void> _save() async {
    if (_classId == null || _students.isEmpty) return;
    setState(() => _saving = true);
    try {
      final rows = _students.map((s) {
        final id = s['id'].toString();
        return {
          'student_id': id,
          'class_id': _classId,
          'date': _date,
          'status': _att[id] ?? 'present',
        };
      }).toList();
      await db.from('attendance').upsert(rows, onConflict: 'student_id,date');
      if (mounted) snack(context, 'Attendance saved ✓');
    } catch (e) {
      if (mounted) snack(context, e.toString(), err: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toggle(String id) {
    final cur = _att[id] ?? 'present';
    final next = _statuses[(_statuses.indexOf(cur) + 1) % _statuses.length];
    setState(() => _att[id] = next);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    if (_error != null) return _ErrorView(msg: _error!, onRetry: _loadClasses);

    final present = _att.values.where((s) => s == 'present').length;
    final absent = _att.values.where((s) => s == 'absent').length;
    final late = _att.values.where((s) => s == 'late').length;

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: _loadClasses,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          const Text('Attendance',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),

          // Summary chips
          Row(children: [
            _AttBadge('Present', present, kPrimary),
            const SizedBox(width: 8),
            _AttBadge('Absent', absent, kAccent),
            const SizedBox(width: 8),
            _AttBadge('Late', late, kSecondary),
          ]),
          const SizedBox(height: 14),

          // Date picker
          GestureDetector(
            onTap: _pickDate,
            child: AbsorbPointer(
              child: TextField(
                controller: TextEditingController(text: _date),
                decoration: const InputDecoration(
                  labelText: 'Date',
                  prefixIcon: Icon(Icons.calendar_today_outlined, size: 20),
                  suffixIcon: Icon(Icons.edit_calendar_outlined, size: 20),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Class dropdown
          DropdownButtonFormField<String>(
            value: _classId,
            decoration: const InputDecoration(
              labelText: 'Class',
              prefixIcon: Icon(Icons.class_outlined, size: 20),
            ),
            items: _classes
                .map((c) => DropdownMenuItem(
                      value: c['id'].toString(),
                      child: Text('${c['name']} – ${c['level']}'),
                    ))
                .toList(),
            onChanged: (v) async {
              _classId = v;
              await _loadAttendance();
            },
          ),
          const SizedBox(height: 14),

          if (_students.isEmpty)
            const _EmptyState(msg: 'No students in this class yet.')
          else
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: kBorder),
              ),
              child: Column(
                children: _students.asMap().entries.map((entry) {
                  final i = entry.key;
                  final s = entry.value;
                  final id = s['id'].toString();
                  final status = _att[id] ?? 'present';
                  final color = _colors[status] ?? kPrimary;
                  final icon = _icons[status] ?? Icons.check_circle;
                  return Column(
                    children: [
                      if (i != 0) const Divider(height: 1),
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 4),
                        leading: _Avatar(row: s),
                        title: Text(txt(s, 'full_name', 'Student'),
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                        subtitle: Text(status.toUpperCase(),
                            style: TextStyle(
                                color: color,
                                fontSize: 11,
                                fontWeight: FontWeight.w600)),
                        trailing: GestureDetector(
                          onTap: () => _toggle(id),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: color.withAlpha(20),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: color.withAlpha(60)),
                            ),
                            child: Icon(icon, color: color, size: 18),
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _saving || _students.isEmpty ? null : _save,
            icon: _saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_outlined, size: 18),
            label: Text(_saving ? 'Saving…' : 'Save Attendance',
                style: const TextStyle(fontWeight: FontWeight.w700)),
            style:
                FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ],
      ),
    );
  }
}

Widget _AttBadge(String label, int count, Color color) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(50)),
      ),
      child: Text('$count $label',
          style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w700, color: color)),
    );

// ─── Grades ───────────────────────────────────────────────────────────────────
class GradesScreen extends StatefulWidget {
  const GradesScreen({super.key, required this.profile});
  final Map<String, dynamic>? profile;
  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _classId;
  String? _sequenceId;
  List<Map<String, dynamic>> _classes = [];
  List<Map<String, dynamic>> _sequences = [];
  List<Map<String, dynamic>> _subjects = [];
  List<Map<String, dynamic>> _students = [];
  // studentId -> subjectId -> score
  Map<String, Map<String, String>> _scores = {};

  @override
  void initState() {
    super.initState();
    _loadSetup();
  }

  bool get _isTeacher => txt(widget.profile, 'role') == 'teacher';

  Future<void> _loadSetup() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final uid = widget.profile?['id']?.toString();
      final results = await Future.wait<dynamic>([
        _isTeacher && uid != null
            ? db
                .from('classes')
                .select('id, name, level')
                .eq('teacher_id', uid)
                .order('name')
            : db.from('classes').select('id, name, level').order('name'),
        db
            .from('sequences')
            .select()
            .eq('is_active', true)
            .order('created_at', ascending: false),
      ]);
      _classes = (results[0] as List).cast<Map<String, dynamic>>();
      _sequences = (results[1] as List).cast<Map<String, dynamic>>();
      if (_sequences.isEmpty) {
        _sequences = (await db
                .from('sequences')
                .select()
                .order('created_at', ascending: false))
            .cast<Map<String, dynamic>>();
      }
      if (_classes.isNotEmpty) _classId = _classes.first['id'].toString();
      if (_sequences.isNotEmpty)
        _sequenceId = _sequences.first['id'].toString();
      await _loadGrades();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadGrades() async {
    if (_classId == null) return;

    // Load students in class
    final links = await db
        .from('class_students')
        .select('student_id, students(id, full_name)')
        .eq('class_id', _classId!);
    _students = links
        .map<Map<String, dynamic>?>(
            (r) => r['students'] as Map<String, dynamic>?)
        .whereType<Map<String, dynamic>>()
        .toList();

    // Load subjects for this class
    final subLinks = await db
        .from('subjects')
        .select()
        .eq('class_id', _classId!)
        .order('name');
    _subjects = subLinks.cast<Map<String, dynamic>>();

    // Load existing grades
    _scores = {};
    if (_students.isNotEmpty && _sequenceId != null) {
      final grades = await db
          .from('grades')
          .select('student_id, subject_id, score')
          .eq('sequence_id', _sequenceId!)
          .inFilter('student_id', _students.map((s) => s['id']).toList());
      for (final g in grades) {
        final sid = g['student_id'].toString();
        final sub = g['subject_id'].toString();
        _scores.putIfAbsent(sid, () => {})[sub] = g['score']?.toString() ?? '';
      }
    }
    if (mounted) setState(() {});
  }

  Future<void> _save() async {
    if (_classId == null || _sequenceId == null) return;
    setState(() => _saving = true);
    try {
      final rows = <Map<String, dynamic>>[];
      for (final student in _students) {
        final sid = student['id'].toString();
        for (final subject in _subjects) {
          final subId = subject['id'].toString();
          final scoreStr = _scores[sid]?[subId] ?? '';
          final score = double.tryParse(scoreStr);
          if (score != null) {
            rows.add({
              'student_id': sid,
              'subject_id': subId,
              'class_id': _classId,
              'sequence_id': _sequenceId,
              'score': score,
            });
          }
        }
      }
      if (rows.isNotEmpty) {
        await db
            .from('grades')
            .upsert(rows, onConflict: 'student_id,subject_id,sequence_id');
      }
      if (mounted) snack(context, 'Grades saved ✓');
    } catch (e) {
      if (mounted) snack(context, e.toString(), err: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    if (_error != null) return _ErrorView(msg: _error!, onRetry: _loadSetup);

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: _loadSetup,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        children: [
          const Text('Grades',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _sequenceId,
            decoration: const InputDecoration(
              labelText: 'Sequence',
              prefixIcon: Icon(Icons.timeline_outlined, size: 20),
            ),
            items: _sequences
                .map((s) => DropdownMenuItem(
                      value: s['id'].toString(),
                      child: Text(txt(s, 'name', 'Sequence')),
                    ))
                .toList(),
            onChanged: (v) async {
              _sequenceId = v;
              await _loadGrades();
            },
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _classId,
            decoration: const InputDecoration(
              labelText: 'Class',
              prefixIcon: Icon(Icons.class_outlined, size: 20),
            ),
            items: _classes
                .map((c) => DropdownMenuItem(
                      value: c['id'].toString(),
                      child: Text('${c['name']} – ${c['level']}'),
                    ))
                .toList(),
            onChanged: (v) async {
              _classId = v;
              await _loadGrades();
            },
          ),
          const SizedBox(height: 14),
          if (_subjects.isEmpty)
            const _EmptyState(
                msg:
                    'No subjects found for this class.\nAdd subjects in Academic Setup.')
          else if (_students.isEmpty)
            const _EmptyState(msg: 'No students assigned to this class.')
          else ...[
            Text('${_students.length} students · ${_subjects.length} subjects',
                style: const TextStyle(fontSize: 12, color: kMuted)),
            const SizedBox(height: 10),
            ..._students.map((student) {
              final sid = student['id'].toString();
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                      child: Row(children: [
                        _Avatar(row: student, radius: 16),
                        const SizedBox(width: 10),
                        Text(txt(student, 'full_name', 'Student'),
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                      ]),
                    ),
                    const Divider(height: 1),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _subjects.map((sub) {
                          final subId = sub['id'].toString();
                          final ctrl = TextEditingController(
                              text: _scores[sid]?[subId] ?? '');
                          return SizedBox(
                            width: (MediaQuery.of(context).size.width - 80) / 2,
                            child: TextField(
                              controller: ctrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                      decimal: true),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                    RegExp(r'^\d*\.?\d*')),
                              ],
                              onChanged: (v) {
                                _scores.putIfAbsent(sid, () => {})[subId] = v;
                              },
                              decoration: InputDecoration(
                                labelText: txt(sub, 'name', 'Subject'),
                                hintText: '/20',
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 10),
                              ),
                              style: const TextStyle(fontSize: 13),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              );
            }),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save_outlined, size: 18),
              label: Text(_saving ? 'Saving…' : 'Save Grades',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48)),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Fees ─────────────────────────────────────────────────────────────────────
class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key, required this.profile});
  final Map<String, dynamic>? profile;
  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  bool _loading = true;
  String? _error;
  String _q = '';
  String _selectedYear = '';
  List<Map<String, dynamic>> _years = [];
  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _fees = [];
  List<Map<String, dynamic>> _payments = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _years = (await db
              .from('academic_years')
              .select()
              .order('created_at', ascending: false))
          .cast<Map<String, dynamic>>();
      final active = _years.where((y) => y['is_active'] == true).firstOrNull;
      if (_selectedYear.isEmpty) {
        _selectedYear =
            txt(active ?? (_years.isNotEmpty ? _years.first : {}), 'name');
      }
      final results = await Future.wait<dynamic>([
        db
            .from('students')
            .select(
                'id, full_name, class_level, gender, photo_url, parent_name, parent_phone')
            .order('full_name'),
        db.from('student_fees').select().eq('academic_year', _selectedYear),
        db
            .from('fee_payments')
            .select()
            .order('payment_date', ascending: false),
      ]);
      _students = (results[0] as List).cast<Map<String, dynamic>>();
      _fees = (results[1] as List).cast<Map<String, dynamic>>();
      _payments = (results[2] as List).cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic>? _feeFor(String sid) =>
      _fees.where((f) => f['student_id'].toString() == sid).firstOrNull;

  List<Map<String, dynamic>> _paymentsFor(String feeId) =>
      _payments.where((p) => p['student_fee_id'].toString() == feeId).toList();

  Future<void> _recordPayment(Map<String, dynamic> student) async {
    final fee = _feeFor(student['id'].toString());
    if (fee == null) {
      snack(context, 'Fee account not set for this student', err: true);
      return;
    }
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _PaymentDialog(student: student, fee: fee),
    );
    if (result == null) return;
    try {
      await db.from('fee_payments').insert({
        'student_fee_id': fee['id'],
        'student_id': student['id'],
        'amount': result['amount'],
        'component': result['component'],
        'receipt_no': result['receipt_no'],
        'bank_name': 'Mobile app',
        'payment_date': today(),
        'recorded_by': db.auth.currentUser?.id,
      });
      await db.from('student_fees').update({
        'total_paid': num0(fee, 'total_paid') + (result['amount'] as num),
      }).eq('id', fee['id']);
      if (mounted) snack(context, 'Payment recorded ✓');
      _fetch();
    } catch (e) {
      if (mounted) snack(context, e.toString(), err: true);
    }
  }

  Future<void> _showHistory(Map<String, dynamic> student) async {
    final fee = _feeFor(student['id'].toString());
    if (fee == null) {
      snack(context, 'No fee record for this student', err: true);
      return;
    }
    final history = _paymentsFor(fee['id'].toString());
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _HistorySheet(
          student: student, fee: fee, payments: history, onDeleted: _fetch),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    if (_error != null) return _ErrorView(msg: _error!, onRetry: _fetch);

    final totalOwed = _fees.fold<num>(0, (s, f) => s + num0(f, 'total_owed'));
    final totalPaid = _fees.fold<num>(0, (s, f) => s + num0(f, 'total_paid'));
    final paidCount = _fees
        .where((f) =>
            num0(f, 'total_paid') >= num0(f, 'total_owed') &&
            num0(f, 'total_owed') > 0)
        .length;

    final filtered = _students.where((s) {
      final h =
          '${s['full_name']} ${s['class_level']} ${s['parent_name'] ?? ''}'
              .toLowerCase();
      return h.contains(_q.toLowerCase());
    }).toList();

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          const Text('Fees',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),

          // Year selector
          DropdownButtonFormField<String>(
            value: _selectedYear.isEmpty ? null : _selectedYear,
            decoration: const InputDecoration(
              labelText: 'Academic Year',
              prefixIcon: Icon(Icons.school_outlined, size: 20),
            ),
            items: _years
                .map((y) => DropdownMenuItem(
                      value: y['name'].toString(),
                      child: Text(y['name'].toString() +
                          (y['program_type'] == 'holiday' ? ' (Holiday)' : '') +
                          (y['is_active'] == true ? ' ●' : '')),
                    ))
                .toList(),
            onChanged: (v) {
              if (v != null) {
                _selectedYear = v;
                _fetch();
              }
            },
          ),
          const SizedBox(height: 10),

          // Summary cards
          Row(children: [
            Expanded(
                child: _MiniStatCard('Total Fees', money(totalOwed), kPrimary)),
            const SizedBox(width: 8),
            Expanded(
                child: _MiniStatCard('Collected', money(totalPaid), kPrimary)),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
                child: _MiniStatCard(
                    'Amount Owed', money(totalOwed - totalPaid), kAccent)),
            const SizedBox(width: 8),
            Expanded(
                child: _MiniStatCard('Fully Paid',
                    '$paidCount / ${_students.length}', kSecondary)),
          ]),
          const SizedBox(height: 14),

          TextField(
            onChanged: (v) => setState(() => _q = v),
            decoration: const InputDecoration(
              hintText: 'Search student or parent…',
              prefixIcon: Icon(Icons.search, size: 20),
            ),
          ),
          const SizedBox(height: 10),

          if (filtered.isEmpty)
            const _EmptyState(msg: 'No students found.')
          else
            ...filtered.map((student) {
              final sid = student['id'].toString();
              final fee = _feeFor(sid);
              final paid = num0(fee, 'total_paid');
              final owed = num0(fee, 'total_owed');
              final bal = owed - paid;
              final pct = owed > 0 ? (paid / owed).clamp(0.0, 1.0) : 0.0;
              final isPaid = bal <= 0 && fee != null && owed > 0;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: isPaid ? kPrimary.withAlpha(60) : kBorder),
                ),
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: const EdgeInsets.fromLTRB(14, 8, 10, 4),
                      leading: _Avatar(row: student),
                      title: Text(txt(student, 'full_name', 'Student'),
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                      subtitle: Text(
                        fee == null
                            ? 'Fee not set'
                            : '${txt(student, 'class_level', '—')} · Paid ${money(paid)} of ${money(owed)}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                        IconButton(
                          tooltip: 'Payment history',
                          onPressed: () => _showHistory(student),
                          icon: const Icon(Icons.history,
                              size: 20, color: kMuted),
                        ),
                        IconButton(
                          tooltip: isPaid ? 'Fully paid' : 'Record payment',
                          onPressed: () => _recordPayment(student),
                          icon: Icon(
                            isPaid
                                ? Icons.verified_rounded
                                : Icons.add_card_outlined,
                            size: 22,
                            color: isPaid ? kPrimary : kAccent,
                          ),
                        ),
                      ]),
                    ),
                    if (fee != null) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: pct,
                                minHeight: 6,
                                backgroundColor: kBorder,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                    kPrimary),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                      '${(pct * 100).toStringAsFixed(0)}% paid',
                                      style: const TextStyle(
                                          fontSize: 11, color: kMuted)),
                                  Text(
                                    bal > 0
                                        ? 'Balance: ${money(bal)}'
                                        : '✓ Fully paid',
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: bal > 0 ? kAccent : kPrimary),
                                  ),
                                ]),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

Widget _MiniStatCard(String label, String value, Color color) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withAlpha(12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: TextStyle(fontSize: 11, color: color.withAlpha(180))),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w800, color: color)),
      ]),
    );

// Payment dialog
class _PaymentDialog extends StatefulWidget {
  const _PaymentDialog({required this.student, required this.fee});
  final Map<String, dynamic> student;
  final Map<String, dynamic> fee;
  @override
  State<_PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<_PaymentDialog> {
  final _amount = TextEditingController();
  final _component = TextEditingController(text: 'School Fees');
  final _receipt = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    _component.dispose();
    _receipt.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final owed = num0(widget.fee, 'total_owed');
    final paid = num0(widget.fee, 'total_paid');
    return AlertDialog(
      title: Text('Record Payment\n${txt(widget.student, 'full_name')}',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: kPrimary.withAlpha(12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _kv('Total Fees', money(owed)),
                _kv('Paid', money(paid)),
                _kv('Balance', money(owed - paid)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Amount (XAF) *'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _component,
            decoration: const InputDecoration(labelText: 'Component'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _receipt,
            decoration: const InputDecoration(labelText: 'Receipt No.'),
          ),
        ]),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final amt = num.tryParse(_amount.text);
            if (amt == null || amt <= 0) return;
            Navigator.pop(context, {
              'amount': amt,
              'component':
                  _component.text.isEmpty ? 'School Fees' : _component.text,
              'receipt_no': _receipt.text,
            });
          },
          child: const Text('Record'),
        ),
      ],
    );
  }

  Widget _kv(String k, String v) => Column(children: [
        Text(k, style: const TextStyle(fontSize: 10, color: kMuted)),
        Text(v,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      ]);
}

// History bottom sheet
class _HistorySheet extends StatelessWidget {
  const _HistorySheet({
    required this.student,
    required this.fee,
    required this.payments,
    required this.onDeleted,
  });
  final Map<String, dynamic> student;
  final Map<String, dynamic> fee;
  final List<Map<String, dynamic>> payments;
  final VoidCallback onDeleted;

  @override
  Widget build(BuildContext context) {
    final owed = num0(fee, 'total_owed');
    final paid = num0(fee, 'total_paid');
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: kBorder, borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 16),
          Text('Payment History – ${txt(student, 'full_name')}',
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('${money(paid)} paid of ${money(owed)}',
              style: const TextStyle(fontSize: 13, color: kMuted)),
          const SizedBox(height: 14),
          if (payments.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                  child: Text('No payments recorded yet.',
                      style: TextStyle(color: kMuted))),
            )
          else
            ...payments.map((p) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: kPrimary.withAlpha(16),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.payments_outlined,
                        color: kPrimary, size: 18),
                  ),
                  title: Text(money(num0(p, 'amount')),
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: Text(
                      '${txt(p, 'component', '—')} · ${txt(p, 'payment_date')}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline,
                        color: kAccent, size: 20),
                    onPressed: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('Delete payment?'),
                          content: const Text(
                              'This will reverse the total paid amount.'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Cancel')),
                            FilledButton(
                                onPressed: () => Navigator.pop(context, true),
                                style: FilledButton.styleFrom(
                                    backgroundColor: kAccent),
                                child: const Text('Delete')),
                          ],
                        ),
                      );
                      if (ok != true) return;
                      await db.from('fee_payments').delete().eq('id', p['id']);
                      final newPaid =
                          (num0(fee, 'total_paid') - num0(p, 'amount'))
                              .clamp(0, double.infinity);
                      await db
                          .from('student_fees')
                          .update({'total_paid': newPaid}).eq('id', fee['id']);
                      if (context.mounted) Navigator.pop(context);
                      onDeleted();
                    },
                  ),
                )),
        ],
      ),
    );
  }
}

// ─── More ─────────────────────────────────────────────────────────────────────
class MoreScreen extends StatefulWidget {
  const MoreScreen(
      {super.key, required this.profile, required this.onRefreshProfile});
  final Map<String, dynamic>? profile;
  final VoidCallback onRefreshProfile;
  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _staff = [];
  List<Map<String, dynamic>> _classes = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  bool get _isAdmin {
    final r = txt(widget.profile, 'role');
    return r == 'admin' || r == 'headmaster' || r == 'secretary';
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        _Api.users(),
        db
            .from('classes')
            .select('id, name, level, teacher_name')
            .order('name'),
      ]);
      _staff = results[0] as List<Map<String, dynamic>>;
      _classes = (results[1] as List).cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    if (_error != null) return _ErrorView(msg: _error!, onRetry: _fetch);

    final teachers = _staff.where((s) => s['role'] == 'teacher').toList();
    final role = txt(widget.profile, 'role');

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          const Text('More',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 16),

          // Profile card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [kPrimary, Color(0xFF2E8B5A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: Colors.white.withAlpha(30),
                child: Text(
                  txt(widget.profile, 'full_name', 'U')
                      .substring(0, 1)
                      .toUpperCase(),
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Colors.white),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(txt(widget.profile, 'full_name', 'Staff Member'),
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 16)),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(30),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(role.toUpperCase(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700)),
                      ),
                    ]),
              ),
              IconButton(
                onPressed: () => db.auth.signOut(),
                icon: const Icon(Icons.logout, color: Colors.white, size: 20),
                tooltip: 'Sign out',
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Quick stats
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.6,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _StatCard(
                  label: 'Classes',
                  value: '${_classes.length}',
                  icon: Icons.class_rounded,
                  color: kPrimary),
              _StatCard(
                  label: 'Teachers',
                  value: '${teachers.length}',
                  icon: Icons.school_rounded,
                  color: kSecondary),
              _StatCard(
                  label: 'All Staff',
                  value: '${_staff.length}',
                  icon: Icons.badge_rounded,
                  color: const Color(0xFF2563EB)),
              _StatCard(
                  label: 'My Role',
                  value: role,
                  icon: Icons.person_rounded,
                  color: kAccent),
            ],
          ),
          const SizedBox(height: 16),

          // Classes
          const _Label('Classes'),
          const SizedBox(height: 8),
          ..._classes.map((c) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: kBorder),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                  leading: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: kPrimary.withAlpha(16),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.class_outlined,
                        color: kPrimary, size: 18),
                  ),
                  title: Text(txt(c, 'name', 'Class'),
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: Text(txt(c, 'level', '—'),
                      style: const TextStyle(fontSize: 12)),
                  trailing: txt(c, 'teacher_name').isNotEmpty
                      ? Text(txt(c, 'teacher_name'),
                          style: const TextStyle(
                              fontSize: 11,
                              color: kPrimary,
                              fontWeight: FontWeight.w600))
                      : const Text('No teacher',
                          style: TextStyle(fontSize: 11, color: kMuted)),
                ),
              )),
          const SizedBox(height: 16),

          // Staff
          const _Label('Staff Members'),
          const SizedBox(height: 8),
          ..._staff.where((s) => s['role'] != 'admin').map((member) =>
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: kBorder),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                  leading: CircleAvatar(
                    radius: 20,
                    backgroundColor: kSecondary.withAlpha(24),
                    foregroundColor: kSecondary,
                    child: Text(
                      txt(member, 'full_name', 'S')
                          .substring(0, 1)
                          .toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                  title: Text(txt(member, 'full_name', 'Staff'),
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: Text(txt(member, 'role', 'staff'),
                      style: const TextStyle(fontSize: 12)),
                  trailing: txt(member, 'phone').isNotEmpty
                      ? Text(txt(member, 'phone'),
                          style: const TextStyle(fontSize: 11, color: kMuted))
                      : null,
                ),
              )),
          const SizedBox(height: 8),

          // Sign out
          OutlinedButton.icon(
            onPressed: () => db.auth.signOut(),
            icon: const Icon(Icons.logout, size: 18, color: kAccent),
            label: const Text('Sign Out',
                style: TextStyle(color: kAccent, fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(46),
              side: const BorderSide(color: kAccent),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Student Form Dialog ───────────────────────────────────────────────────────
class StudentFormDialog extends StatefulWidget {
  const StudentFormDialog({super.key, required this.classes});
  final List<Map<String, dynamic>> classes;
  @override
  State<StudentFormDialog> createState() => _StudentFormDialogState();
}

class _StudentFormDialogState extends State<StudentFormDialog> {
  final _name = TextEditingController();
  final _parent = TextEditingController();
  final _phone = TextEditingController();
  String _level = 'Class 1';
  String _gender = 'male';
  String _section = 'anglophone';
  bool _saving = false;

  static const _levels = [
    'Day Care',
    'Pre-Nursery',
    'Nursery 1',
    'Nursery 2',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
  ];

  @override
  void dispose() {
    _name.dispose();
    _parent.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await db.from('students').insert({
        'full_name': _name.text.trim(),
        'class_level': _level,
        'gender': _gender,
        'section': _section,
        'parent_name': _parent.text.trim(),
        'parent_phone': _phone.text.trim(),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) snack(context, e.toString(), err: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Student',
          style: TextStyle(fontWeight: FontWeight.w800)),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
            controller: _name,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Full name *'),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _level,
            decoration: const InputDecoration(labelText: 'Class level'),
            items: _levels
                .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                .toList(),
            onChanged: (v) => setState(() => _level = v ?? _level),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _gender,
            decoration: const InputDecoration(labelText: 'Gender'),
            items: const [
              DropdownMenuItem(value: 'male', child: Text('Male')),
              DropdownMenuItem(value: 'female', child: Text('Female')),
            ],
            onChanged: (v) => setState(() => _gender = v ?? _gender),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _section,
            decoration: const InputDecoration(labelText: 'Section'),
            items: const [
              DropdownMenuItem(value: 'anglophone', child: Text('Anglophone')),
              DropdownMenuItem(
                  value: 'francophone', child: Text('Francophone')),
            ],
            onChanged: (v) => setState(() => _section = v ?? _section),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _parent,
            textInputAction: TextInputAction.next,
            decoration:
                const InputDecoration(labelText: 'Parent / Guardian name'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Parent phone'),
          ),
        ]),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving…' : 'Save Student'),
        ),
      ],
    );
  }
}

// ─── Shared Widgets ───────────────────────────────────────────────────────────
class _StatCard extends StatelessWidget {
  const _StatCard(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorder),
      ),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withAlpha(18),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            FittedBox(
              alignment: Alignment.centerLeft,
              fit: BoxFit.scaleDown,
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w900, color: kInk)),
            ),
            Text(label, style: const TextStyle(fontSize: 12, color: kMuted)),
          ]),
    );
  }
}

class _StudentCard extends StatelessWidget {
  const _StudentCard({required this.student, this.showDetails = false});
  final Map<String, dynamic> student;
  final bool showDetails;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorder),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: _Avatar(row: student),
        title: Text(txt(student, 'full_name', 'Student'),
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        subtitle: Text(
          showDetails
              ? '${txt(student, 'class_level', 'No class')} · ${txt(student, 'section', 'section')}'
                  '${txt(student, 'parent_name').isNotEmpty ? '\n${txt(student, 'parent_name')}' : ''}'
              : '${txt(student, 'class_level', 'No class')} · ${txt(student, 'section', '')}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: student['gender'] == 'female'
                ? kAccent.withAlpha(16)
                : kPrimary.withAlpha(16),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            txt(student, 'gender', '—').substring(0, 1).toUpperCase(),
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: student['gender'] == 'female' ? kAccent : kPrimary),
          ),
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.row, this.radius = 20});
  final Map<String, dynamic> row;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final photo = txt(row, 'photo_url');
    final name = txt(row, 'full_name', 'S');
    if (photo.isNotEmpty) {
      return CircleAvatar(radius: radius, backgroundImage: NetworkImage(photo));
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: kPrimary.withAlpha(20),
      foregroundColor: kPrimary,
      child: Text(
        name.isEmpty ? 'S' : name.substring(0, 1).toUpperCase(),
        style: TextStyle(fontSize: radius * 0.8, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
    this.iconColor = kPrimary,
  });
  final String title;
  final IconData icon;
  final Color iconColor;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: iconColor, size: 16),
          const SizedBox(width: 8),
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        ]),
        const SizedBox(height: 10),
        ...children,
      ]),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(children: [
        Icon(icon, color: kMuted, size: 16),
        const SizedBox(width: 10),
        Expanded(
            child:
                Text(label, style: const TextStyle(fontSize: 13, color: kInk))),
        Text(value,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, color: kInk)),
      ]),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          fontSize: 16, fontWeight: FontWeight.w800, color: kInk));
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.msg});
  final String msg;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kBorder),
        ),
        child: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.inbox_outlined, size: 36, color: kMuted),
            const SizedBox(height: 8),
            Text(msg,
                textAlign: TextAlign.center,
                style: const TextStyle(color: kMuted, fontSize: 13)),
          ]),
        ),
      );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.msg, required this.onRetry});
  final String msg;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.cloud_off_outlined, size: 48, color: kAccent),
          const SizedBox(height: 12),
          const Text('Could not load data',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(msg,
              textAlign: TextAlign.center,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: kMuted, fontSize: 13)),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Retry'),
          ),
        ]),
      ),
    );
  }
}
