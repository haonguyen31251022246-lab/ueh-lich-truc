import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CalendarDays, Users, ClipboardList, CheckCircle2,
  ChevronLeft, ChevronRight, Sparkles, Download,
  ShieldCheck, UserRound, CalendarCheck, Send, LogOut
} from 'lucide-react';
import { supabase } from './lib/supabase';
import uehLogo from './images/UEH.jpg';
import loginCover from './images/login-cover.png';
const SHIFTS = ['Sáng', 'Chiều', 'Tối'];
const STUDENTS = [
  'Nguyễn Xuân Quang', 'Trần Lư Vĩ Tài', 'Đoàn Thu Hằng', 'Nguyễn Thành Khánh Hưng',
  'Vũ Hải Đăng', 'Thái Hùng', 'Nguyễn Hải Hào', 'Phạm Hoàng Lan Phương',
  'Ngô Việt Ngân', 'Lý Gia Hân', 'Phan Thanh Nguyên', 'Võ Thị Tố Nga',
  'Ngô Thùy Dương', 'Nguyễn Hồ Uyên Thư', 'Phạm Thị Trúc Đào', 'Nguyễn Phú Hội',
  'Đỗ Thị Hồng Ngọc', 'Nguyễn Văn Gia Khánh', 'Dương Song Huy', 'Lê Hoàng Thảo Linh',
  'Thảo Nguyên'
];
const MALE_STUDENTS = [
  'Nguyễn Xuân Quang',
  'Trần Lư Vĩ Tài',
  'Nguyễn Thành Khánh Hưng',
  'Vũ Hải Đăng',
  'Thái Hùng',
  'Nguyễn Hải Hào',
  'Nguyễn Phú Hội',
  'Nguyễn Văn Gia Khánh',
];
const initial = {
  availability: {},
  assignments: {},
  publishedMonths: {},
  attendance: {},
  busy: {},
  notificationEmails: [],
  target: 2
};

const key = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const monthDays = (month) => {
  const [y, m] = month.split('-').map(Number);
  return Array.from(
    { length: new Date(y, m, 0).getDate() },
    (_, i) => key(y, m, i + 1)
  );
};

const avail = (data, day, shift) =>
  data.availability?.[day]?.[shift] || [];

const assigned = (data, day, shift) =>
  data.assignments?.[day]?.[shift] || [];

const label = (month) => {
  const [y, m] = month.split('-');
  return `Tháng ${Number(m)} / ${y}`;
};

const fmt = (day) =>
  new Date(day + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });

export default function App() {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [role, setRole] = useState('student');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [passwordLoading, setPasswordLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [student, setStudent] = useState(STUDENTS[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [notice, setNotice] = useState('');
  const [busyMode, setBusyMode] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [bankInfo, setBankInfo] = useState({ bank_name: '', bank_account_number: '', bank_account_holder: '' });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const skipNextSave = useRef(false);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;
  const days = useMemo(() => monthDays(month), [month]);
  const isPublished = !!data.publishedMonths?.[month];
  // Đổi mật khẩu tài khoản
const handleChangePassword = async (e) => {
  e.preventDefault();

  if (newPassword.length < 6) {
    setNotice('Mật khẩu mới phải có ít nhất 6 ký tự.');
    return;
  }

  console.log('Độ dài mật khẩu mới:', newPassword.length);
console.log('Độ dài xác nhận:', confirmPassword.length);
console.log('Hai mật khẩu giống nhau:', newPassword === confirmPassword);

if (newPassword !== confirmPassword) {
  setNotice('Mật khẩu xác nhận không khớp.');
  return;
}

  setPasswordLoading(true);
  setNotice('');

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  setPasswordLoading(false);

  if (error) {
    setNotice('Đổi mật khẩu thất bại: ' + error.message);
    return;
  }
  setNewPassword('');
  setConfirmPassword('');
  setShowPasswordForm(false);
  setNotice('Đổi mật khẩu thành công!');
};
  // Đăng xuất tài khoản.
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    setNotice('Đăng xuất thất bại. Vui lòng thử lại.');
    return;
  }
  setSession(null);
  setProfile(null);
  setLoginPassword('');
  setRole('student');
  setBusyMode(false);
  setNotice('');
};
const handleLogin = async (e) => {
  e.preventDefault();
  if (!loginUsername.trim() || !loginPassword) {
    setNotice('Vui lòng nhập tên đăng nhập và mật khẩu.');
    return;
  }
  setAuthLoading(true);
  setNotice('');
  try {
    const username = loginUsername.trim().toLowerCase();
    const { data: authData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: `${username}@uehlichtruc.com`,
        password: loginPassword
      });
    if (loginError) throw loginError;
    const { data: userProfile, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, username, full_name, role, is_active')
        .eq('id', authData.user.id)
        .single();
    if (profileError) throw profileError;
    if (!userProfile.is_active) {
      await supabase.auth.signOut();
      throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }
    setSession(authData.session);
    setProfile(userProfile);
    setStudent(userProfile.full_name);
    setRole(userProfile.role === 'admin' ? 'admin' : 'student');
    setLoginPassword('');
    setNotice(`Xin chào ${userProfile.full_name}!`);
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    setNotice(error.message || 'Đăng nhập thất bại.');
  } finally {
    setAuthLoading(false);
  }
};
// Khôi phục phiên đăng nhập khi mở lại ứng dụng.
useEffect(() => {
  let cancelled = false;

  const restoreSession = async () => {
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!data.session) return;

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, role, is_active')
        .eq('id', data.session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!userProfile.is_active) {
        await supabase.auth.signOut();

        if (!cancelled) {
          setNotice('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
        }

        return;
      }

      if (cancelled) return;

      setSession(data.session);
      setProfile(userProfile);
      setStudent(userProfile.full_name);
      setRole(userProfile.role === 'admin' ? 'admin' : 'student');
      setLoginUsername(userProfile.username);
      setNotice('');
    } catch (error) {
      console.error('Lỗi khôi phục đăng nhập:', error);
    } finally {
      if (!cancelled) setAuthLoading(false);
    }
  };

  restoreSession();

  return () => {
    cancelled = true;
  };
}, []);
  // Tải dữ liệu ban đầu và đăng ký nhận thay đổi từ Supabase Realtime.
  useEffect(() => {
    let cancelled = false;
    let channel;
    let availabilityChannel;
    const fetchData = async () => {
      try {
        const { data: result, error } = await supabase
          .from('app_state')
          .select('data')
          .eq('id', 1)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        if (result?.data) {
  skipNextSave.current = true;
  setData({ ...initial, ...result.data });
} else {
  const { error: insertError } = await supabase
    .from('app_state')
    .upsert({ id: 1, data: initial }, { onConflict: 'id' });

  if (insertError) throw insertError;
  skipNextSave.current = true;
  setData(initial);
}

// Tải toàn bộ đăng ký rảnh từ bảng riêng, chia thành từng đợt
let availabilityRows = [];
const PAGE_SIZE = 1000;

for (let from = 0; ; from += PAGE_SIZE) {
  const { data: rows, error: availabilityError } = await supabase
    .from('availability_entries')
    .select('day, shift, member')
    .range(from, from + PAGE_SIZE - 1);
  if (availabilityError) throw availabilityError;
  availabilityRows.push(...(rows || []));
  if (!rows || rows.length < PAGE_SIZE) break;
}
const availability = {};
(availabilityRows || []).forEach((row) => {
  availability[row.day] ??= {};
  availability[row.day][row.shift] ??= [];
  if (!availability[row.day][row.shift].includes(row.member)) {
    availability[row.day][row.shift].push(row.member);
  }
});
setData((prev) => ({
  ...prev,
  availability,
}));
        setDataReady(true);
        availabilityChannel = supabase
  .channel('availability-entry-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'availability_entries'
  }, (payload) => {
    if (cancelled) return;
    setData((prev) => {
      const n = structuredClone(prev);
      n.availability ??= {};
      const row = payload.eventType === 'DELETE'
        ? payload.old
        : payload.new;
      if (!row?.day || !row?.shift || !row?.member) return n;
      n.availability[row.day] ??= {};
      n.availability[row.day][row.shift] ??= [];
      const a = n.availability[row.day][row.shift];
      if (payload.eventType === 'DELETE') {
        n.availability[row.day][row.shift] =
          a.filter((x) => x !== row.member);
      } else if (!a.includes(row.member)) {
        n.availability[row.day][row.shift] = [...a, row.member];
      }

      return n;
    });
  })
  .subscribe();
        channel = supabase
          .channel('app-state-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'app_state',
            filter: 'id=eq.1'
          }, (payload) => {
            if (cancelled || !payload.new?.data) return;

            skipNextSave.current = true;
setData((prev) => ({
  ...initial,
  ...payload.new.data,
  availability: prev.availability || {},
}));
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.info('Đã kết nối Supabase Realtime.');
            }
            if (status === 'CHANNEL_ERROR') {
              console.error('Không thể kết nối Supabase Realtime.');
            }
          });
      } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
        if (!cancelled) {
          setNotice('Không thể tải dữ liệu từ máy chủ. Vui lòng tải lại trang.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
  cancelled = true;
  if (channel) supabase.removeChannel(channel);
  if (availabilityChannel) supabase.removeChannel(availabilityChannel);
};
  }, []);

  // Tự động lưu dữ liệu lên Supabase sau khi người dùng thay đổi.
  useEffect(() => {
    if (!dataReady) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('app_state')
        .update({
  data: (() => {
    const { availability, ...otherData } = data;
    return otherData;
  })(),
  updated_at: new Date().toISOString()
})
        .eq('id', 1);

      if (error) {
        console.error('Lỗi lưu dữ liệu:', error);
        setNotice('Lưu dữ liệu thất bại. Vui lòng thử lại.');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [data, dataReady]);

  // Chuyển tháng.
  const changeMonth = (n) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // Tải thông tin ngân hàng của thành viên đang chọn.
  useEffect(() => {
    if (!session || !profile) return;
    let cancelled = false;
    const loadBankInfo = async () => {
      setBankLoading(true);
      setBankInfo({ bank_name: '', bank_account_number: '', bank_account_holder: '' });
      try {
        let targetUserId = profile.id;
        if (profile.role === 'admin') {
          const { data: targetProfile, error: targetError } = await supabase
            .from('profiles').select('id').eq('full_name', student).maybeSingle();
          if (targetError) throw targetError;
          targetUserId = targetProfile?.id;
        }
        if (!targetUserId) return;
        const { data: bankRow, error } = await supabase
          .from('bank_accounts')
          .select('bank_name, bank_account_number, bank_account_holder')
          .eq('user_id', targetUserId)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled && bankRow) setBankInfo(bankRow);
      } catch (error) {
        console.error('Không tải được thông tin ngân hàng:', error);
        if (!cancelled) setNotice('Không tải được thông tin ngân hàng.');
      } finally {
        if (!cancelled) setBankLoading(false);
      }
    };
    loadBankInfo();
    return () => { cancelled = true; };
  }, [session, profile, student]);

  const saveBankInfo = async (e) => {
    e.preventDefault();
    if (!bankInfo.bank_name.trim() || !bankInfo.bank_account_number.trim() || !bankInfo.bank_account_holder.trim()) {
      setNotice('Vui lòng nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản.');
      return;
    }
    setBankSaving(true);
    setNotice('');
    try {
      let targetUserId = profile.id;
      if (profile.role === 'admin') {
        const { data: targetProfile, error: targetError } = await supabase
          .from('profiles').select('id').eq('full_name', student).maybeSingle();
        if (targetError) throw targetError;
        targetUserId = targetProfile?.id;
      }
      if (!targetUserId) throw new Error('Không tìm thấy tài khoản thành viên tương ứng.');
      const { error } = await supabase.from('bank_accounts').upsert({
        user_id: targetUserId,
        bank_name: bankInfo.bank_name.trim(),
        bank_account_number: bankInfo.bank_account_number.trim(),
        bank_account_holder: bankInfo.bank_account_holder.trim(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setNotice('Đã lưu thông tin tài khoản ngân hàng.');
    } catch (error) {
      console.error('Lưu thông tin ngân hàng thất bại:', error);
      setNotice('Lưu thông tin ngân hàng thất bại: ' + (error.message || 'Vui lòng thử lại.'));
    } finally {
      setBankSaving(false);
    }
  };

  
  // Thành viên đăng ký thời gian rảnh.
  const toggleAvail = async (day, shift) => {
    if (data.publishedMonths?.[day.slice(0, 7)]) {
      setNotice('Tháng này đã công bố lịch và khóa đăng ký.');
      return;
    }

    const isSelected = avail(data, day, shift).includes(student);

    const query = isSelected
      ? supabase
          .from('availability_entries')
            .delete()
            .eq('day', day)
            .eq('shift', shift)
            .eq('member', student)
      : supabase
          .from('availability_entries')
          .insert([{ day, shift, member: student }]);
    const { error } = await query;
    if (error) {
      console.error('Lỗi đăng ký thời gian rảnh:', error);
      setNotice('Lưu đăng ký thất bại. Vui lòng thử lại.');
      return;
    }
    setData((p) => {
      const n = structuredClone(p);
      n.availability ??= {};
      n.availability[day] ??= {};
      const a = n.availability[day][shift] || [];
      n.availability[day][shift] = isSelected
        ? a.filter((x) => x !== student)
        : [...a, student];

      return n;
    });
    setNotice('Đã lưu lựa chọn thời gian rảnh.');
  };
  // Thành viên bật/tắt báo bận.
  const toggleBusy = async (day, shift) => {
    const current = data.busy?.[day]?.[shift] || [];
    const isBusy = current.includes(student);
    const action = isBusy ? 'cancel' : 'busy';

    setData((p) => {
      const n = structuredClone(p);
      n.busy ??= {};
      n.busy[day] ??= {};

      const members = n.busy[day][shift] || [];
      n.busy[day][shift] = isBusy
        ? members.filter((name) => name !== student)
        : [...members, student];
      return n;
    });
    setNotice(isBusy ? 'Đã hủy báo bận.' : 'Đã cập nhật trạng thái báo bận.');
    try {
      const { error } = await supabase.functions.invoke('notify-busy', {
        body: {
          member: student,
          day,
          shift,
          action,
          recipients: data.notificationEmails || []
        }
      });
      if (error) {
        console.warn('Chưa gửi được email báo bận:', error.message);
      }
    } catch (error) {
      console.warn('Chức năng gửi email chưa được cấu hình:', error);
    }
  };
  const addNotificationEmail = () => {
    const email = emailDraft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if ((data.notificationEmails || []).includes(email)) {
      setNotice('Email này đã có trong danh sách.');
      return;
    }
    setData((p) => ({
      ...p,
      notificationEmails: [...(p.notificationEmails || []), email]
    }));
    setEmailDraft('');
    setNotice('Đã thêm email nhận thông báo.');
  };
  const removeNotificationEmail = (email) => {
    setData((p) => ({
      ...p,
      notificationEmails: (p.notificationEmails || []).filter(
        (item) => item !== email
      )
    }));
  };
  // Giáo viên thêm hoặc bỏ thành viên khỏi ca trực.
 const toggleAssign = (day, shift, name) => {
  const current = assigned(data, day, shift) || [];
  const isRemoving = current.includes(name);
  const remaining = isRemoving
    ? current.filter((x) => x !== name)
    : [...current, name];

  if (
    shift === 'Tối' &&
    isRemoving &&
    remaining.length > 0 &&
    !remaining.some((member) => MALE_STUDENTS.includes(member))
  ) {
    setNotice('Không thể bỏ bạn nam cuối cùng khỏi ca tối.');
    return;
  }

  if (
    shift === 'Tối' &&
    !isRemoving &&
    !MALE_STUDENTS.includes(name) &&
    !current.some((member) => MALE_STUDENTS.includes(member))
  ) {
    setNotice('Vui lòng phân công ít nhất một bạn nam vào ca tối trước.');
    return;
  }
  setData((p) => {
    const n = structuredClone(p);
    n.assignments[day] ??= {};
    n.assignments[day][shift] = remaining;
    n.publishedMonths ??= {};
    delete n.publishedMonths[day.slice(0, 7)];
    return n;
  });
  setNotice('Đã cập nhật phân công. Tháng này cần công bố lại.');
};
  // Đề xuất phân công tự động.
const suggest = () => {
  const n = structuredClone(data);
  const target = Math.max(1, Number(n.target) || 2);
  const MAX_TRIALS = 500;
  const FAIRNESS_LIMIT = 0.05;
  // Xóa phân công cũ của riêng tháng đang xem.
  days.forEach(day => {
    delete n.assignments[day];
  });
  // Đếm số ca rảnh thực tế của từng thành viên.
  // Ca đã báo bận sẽ không được tính là cơ hội phân công.
  const availabilityCounts = Object.fromEntries(
    STUDENTS.map(name => [name, 0])
  );
  const slots = [];
  days.forEach(day => {
    SHIFTS.forEach(shift => {
      const busyMembers = new Set(
        n.busy?.[day]?.[shift] || []
      );
      const candidates = [
        ...new Set(avail(n, day, shift) || [])
      ].filter(name =>
        STUDENTS.includes(name) &&
        !busyMembers.has(name)
      );
      candidates.forEach(name => {
        availabilityCounts[name]++;
      });
      const males = candidates.filter(name =>
        MALE_STUDENTS.includes(name)
      );
      const females = candidates.filter(name =>
        !MALE_STUDENTS.includes(name)
      );
      slots.push({
        day,
        shift,
        candidates,
        difficulty: shift === 'Tối'
          ? Math.min(males.length, females.length)
          : candidates.length
      });
    });
  });
  let best = null;
  // Chạy nhiều phương án với thứ tự xét ca khác nhau.
  for (let trial = 0; trial < MAX_TRIALS; trial++) {
    const trialAssignments = {};
    const assignedCounts = Object.fromEntries(
      STUDENTS.map(name => [name, 0])
    );
    const usedByDay = {};
    days.forEach(day => {
      trialAssignments[day] = {};
      usedByDay[day] = new Set();
    });
    // Xáo trộn nhẹ thứ tự các ca có độ khó gần nhau.
    const orderedSlots = [...slots].sort((a, b) =>
      (a.difficulty + Math.random() * 1.5) -
      (b.difficulty + Math.random() * 1.5)
    );
    // Chọn người có tỷ lệ phân công dự kiến thấp nhất.
    const chooseMember = pool => {
      const available = pool.filter(name =>
        assignedCounts[name] < availabilityCounts[name]
      );
      available.sort((a, b) => {
        const rateA =
          (assignedCounts[a] + 1) /
          Math.max(1, availabilityCounts[a]);
        const rateB =
          (assignedCounts[b] + 1) /
          Math.max(1, availabilityCounts[b]);
        return (
          rateA - rateB ||
          assignedCounts[a] - assignedCounts[b] ||
          Math.random() - 0.5
        );
      });
      return available[0] || null;
    };
    orderedSlots.forEach(({ day, shift, candidates }) => {
      const selected = [];
      const usedToday = usedByDay[day];
      if (shift === 'Tối') {
        // Ca tối bắt buộc có một nam và một nữ.
        const males = candidates.filter(name =>
          MALE_STUDENTS.includes(name) &&
          !usedToday.has(name)
        );
        const females = candidates.filter(name =>
          !MALE_STUDENTS.includes(name) &&
          !usedToday.has(name)
        );
        const male = chooseMember(males);
        const female = chooseMember(females);
        if (male && female) {
          selected.push(male, female);
          usedToday.add(male);
          usedToday.add(female);
          assignedCounts[male]++;
          assignedCounts[female]++;
        }
      } else {
        // Ca sáng và chiều: phân công tối đa số người mục tiêu.
        for (let seat = 0; seat < target; seat++) {
          const pool = candidates.filter(name =>
            !usedToday.has(name)
          );
          const chosen = chooseMember(pool);
          if (!chosen) break;
          selected.push(chosen);
          usedToday.add(chosen);
          assignedCounts[chosen]++;
        }
      }
      trialAssignments[day][shift] = selected;
    });
    // Tính tổng lượt phân công và tỷ lệ của từng người.
    const totalAssigned = Object.values(
      assignedCounts
    ).reduce((sum, value) => sum + value, 0);
    const rates = STUDENTS
      .filter(name => availabilityCounts[name] > 0)
      .map(name =>
        assignedCounts[name] / availabilityCounts[name]
      );
    const spread = rates.length > 1
      ? Math.max(...rates) - Math.min(...rates)
      : 0;
    const averageRate = rates.length
      ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
      : 0;
    const variance = rates.length
      ? rates.reduce(
          (sum, rate) =>
            sum + Math.pow(rate - averageRate, 2),
          0
        ) / rates.length
      : 0;
    // Ưu tiên số lượt phân công trước, công bằng sau.
    const isBetter =
      !best ||
      totalAssigned > best.totalAssigned ||
      (
        totalAssigned === best.totalAssigned &&
        spread < best.spread - 1e-10
      ) ||
      (
        totalAssigned === best.totalAssigned &&
        Math.abs(spread - best.spread) <= 1e-10 &&
        variance < best.variance
      );
    if (isBetter) {
      best = {
        assignments: trialAssignments,
        assignedCounts: { ...assignedCounts },
        totalAssigned,
        spread,
        variance
      };
    }
  }
  // Ghi nhận phương án tốt nhất tìm được.
  days.forEach(day => {
    n.assignments[day] = best.assignments[day];
  });
  // Tính số vị trí còn thiếu.
  let unfilled = 0;
  slots.forEach(({ day, shift }) => {
    const required = shift === 'Tối' ? 2 : target;
    const actual =
      n.assignments?.[day]?.[shift]?.length || 0;

    unfilled += Math.max(0, required - actual);
  });
  // Tìm ca tối không đủ nguồn nam hoặc nữ.
  const missingNightDays = slots
    .filter(slot => {
      if (slot.shift !== 'Tối') return false;
      const males = slot.candidates.filter(name =>
        MALE_STUDENTS.includes(name)
      );
      const females = slot.candidates.filter(name =>
        !MALE_STUDENTS.includes(name)
      );
      return !males.length || !females.length;
    })
    .map(slot => slot.day);
  // Hủy trạng thái công bố của tháng hiện tại.
  n.publishedMonths ??= {};
  delete n.publishedMonths[month];
  setData(n);
  const spreadPercent = best.spread * 100;
  const achieved = best.spread <= FAIRNESS_LIMIT + 1e-10;
  setNotice(
    `Đã đề xuất lịch sau ${MAX_TRIALS} lượt tìm kiếm. ` +
    `Tổng cộng ${best.totalAssigned} lượt phân công. ` +
    `Chênh lệch tỷ lệ cao nhất và thấp nhất: ${spreadPercent.toFixed(2)} điểm phần trăm.` +
    (
      achieved
        ? ' Đạt giới hạn 5 điểm phần trăm.'
        : ' Chưa tìm được phương án đạt 5 điểm phần trăm; hệ thống đã chọn phương án có chênh lệch thấp nhất trong các phương án có số lượt phân công cao nhất tìm được.'
    ) +
    (
      unfilled > 0
        ? ` Còn ${unfilled} vị trí chưa được phân công.`
        : ' Tất cả vị trí đều đã được phân công.'
    ) +
    (
      missingNightDays.length > 0
        ? ` Các ca tối thiếu nguồn nam hoặc nữ: ${missingNightDays.map(day => day.split('-').reverse().join('/')).join(', ')}.`
        : ''
    )
  );
};
  // Xuất file Excel.
  const exportExcel = async () => {
    setExportLoading(true);
    let bankByName = {};
    try {
      const [{ data: profilesData, error: profilesError }, { data: bankData, error: bankError }] = await Promise.all([
        supabase.from('profiles').select('id, full_name'),
        supabase.from('bank_accounts').select('user_id, bank_name, bank_account_number, bank_account_holder')
      ]);
      if (profilesError) throw profilesError;
      if (bankError) throw bankError;
      const nameById = Object.fromEntries((profilesData || []).map(p => [p.id, p.full_name]));
      (bankData || []).forEach(row => {
        const fullName = nameById[row.user_id];
        if (fullName) bankByName[fullName] = row;
      });
    } catch (error) {
      console.error('Không thể tải thông tin ngân hàng để xuất Excel:', error);
      setNotice('Không tải được dữ liệu ngân hàng. Excel chưa được xuất; vui lòng thử lại.');
      setExportLoading(false);
      return;
    }
    const workbook = XLSX.utils.book_new();
    const assignmentRows = [['Ngày', 'Ca', 'Thành viên được phân công']];
    const attendanceRows = [['Ngày', 'Ca', 'Thành viên', 'Trạng thái']];
    const memberStats = {};

    STUDENTS.forEach((name) => {
      memberStats[name] = {
        registered: 0,
        assigned: 0,
        present: 0,
        absent: 0,
        unchecked: 0
      };
    });

    days.forEach((d) => {
      SHIFTS.forEach((s) => {
        const available = avail(data, d, s);
        const assignedMembers = assigned(data, d, s);

        available.forEach((name) => {
          if (memberStats[name]) memberStats[name].registered++;
        });

        assignedMembers.forEach((name) => {
          assignmentRows.push([d, s, name]);

          if (memberStats[name]) memberStats[name].assigned++;

          const status = data.attendance?.[d]?.[s]?.[name] || 'Chưa điểm danh';
          attendanceRows.push([d, s, name, status]);

          if (memberStats[name]) {
            if (status === 'Có mặt') memberStats[name].present++;
            else if (status === 'Vắng mặt') memberStats[name].absent++;
            else memberStats[name].unchecked++;
          }
        });
      });
    });

    const paymentRows = [[
      'Thành viên',
      'Số ca đăng ký',
      'Số ca được phân công',
      'Có mặt',
      'Vắng mặt',
      'Chưa điểm danh',
      'Số ca được thanh toán',
      'Tiền phụ cấp (VNĐ)',
      'Ngân hàng',
      'Số tài khoản',
      'Tên chủ tài khoản'
    ]];

    STUDENTS.forEach((name) => {
      const s = memberStats[name];
      const paidShifts = s.present;

      paymentRows.push([
        name,
        s.registered,
        s.assigned,
        s.present,
        s.absent,
        s.unchecked,
        paidShifts,
        paidShifts * 50000,
        bankByName[name]?.bank_name || '',
        bankByName[name]?.bank_account_number || '',
        bankByName[name]?.bank_account_holder || ''
      ]);
    });

    const sheets = [
      ['Phan cong', assignmentRows],
      ['Diem danh', attendanceRows],
      ['Tong hop thanh toan', paymentRows]
    ];

    sheets.forEach(([name, rows]) => {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      const headerRange = XLSX.utils.decode_range(sheet['!ref']);

      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = sheet[cellAddress];

        if (cell) {
          cell.s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { fgColor: { rgb: '005F69' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true
            }
          };
        }
      }

      for (let row = 1; row <= headerRange.e.r; row++) {
        for (let col = 0; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];

          if (cell) {
            cell.s = {
              alignment: {
                vertical: 'center',
                horizontal: col === 0 ? 'left' : 'center'
              }
            };
          }
        }
      }

      sheet['!cols'] = rows[0].map((header, col) => {
        const maxLength = Math.max(
          String(header).length,
          ...rows.slice(1).map((row) => String(row[col] ?? '').length)
        );

        return { wch: Math.min(Math.max(maxLength + 4, 14), 35) };
      });

      sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      sheet['!autofilter'] = { ref: sheet['!ref'] };

      XLSX.utils.book_append_sheet(workbook, sheet, name);
    });

    XLSX.writeFile(workbook, `UEH-tong-hop-lich-truc-${month}.xlsx`);
    setExportLoading(false);
  };

  // Danh sách ca trực của thành viên.
  const myAssignments = days.flatMap((d) =>
    SHIFTS.filter((s) => assigned(data, d, s).includes(student))
      .map((s) => ({ day: d, shift: s }))
  );

  // Thống kê tổng lượt đăng ký và phân công.
  const totalAvail = days.reduce(
    (n, d) => n + SHIFTS.reduce((x, s) => x + avail(data, d, s).length, 0),
    0
  );

  const totalAssigned = days.reduce(
    (n, d) => n + SHIFTS.reduce((x, s) => x + assigned(data, d, s).length, 0),
    0
  );

  // Công bố lịch tháng hiện tại.
  const publishMonth = () => {
    setData((p) => ({
      ...p,
      publishedMonths: {
        ...p.publishedMonths,
        [month]: true
      }
    }));

    setNotice('Đã công bố lịch trực chính thức.');
  };

  // Hủy công bố tháng hiện tại.
  const unpublishMonth = () => {
    setData((p) => {
      const publishedMonths = { ...p.publishedMonths };
      delete publishedMonths[month];
      return { ...p, publishedMonths };
    });

    setNotice('Đã hủy công bố. Giáo viên có thể điều chỉnh lịch.');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial'
      }}>
        Đang tải dữ liệu từ máy chủ...
      </div>
    );
  }

if (!session || !profile) {
  return (
    <>
      <style>{`
        .login-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  padding: 40px 5vw;
  box-sizing: border-box;
  background: #f3f5f9;
  font-family: Arial, sans-serif;
}

        .login-cover {
  width: 45%;
  min-height: 0;
  overflow: hidden;
}

        .login-cover img {
  width: 100%;
  height: auto;
  min-height: 0;
  object-fit: contain;
  display: block;
}
        .login-panel {
  width: 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}
        .login-form {
          width: 100%;
          max-width: 420px;
          background: white;
          padding: 36px;
          border-radius: 18px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          box-sizing: border-box;
        }

        @media (max-width: 700px) {
          .login-layout {
            flex-direction: column;
          }

          .login-cover {
            width: 100%;
            min-height: 230px;
            height: 230px;
          }

          .login-cover img {
            min-height: 230px;
            height: 230px;
          }

          .login-panel {
            width: 100%;
            padding: 24px 16px;
          }

          .login-form {
            padding: 26px;
          }
        }
      `}</style>

      <div className="login-layout">
        <div className="login-cover">
          <img src={loginCover} alt="UEH Green Living Hub" />
        </div>

        <div className="login-panel">
          <form className="login-form" onSubmit={handleLogin}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img
                src={uehLogo}
                alt="UEH Logo"
                style={{ width: 75, height: 75, objectFit: 'contain' }}
              />
              <h2>ĐỘI TỰ QUẢN UEH</h2>
              <p>Đăng nhập hệ thống lịch trực</p>
            </div>

            <label style={{ display: 'block', marginBottom: 8 }}>
              Tên đăng nhập
            </label>

            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 16,
                boxSizing: 'border-box',
                border: '1px solid #ccc',
                borderRadius: 8
              }}
            />

            <label style={{ display: 'block', marginBottom: 8 }}>
              Mật khẩu
            </label>

            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 16,
                boxSizing: 'border-box',
                border: '1px solid #ccc',
                borderRadius: 8
              }}
            />

            {notice && (
              <p style={{ color: '#c0392b', fontSize: 14 }}>
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 8,
                background: '#0756a5',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {authLoading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <img
            src={uehLogo}
            alt="UEH Logo"
            style={{ width: 45, height: 45, objectFit: 'contain' }}
          />
          <div>
            <b>ĐỘI TỰ QUẢN UEH</b>
            <small>Lịch trực</small>
          </div>
        </div>

        <p className="side-label">KHÔNG GIAN LÀM VIỆC</p>

        <button
          className={role === 'student' ? 'nav active' : 'nav'}
          onClick={() => setRole('student')}
        >
          <UserRound />
          Thành viên
        </button>

        {profile?.role === 'admin' && (
  <button
    className={role === 'admin' ? 'nav active' : 'nav'}
    onClick={() => setRole('admin')}
  >
    <ClipboardList />
    Thầy cô
  </button>
)}
        <div className="side-note">
          <ShieldCheck />
          <span>
            <b>Test</b>
            <small>Dữ liệu dùng chung trên máy chủ.</small>
          </span>
        </div>
        <button
  type="button"
  className="nav password-button"
  onClick={() => {
    setShowPasswordForm(!showPasswordForm);
    setNotice('');
  }}
  style={{
    width: '100%',
    boxSizing: 'border-box',
    marginTop: '12px',
    marginBottom: '10px',
    padding: '13px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#087d89',
    color: '#ffffff',
    border: '1px solid #36c5d0',
    borderRadius: '12px',
    boxShadow: '0 5px 12px rgba(0,0,0,0.25)',
    fontWeight: '700',
    cursor: 'pointer'
  }}
>
  <ShieldCheck />
  Đổi mật khẩu
</button>
{showPasswordForm && (
  <form
    onSubmit={handleChangePassword}
    style={{
      padding: '12px',
      margin: '8px 0',
      background: '#f5f7fa',
      borderRadius: '10px'
    }}
  >
    <p style={{ fontWeight: '600', marginBottom: '10px' }}>
      Đổi mật khẩu
    </p>
    <input
      type="password"
      placeholder="Mật khẩu mới"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      required
      style={{ width: '100%', padding: '9px', marginBottom: '8px' }}
    />
    <input
      type="password"
      placeholder="Nhập lại mật khẩu mới"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      required
      style={{ width: '100%', padding: '9px', marginBottom: '8px' }}
    />
    <button type="submit" disabled={passwordLoading}>
      {passwordLoading ? 'Đang đổi...' : 'Xác nhận đổi mật khẩu'}
    </button>
    <button
      type="button"
      onClick={() => {
        setShowPasswordForm(false);
        setNewPassword('');
        setConfirmPassword('');
        setNotice('');
      }}
      style={{ marginLeft: '6px' }}
    >
      Hủy
    </button>
    {notice && (
      <p style={{ fontSize: '12px', marginTop: '8px' }}>
        {notice}
      </p>
    )}
  </form>
)}
<button
  type="button"
  className="nav logout-button"
  onClick={handleLogout}
>
  <LogOut />
  Đăng xuất
</button>
      </aside>
      <main className={busyMode && role === 'student' ? 'busy-mode' : ''}>
        <header>
          <div>
            <small>HỆ THỐNG QUẢN LÝ LỊCH TRỰC</small>
            <h1>
              {role === 'student'
                ? (busyMode ? 'Đăng ký báo bận' : 'Đăng ký thời gian rảnh')
                : 'Tổng quan phân công'}
            </h1>
          </div>
          <span className={isPublished ? 'pill done' : 'pill'}>
            {isPublished ? 'Đã công bố' : 'Đang nhận đăng ký'}
          </span>
        </header>
        {notice && (
          <div className="notice">
            <CheckCircle2 />
            {notice}
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}
        <section className="monthbar">
          <div>
            <h2>{label(month)}</h2>
            <p>
              {role === 'student'
                ? (busyMode
                  ? 'Chọn những ngày và ca bạn không thể tham gia trực.'
                  : 'Chọn những ngày và ca bạn có thể tham gia trực.')
                : 'Tổng hợp thời gian rảnh và phân công thành viên.'}
            </p>
          </div>
          <div className="monthnav">
            <button onClick={() => changeMonth(-1)}>
              <ChevronLeft />
            </button>
            {label(month)}
            <button onClick={() => changeMonth(1)}>
              <ChevronRight />
            </button>
          </div>
        </section>
        {!(busyMode && role === 'student') && (
          <div className="stats">
            <Stat
              icon={<CalendarDays />}
              title="Ngày trong tháng"
              value={days.length}
            />
            <Stat
              icon={<Users />}
              title="Lượt đăng ký rảnh"
              value={totalAvail}
            />
            <Stat
              icon={<CheckCircle2 />}
              title="Lượt phân công"
              value={totalAssigned}
            />
          </div>
        )}
        {role === 'student' ? (
          <>
            <section className="panel identity">
              <div className="identity-select">
                <label>Họ và Tên</label>
                <select
  value={student}
  disabled={profile?.role !== 'admin'}
  onChange={(e) => setStudent(e.target.value)}
>
  {profile?.role === 'admin' ? (
    STUDENTS.map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    ))
  ) : (
    <option value={profile?.full_name || student}>
      {profile?.full_name || student}
    </option>
  )}
</select>
              </div>
              <button
                type="button"
                className={`busy-toggle ${busyMode ? 'active' : ''}`}
                onClick={() => setBusyMode((v) => !v)}
              >
                {busyMode ? 'Thoát báo bận' : 'Báo bận'}
              </button>
              {!busyMode && (
                <p>
                  <i className="green-dot" /> Đã chọn rảnh
                  <i className="purple-dot" /> Được phân công
                </p>
              )}
            </section>
            <section className="panel bank-account-panel">
              <div className="panel-title">
                <div>
                  <h3>Thông tin tài khoản ngân hàng</h3>
                  <p>Thông tin này dùng để tổng hợp thanh toán phụ cấp, chỉ thành viên và quản trị viên được truy cập.</p>
                </div>
                <span className="tag">THANH TOÁN</span>
              </div>
              {bankLoading ? (
                <p className="empty">Đang tải thông tin ngân hàng...</p>
              ) : (
                <form onSubmit={saveBankInfo} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6 }}>Ngân hàng</label>
                    <input value={bankInfo.bank_name} onChange={(e) => setBankInfo(p => ({ ...p, bank_name: e.target.value }))} placeholder="VD: Vietcombank" required style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6 }}>Số tài khoản</label>
                    <input value={bankInfo.bank_account_number} onChange={(e) => setBankInfo(p => ({ ...p, bank_account_number: e.target.value }))} placeholder="Nhập số tài khoản" inputMode="numeric" required style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6 }}>Tên chủ tài khoản</label>
                    <input value={bankInfo.bank_account_holder} onChange={(e) => setBankInfo(p => ({ ...p, bank_account_holder: e.target.value }))} placeholder="Tên trên tài khoản" required style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'end' }}>
                    <button className="primary" type="submit" disabled={bankSaving} style={{ width: '100%' }}>
                      {bankSaving ? 'Đang lưu...' : 'Lưu thông tin ngân hàng'}
                    </button>
                  </div>
                </form>
              )}
            </section>
            <section className="panel official-calendar">
              <div className="panel-title">
                <div>
                  <h3>
                    <CalendarDays />
                    {busyMode ? 'Lịch trực chính thức' : 'Lịch đăng ký theo tháng'}
                  </h3>
                  <p>
                    {busyMode
                      ? 'Chọn các ca bạn đang bận để thông báo cho thầy cô.'
                      : 'Nhấn vào ca để đánh dấu thời gian bạn có thể tham gia trực.'}
                  </p>
                </div>
                <span className="tag">SÁNG · CHIỀU · TỐI</span>
              </div>
              {isPublished && (
                <div className="warning">
                  Tháng này đã công bố lịch. Bạn vẫn có thể cập nhật trạng thái báo bận.
                </div>
              )}
              <div className="calendar">
                {days.map((d) => {
                  const date = new Date(d + 'T00:00:00');
                  return (
                    <div className="day" key={d}>
                      <div className="dayhead">
                        <b>{Number(d.slice(-2))}</b>
                        <small>
                          {date.toLocaleDateString('vi-VN', {
                            weekday: 'short'
                          })}
                        </small>
                      </div>
                      {SHIFTS
                     .filter((sh) => {
                      const isWeekend =
                      date.getDay() === 0 || date.getDay() === 6;
                      return !isWeekend || sh === 'Tối';
                      })
                       .map((sh) => {
                        const on = avail(data, d, sh).includes(student);
                        const as = assigned(data, d, sh).includes(student);
                        const busy = (data.busy?.[d]?.[sh] || []).includes(student);
                        return (
                          <button
                            type="button"
                            key={sh}
                            disabled={isPublished && !busyMode}
                            onClick={() =>
                              busyMode
                                ? toggleBusy(d, sh)
                                : toggleAvail(d, sh)
                            }
                            className={`shift ${busy ? 'busy' : ''} ${on ? 'on' : ''} ${as ? 'as' : ''}`}
                          >
                            {sh}{busy ? ' · Bận' : ''}
                            {busy
                              ? <span>!</span>
                              : on
                                ? <CheckCircle2 />
                                : <span className="circle" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {!busyMode && (
                <div className="footnote">
                  Đã chọn{' '}
                  <b>
                    {days.reduce(
                      (n, d) => n + SHIFTS.filter(
                        (s) => avail(data, d, s).includes(student)
                      ).length,
                      0
                    )}
                  </b>
                  {' '}khung giờ · Dữ liệu tự lưu trên máy chủ
                </div>
              )}
            </section>
            {!busyMode && (
              <section className="panel assigned-calendar">
                <div className="panel-title">
                  <div>
                    <h3><CalendarCheck /> Lịch trực chính thức của tôi</h3>
                    <p>Các ca được thầy cô phân công.</p>
                  </div>
                </div>
                {myAssignments.length ? (
                  myAssignments.map((x) => (
                    <div className="assign-row" key={x.day + x.shift}>
                      <b>{fmt(x.day)}</b>
                      <span>Ca {x.shift}</span>
                      <em>Đã phân công</em>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    Chưa có ca trực chính thức trong tháng này.
                  </div>
                )}
              </section>
            )}
          </>
        ) : (          <>
            <section className="admin-head">
              <div>
                <h2>Quản lý đăng ký & phân công</h2>
                <p>Hệ thống đề xuất; thầy cô kiểm tra và quyết định cuối cùng.</p>
              </div>
              <div>
                <button className="secondary" onClick={exportExcel} disabled={exportLoading}>
                  <Download />
                  {exportLoading ? 'Đang xuất...' : 'Xuất Files'}
                </button>
                <button className="primary" onClick={suggest}>
                  <Sparkles />
                  Đề xuất phân công
                </button>
              </div>
            </section>
            <section className="panel setting">
              <div>
                <b>Số thành viên mục tiêu mỗi ca</b>
                <small>Áp dụng cho đề xuất tự động.</small>
              </div>
              <select
                value={data.target}
                onChange={(e) => {
                  const publishedMonths = { ...data.publishedMonths };
                  delete publishedMonths[month];
                  setData((p) => ({
                    ...p,
                    target: Number(e.target.value),
                    publishedMonths
                  }));
                  setNotice(
                    'Đã thay đổi số thành viên mục tiêu. Tháng này cần kiểm tra và công bố lại.'
                  );
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option value={n} key={n}>
                    {n} Thành viên / ca
                  </option>
                ))}
              </select>
            </section>
            <AdminDays
              days={days}
              data={data}
              toggleAssign={toggleAssign}
            />
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h3><CalendarCheck /> Các ca đang có người báo bận</h3>
                  <p>Danh sách tổng hợp theo tháng đang xem.</p>
                </div>
              </div>
              {days.some((d) =>
                SHIFTS.some((sh) => (data.busy?.[d]?.[sh] || []).length)
              ) ? (
                days.map((d) =>
                  SHIFTS
                    .filter((sh) => (data.busy?.[d]?.[sh] || []).length)
                    .map((sh) => (
                      <div className="assign-row" key={d + sh}>
                        <b>{fmt(d)}</b>
                        <span>Ca {sh}</span>
                        <em>
                          {(data.busy?.[d]?.[sh] || []).join(', ')}
                        </em>
                      </div>
                    ))
                )
              ) : (
                <p className="empty">
                  Chưa có thành viên báo bận trong tháng này.
                </p>
              )}
            </section>
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h3><Send /> Gmail nhận thông báo</h3>
                  <p>Thêm, sửa hoặc xóa địa chỉ nhận email báo bận.</p>
                </div>
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="Nhập địa chỉ Gmail"
                  style={{ flex: '1 1 240px', minWidth: 0 }}
                />
                <button className="primary" onClick={addNotificationEmail}>
                  Thêm Gmail
                </button>
              </div>
              {(data.notificationEmails || []).length ? (
                (data.notificationEmails || []).map((email) => (
                  <div className="assign-row" key={email}>
                    <b>{email}</b>
                    <span style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      gap: 8
                    }}>
                      <button
                        className="secondary"
                        onClick={() => {
                          const next = window.prompt(
                            'Sửa địa chỉ Gmail:',
                            email
                          );
                          if (next === null) return;
                          const value = next.trim().toLowerCase();
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                            setNotice('Địa chỉ email không hợp lệ.');
                            return;
                          }
                          setData((p) => ({
                            ...p,
                            notificationEmails: [
                              ...new Set(
                                (p.notificationEmails || []).map(
                                  (x) => x === email ? value : x
                                )
                              )
                            ]
                          }));
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className="secondary"
                        onClick={() => removeNotificationEmail(email)}
                      >
                        Xóa
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty">Chưa có Gmail nhận thông báo.</p>
              )}
            </section>
            <Attendance
              days={days}
              data={data}
              setData={setData}
            />
            <StudentStats days={days} data={data} />
            <section className="panel publish">
              <div>
                <h3><ShieldCheck /> Công bố lịch trực</h3>
                <p>
                  {isPublished
                    ? 'Lịch tháng này đã được công bố.'
                    : 'Kiểm tra phân công trước khi công bố cho thành viên.'}
                </p>
              </div>
              <div>
                {isPublished && (
                  <button
                    className="secondary"
                    onClick={unpublishMonth}
                  >
                    Hủy công bố lịch
                  </button>
                )}
                <button
                  className="primary"
                  onClick={publishMonth}
                  disabled={isPublished}
                >
                  <Send />
                  {isPublished ? 'Đã công bố' : 'Duyệt & công bố lịch'}
                </button>
              </div>
            </section>
          </>
        )}
        <footer>
          ĐỘI TỰ QUẢN UEH · Đăng ký thời gian rảnh và phân công
        </footer>
      </main>
    </div>
  );
}
function Stat({ icon, title, value }) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <div>
        <small>{title}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}
function AdminDays({ days, data, toggleAssign }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [day, setDay] = useState(
    () => days.includes(today) ? today : days[0]
  );
  const selectedDayRef = useRef(null);
  useEffect(() => {
    setDay(days.includes(today) ? today : days[0]);
  }, [days, today]);
  useEffect(() => {
    selectedDayRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [day, days]);
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3><Users /> Tổng hợp theo ngày và ca</h3>
          <p>Chọn ngày, sau đó thêm/bỏ thành viên trong danh sách phân công.</p>
        </div>
      </div>
      <div className="day-picker">
        {days.map((d) => (
          <button
            ref={day === d ? selectedDayRef : null}
            className={day === d ? 'chosen' : ''}
            onClick={() => setDay(d)}
            key={d}
          >
            {Number(d.slice(-2))}
          </button>
        ))}
      </div>
      <div className="shift-admin">
        {SHIFTS.map((sh) => {
          const a = avail(data, day, sh);
          const picked = assigned(data, day, sh);
          return (
            <div className="shiftbox" key={sh}>
              <div className="shiftbox-title">
                <b>Ca {sh}</b>
                <span>{picked.length}/{data.target} được phân công</span>
              </div>
              <small className="subhead">
                Thành viên ĐĂNG KÝ RẢNH
              </small>
              {a.length ? (
                a.map((name) => (
                  <button
                    className={
                      picked.includes(name)
                        ? 'person selected'
                        : 'person'
                    }
                    onClick={() => toggleAssign(day, sh, name)}
                    key={name}
                  >
                    {name}
                    <b>{picked.includes(name) ? '✓' : '+'}</b>
                  </button>
                ))
              ) : (
                <p className="empty">Chưa có thành viên đăng ký.</p>
              )}
              <small className="subhead">ĐÃ PHÂN CÔNG</small>
              <div className="tags">
                {picked.length ? (
                  picked.map((n) => (
                    <span key={n}>
                      {n}
                      <button onClick={() => toggleAssign(day, sh, n)}>
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <i>Chưa phân công</i>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function StudentStats({ days, data }) {
  const stats = STUDENTS.map((name) => {
    let assignedCount = 0;
    let availableShifts = 0;
    let availableDays = 0;
    days.forEach((day) => {
      let hasAvailability = false;
      SHIFTS.forEach((shift) => {
        const availableStudents = data.availability?.[day]?.[shift] || [];
        const assignedStudents = data.assignments?.[day]?.[shift] || [];
        if (availableStudents.includes(name)) {
          availableShifts += 1;
          hasAvailability = true;
        }
        if (assignedStudents.includes(name)) {
          assignedCount += 1;
        }
      });
      if (hasAvailability) availableDays += 1;
    });
    const percent = availableShifts > 0
      ? (assignedCount / availableShifts) * 100
      : 0;
    return {
      name,
      assignedCount,
      availableShifts,
      availableDays,
      percent
    };
  });
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-title">
        <div>
          <h3>Thống kê phân công thành viên</h3>
          <p>
            Số ca được phân công so với số ca đã đăng ký rảnh trong tháng.
          </p>
        </div>
        <span className="tag">THỐNG KÊ</span>
      </div>
      <div style={{
        width: '100%',
        maxHeight: 230,
        overflowY: 'auto',
        overflowX: 'hidden',
        border: '1px solid #e5e7eb',
        borderRadius: 10
      }}>
        <table style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          fontSize: 14
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            background: '#f8fafc'
          }}>
            <tr>
              <th style={{ width: '27%', padding: 10, textAlign: 'left' }}>
                Thành viên
              </th>
              <th style={{ width: '15%', padding: 10, textAlign: 'left' }}>
                Được phân công
              </th>
              <th style={{ width: '16%', padding: 10, textAlign: 'left' }}>
                Buổi đăng ký rảnh
              </th>
              <th style={{ width: '17%', padding: 10, textAlign: 'left' }}>
                Ngày có buổi rảnh
              </th>
              <th style={{ width: '15%', padding: 10, textAlign: 'left' }}>
                Tỷ lệ phân công
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((student) => (
              <tr
                key={student.name}
                style={{ borderTop: '1px solid #e5e7eb' }}
              >
                <td style={{
                  padding: 10,
                  fontWeight: 600,
                  overflowWrap: 'anywhere'
                }}>
                  {student.name}
                </td>
                <td style={{ padding: 10 }}>{student.assignedCount}</td>
                <td style={{ padding: 10 }}>{student.availableShifts}</td>
                <td style={{ padding: 10 }}>{student.availableDays}</td>
                <td style={{ padding: 10, fontWeight: 600 }}>
                  {student.percent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Attendance({ days, data, setData }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDay, setSelectedDay] = useState(
    () => days.includes(today) ? today : (days[0] || '')
  );
  const [selectedShift, setSelectedShift] = useState('Sáng');
  useEffect(() => {
    if (days.length) {
      setSelectedDay(days.includes(today) ? today : days[0]);
    } else {
      setSelectedDay('');
    }
  }, [days, today]);
  const students =
    data.assignments?.[selectedDay]?.[selectedShift] || [];
  const statuses = ['Có mặt', 'Vắng mặt'];
  const updateAttendance = (name, status) => {
    setData((previous) => {
      const next = structuredClone(previous);
      next.attendance ??= {};
      next.attendance[selectedDay] ??= {};
      next.attendance[selectedDay][selectedShift] ??= {};
      if (status) {
        next.attendance[selectedDay][selectedShift][name] = status;
      } else {
        delete next.attendance[selectedDay][selectedShift][name];
      }
      return next;
    });
  };
  const stats = STUDENTS.map((name) => {
    let assignedCount = 0;
    let present = 0;
    let absent = 0;
    days.forEach((day) => {
      SHIFTS.forEach((shift) => {
        const roster = data.assignments?.[day]?.[shift] || [];
        if (roster.includes(name)) {
          assignedCount += 1;
          const status = data.attendance?.[day]?.[shift]?.[name];
          if (status === 'Có mặt') present += 1;
          if (status === 'Vắng mặt') absent += 1;
        }
      });
    });
    const rate = assignedCount
      ? (present / assignedCount) * 100
      : 0;
    return { name, assignedCount, present, absent, rate };
  });
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-title">
        <div>
          <h3><ClipboardList /> Điểm danh thành viên</h3>
          <p>Chọn ngày và ca trực để ghi nhận tình trạng tham gia.</p>
        </div>
        <span className="tag">ĐIỂM DANH</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Chọn ngày trực
        </label>
        <select
          value={selectedDay}
          onChange={(event) => setSelectedDay(event.target.value)}
          disabled={!days.length}
          style={{
            padding: 10,
            borderRadius: 8,
            width: '100%'
          }}
        >
          {days.map((day) => (
            <option key={day} value={day}>
              {fmt(day)}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Chọn ca trực
        </label>
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap'
        }}>
          {SHIFTS.map((shift) => (
            <button
              type="button"
              key={shift}
              onClick={() => setSelectedShift(shift)}
              className={
                selectedShift === shift ? 'primary' : 'secondary'
              }
            >
              {shift}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4>Danh sách ca {selectedShift}</h4>
        {students.length ? (
          students.map((name) => (
            <div
              key={name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #e5e7eb',
                flexWrap: 'wrap'
              }}
            >
              <b>{name}</b>
              <select
                value={
                  data.attendance?.[selectedDay]?.[selectedShift]?.[name] || ''
                }
                onChange={(event) =>
                  updateAttendance(name, event.target.value)
                }
                style={{
                  padding: 9,
                  borderRadius: 8,
                  minWidth: 160
                }}
              >
                <option value="">Chưa điểm danh</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          ))
        ) : (
          <div className="empty">
            Chưa có thành viên được phân công trong ca này.
          </div>
        )}
      </div>
      <div style={{
        marginTop: 28,
        padding: 18,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 12
      }}>
        <h3 style={{ margin: '0 0 14px' }}>Điểm danh tháng</h3>
        <div style={{
          width: '100%',
          maxHeight: 300,
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '1px solid #e5e7eb',
          borderRadius: 10
        }}>
          <table style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontSize: 14
          }}>
            <thead style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: '#f8fafc'
            }}>
              <tr>
                <th style={{ width: '30%', padding: 10, textAlign: 'left' }}>
                  Thành viên
                </th>
                <th style={{ width: '17%', padding: 10, textAlign: 'left' }}>
                  Được phân công
                </th>
                <th style={{ width: '15%', padding: 10, textAlign: 'left' }}>
                  Có mặt
                </th>
                <th style={{ width: '15%', padding: 10, textAlign: 'left' }}>
                  Vắng mặt
                </th>
                <th style={{ width: '23%', padding: 10, textAlign: 'left' }}>
                  Tỷ lệ tham gia
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((item) => (
                <tr
                  key={item.name}
                  style={{ borderTop: '1px solid #e5e7eb' }}
                >
                  <td style={{
                    padding: 10,
                    fontWeight: 600,
                    overflowWrap: 'anywhere'
                  }}>
                    {item.name}
                  </td>
                  <td style={{ padding: 10 }}>{item.assignedCount}</td>
                  <td style={{ padding: 10 }}>{item.present}</td>
                  <td style={{ padding: 10 }}>{item.absent}</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>
                    {item.rate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}