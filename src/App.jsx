import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CalendarDays,
  Users,
  ClipboardList,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  ShieldCheck,
  UserRound,
  CalendarCheck,
  Send
} from 'lucide-react';
import uehLogo from './images/UEH.jpg';
const SHIFTS = ['Sáng', 'Chiều', 'Tối'];
const STUDENTS = [
  'Nguyễn Hải Hào',
  'Trần Khánh Hưng',
  'Lê Thanh Đào'
];
const KEY = 'uehsvtq-demo';
const initial = {
  availability: {},
  assignments: {},
  publishedMonths: {},
  attendance: {},
  target: 2
};
const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      ...initial,
      ...saved,
      publishedMonths: saved.publishedMonths || {},
      attendance: saved.attendance || {}
    };
  } catch {
    return initial;
  }
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
  const [data, setData] = useState(load);
  const [role, setRole] = useState('student');
  const [student, setStudent] = useState(STUDENTS[0]);
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [notice, setNotice] = useState('');
  const days = useMemo(() => monthDays(month), [month]);
  const isPublished = !!data.publishedMonths?.[month];
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);
// Chuyển tháng
  const changeMonth = (n) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };
// Thành viên đăng ký thời gian rảnh
  const toggleAvail = (day, shift) => {
    if (data.publishedMonths?.[day.slice(0, 7)]) {
      setNotice('Tháng này đã công bố lịch và khóa đăng ký.');
      return;
    }
    setData((p) => {
      const n = structuredClone(p);
      n.availability[day] ??= {};
      const a = n.availability[day][shift] || [];
      n.availability[day][shift] = a.includes(student)
        ? a.filter((x) => x !== student)
        : [...a, student];
      return n;
    });
    setNotice('Đã lưu lựa chọn thời gian rảnh.');
  };
// Giáo viên thêm hoặc bỏ Thành viên khỏi ca trực
  const toggleAssign = (day, shift, name) => {
    setData((p) => {
      const n = structuredClone(p);
      n.assignments[day] ??= {};
      const a = n.assignments[day][shift] || [];
      n.assignments[day][shift] = a.includes(name)
        ? a.filter((x) => x !== name)
        : [...a, name];
// Chỉ mở khóa tháng đang chỉnh sửa
      n.publishedMonths ??= {};
      delete n.publishedMonths[day.slice(0, 7)];
      return n;
    });
    setNotice('Đã cập nhật phân công. Tháng này cần công bố lại.');
  };
// Đề xuất phân công tự động
  const suggest = () => {
    const n = structuredClone(data);
    const counts = Object.fromEntries(
      STUDENTS.map((s) => [s, 0])
    );
// Đếm số ca đã được phân công
    Object.values(n.assignments).forEach((x) => {
      SHIFTS.forEach((sh) => {
        (x?.[sh] || []).forEach((s) => {
          counts[s] = (counts[s] || 0) + 1;
        });
      });
    });
// Phân công cho tháng đang chọn
    days.forEach((day) => {
      n.assignments[day] ??= {};
      SHIFTS.forEach((sh) => {
        const old = n.assignments[day][sh] || [];
        const candidates = avail(n, day, sh)
          .filter((s) => !old.includes(s))
          .sort(
            (a, b) => (counts[a] || 0) - (counts[b] || 0)
          );
        const add = candidates.slice(
          0,
          Math.max(0, n.target - old.length)
        );
        n.assignments[day][sh] = [...old, ...add];
        add.forEach((s) => {
          counts[s] = (counts[s] || 0) + 1;
        });
      });
    });
// Mở khóa đúng tháng đang đề xuất
    n.publishedMonths ??= {};
    delete n.publishedMonths[month];
    setData(n);
    setNotice(
      'Đã tạo đề xuất. Thầy cô hãy kiểm tra trước khi công bố.'
    );
  };
  // Xuất file Excel
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const scheduleRows = [['Ngày', 'Ca', 'Thành viên rảnh', 'Được phân công']];
    const registrationRows = [['Ngày', 'Ca', 'Thành viên đăng ký']];
    const assignmentRows = [['Ngày', 'Ca', 'Thành viên được phân công']];
    const attendanceRows = [['Ngày', 'Ca', 'Thành viên', 'Trạng thái']];

    const memberStats = {};
    STUDENTS.forEach((name) => {
      memberStats[name] = {
        registered: 0,
        assigned: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        unchecked: 0
      };
    });

    days.forEach((d) => {
      SHIFTS.forEach((s) => {
        const available = avail(data, d, s);
        const assignedMembers = assigned(data, d, s);

        scheduleRows.push([d, s, available.join('; '), assignedMembers.join('; ')]);

        available.forEach((name) => {
          registrationRows.push([d, s, name]);
          if (memberStats[name]) memberStats[name].registered++;
        });

        assignedMembers.forEach((name) => {
          assignmentRows.push([d, s, name]);
          if (memberStats[name]) memberStats[name].assigned++;

          const status = data.attendance?.[d]?.[s]?.[name] || 'Chưa điểm danh';
          attendanceRows.push([d, s, name, status]);

          if (memberStats[name]) {
            if (status === 'Có mặt') memberStats[name].present++;
            else if (status === 'Đi trễ') memberStats[name].late++;
            else if (status === 'Vắng mặt') memberStats[name].absent++;
            else if (status === 'Có phép') memberStats[name].excused++;
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
      'Đi trễ',
      'Vắng mặt',
      'Có phép',
      'Chưa điểm danh',
      'Số ca được thanh toán',
      'Tiền phụ cấp (VNĐ)'
    ]];

    STUDENTS.forEach((name) => {
      const s = memberStats[name];
      const paidShifts = s.present + s.late;
      const payment = paidShifts * 50000;

      paymentRows.push([
        name,
        s.registered,
        s.assigned,
        s.present,
        s.late,
        s.absent,
        s.excused,
        s.unchecked,
        paidShifts,
        payment
      ]);
    });
    const sheets = [
  ['Phan cong', assignmentRows],
  ['Diem danh', attendanceRows],
  ['Tong hop thanh toan', paymentRows]
];
    
sheets.forEach(([name, rows]) => {
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  // Định dạng tiêu đề
  const headerRange = XLSX.utils.decode_range(sheet['!ref']);

  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = sheet[cellAddress];

    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '005F69' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };
    }
  }

  // Căn chỉnh dữ liệu
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

  // Tự động điều chỉnh độ rộng cột
  sheet['!cols'] = rows[0].map((header, col) => {
    const maxLength = Math.max(
      String(header).length,
      ...rows.slice(1).map(row => String(row[col] ?? '').length)
    );

    return { wch: Math.min(Math.max(maxLength + 4, 14), 35) };
  });

  // Cố định hàng tiêu đề và bật bộ lọc
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!autofilter'] = { ref: sheet['!ref'] };

  XLSX.utils.book_append_sheet(workbook, sheet, name);
});

    XLSX.writeFile(workbook, `UEH-tong-hop-lich-truc-${month}.xlsx`);
  };
// Danh sách ca trực của Thành viên
  const myAssignments = days.flatMap((d) =>
    SHIFTS.filter((s) =>
      assigned(data, d, s).includes(student)
    ).map((s) => ({ day: d, shift: s }))
  );
// Thống kê tổng lượt đăng ký và phân công
  const totalAvail = days.reduce(
    (n, d) =>
      n + SHIFTS.reduce(
        (x, s) => x + avail(data, d, s).length,
        0
      ),
    0
  );
  const totalAssigned = days.reduce(
    (n, d) =>
      n + SHIFTS.reduce(
        (x, s) => x + assigned(data, d, s).length,
        0
      ),
    0
  );
// Công bố lịch tháng hiện tại
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
// Hủy công bố tháng hiện tại
  const unpublishMonth = () => {
    setData((p) => {
      const publishedMonths = {
        ...p.publishedMonths
      };
      delete publishedMonths[month];
      return {
        ...p,
        publishedMonths
      };
    });
    setNotice(
      'Đã hủy công bố. Giáo viên có thể điều chỉnh lịch.'
    );
  };
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <img
            src={uehLogo}
            alt="UEH Logo"
            style={{
              width: 45,
              height: 45,
              objectFit: 'contain'
            }}
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
        <button
          className={role === 'admin' ? 'nav active' : 'nav'}
          onClick={() => setRole('admin')}
        >
          <ClipboardList />
          Quản lý / Thầy cô
        </button>
        <div className="side-note">
          <ShieldCheck />
          <span>
            <b>Bản demo</b>
            <small>Dữ liệu lưu trên trình duyệt hiện tại.</small>
          </span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <small>HỆ THỐNG QUẢN LÝ LỊCH TRỰC</small>
            <h1>
              {role === 'student'
                ? 'Đăng ký thời gian rảnh'
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
                ? 'Chọn những ngày và ca bạn có thể tham gia trực.'
                : 'Tổng hợp thời gian rảnh và phân công Thành viên.'}
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
        {role === 'student' ? (
          <>
            <section className="panel identity">
              <div>
                <label>Họ và Tên</label>
                <select
                  value={student}
                  onChange={(e) => setStudent(e.target.value)}
                >
                  {STUDENTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <p>
                <i className="green-dot" /> Đã chọn rảnh
                <i className="purple-dot" /> Được phân công
              </p>
            </section>
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h3>
                    <CalendarDays />
                    Lịch đăng ký theo tháng
                  </h3>
                  <p>
                    Nhấn vào ca để đánh dấu thời gian bạn có thể tham gia.
                  </p>
                </div>
                <span className="tag">SÁNG · CHIỀU · TỐI</span>
              </div>
              {isPublished && (
                <div className="warning">
                  Tháng này đã công bố lịch và khóa đăng ký.
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
                      {SHIFTS.map((sh) => {
                        const on = avail(data, d, sh).includes(student);
                        const as = assigned(data, d, sh).includes(student);
                        return (
                          <button
                            disabled={isPublished}
                            onClick={() => toggleAvail(d, sh)}
                            className={`shift ${on ? 'on' : ''} ${as ? 'as' : ''}`}
                            key={sh}
                          >
                            {sh}
                            {on ? <CheckCircle2 /> : <span className="circle" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="footnote">
                Đã chọn{' '}
                <b>
                  {days.reduce(
                    (n, d) =>
                      n +
                      SHIFTS.filter((s) =>
                        avail(data, d, s).includes(student)
                      ).length,
                    0
                  )}
                </b>{' '}
                khung giờ · Dữ liệu tự lưu trên thiết bị
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h3>
                    <CalendarCheck />
                    Lịch trực chính thức của tôi
                  </h3>
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
          </>
        ) : (
          <>
            <section className="admin-head">
              <div>
                <h2>Quản lý đăng ký & phân công</h2>
                <p>
                  Hệ thống đề xuất; thầy cô kiểm tra và quyết định cuối cùng.
                </p>
              </div>
              <div>
                <button className="secondary" onClick={exportExcel}>
                  <Download />
                  Xuất Files
                </button>
                <button className="primary" onClick={suggest}>
                  <Sparkles />
                  Đề xuất phân công
                </button>
              </div>
            </section>
            <section className="panel setting">
              <div>
                <b>Số Thành viên mục tiêu mỗi ca</b>
                <small>Áp dụng cho đề xuất tự động.</small>
              </div>
              <select
                value={data.target}
                onChange={(e) => {
                  const publishedMonths = {
                    ...data.publishedMonths
                  };
                  delete publishedMonths[month];
                  setData((p) => ({
                    ...p,
                    target: Number(e.target.value),
                    publishedMonths
                  }));
                  setNotice(
                    'Đã thay đổi số Thành viên mục tiêu. Tháng này cần kiểm tra và công bố lại.'
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
            <Attendance
              days={days}
              data={data}
              setData={setData}
            />
            <StudentStats days={days} data={data} />
            <section className="panel publish">
              <div>
                <h3>
                  <ShieldCheck />
                  Công bố lịch trực
                </h3>
                <p>
                  {isPublished
                    ? 'Lịch tháng này đã được công bố.'
                    : 'Kiểm tra phân công trước khi công bố cho Thành viên.'}
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
  const [day, setDay] = useState(days[0]);
  useEffect(() => {
    if (!days.includes(day)) {
      setDay(days[0]);
    }
  }, [days, day]);
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>
            <Users />
            Tổng hợp theo ngày và ca
          </h3>
          <p>
            Chọn ngày, sau đó thêm/bỏ Thành viên trong danh sách phân công.
          </p>
        </div>
      </div>
      <div className="day-picker">
        {days.map((d) => (
          <button
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
                <span>
                  {picked.length}/{data.target} được phân công
                </span>
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
                <p className="empty">
                  Chưa có Thành viên đăng ký.
                </p>
              )}
              <small className="subhead">ĐÃ PHÂN CÔNG</small>
              <div className="tags">
                {picked.length ? (
                  picked.map((n) => (
                    <span key={n}>
                      {n}
                      <button
                        onClick={() => toggleAssign(day, sh, n)}
                      >
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
    let count = 0;
    days.forEach((day) => {
      SHIFTS.forEach((shift) => {
        const assignedStudents =
          data.assignments?.[day]?.[shift] || [];
        if (assignedStudents.includes(name)) {
          count++;
        }
      });
    });
    return { name, count };
  });
  const total = stats.reduce(
    (sum, student) => sum + student.count,
    0
  );
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-title">
        <div>
          <h3>Thống kê phân công Thành viên</h3>
          <p>Số ca và tỷ lệ phân công trong tháng.</p>
        </div>
        <span className="tag">THỐNG KÊ</span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 12
        }}
      >
        {stats.map((student) => {
          const percent =
            total > 0 ? (student.count / total) * 100 : 0;
          return (
            <div
              key={student.name}
              style={{
                flex: '0 0 calc(50% - 6px)',
                minWidth: 0,
                boxSizing: 'border-box',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 14
              }}
            >
              <b>{student.name}</b>
              <h2 style={{ margin: '12px 0', fontSize: 28 }}>
                {student.count} ca
              </h2>
              <div
                style={{
                  height: 8,
                  background: '#e5e7eb',
                  borderRadius: 10,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: '#16a34a'
                  }}
                />
              </div>
              <small>{percent.toFixed(1)}% tổng lượt phân công</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function Attendance({ days, data, setData }) {
  const [selectedDay, setSelectedDay] = useState(days[0] || '');
  const [selectedShift, setSelectedShift] = useState('Sáng');
  useEffect(() => {
    if (days.length && !days.includes(selectedDay)) setSelectedDay(days[0]);
  }, [days, selectedDay]);
  const students = data.assignments?.[selectedDay]?.[selectedShift] || [];
  const statuses = ['Có mặt', 'Vắng mặt', 'Có phép', 'Đi trễ'];
  const updateAttendance = (name, status) => {
    setData((previous) => {
      const next = structuredClone(previous);
      next.attendance ??= {};
      next.attendance[selectedDay] ??= {};
      next.attendance[selectedDay][selectedShift] ??= {};
      if (status) next.attendance[selectedDay][selectedShift][name] = status;
      else delete next.attendance[selectedDay][selectedShift][name];
      return next;
    });
  };
  const stats = STUDENTS.map((name) => {
    let assignedCount = 0, present = 0, absent = 0, excused = 0, late = 0;
    days.forEach((day) => SHIFTS.forEach((shift) => {
      const roster = data.assignments?.[day]?.[shift] || [];
      if (roster.includes(name)) {
        assignedCount += 1;
        const status = data.attendance?.[day]?.[shift]?.[name];
        if (status === 'Có mặt') present += 1;
        if (status === 'Vắng mặt') absent += 1;
        if (status === 'Có phép') excused += 1;
        if (status === 'Đi trễ') late += 1;
      }
    }));
    const rate = assignedCount ? ((present + late) / assignedCount) * 100 : 0;
    return { name, assignedCount, present, absent, excused, late, rate };
  });
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-title">
        <div>
          <h3><ClipboardList /> Điểm danh Thành viên</h3>
          <p>Chọn ngày và ca trực để ghi nhận tình trạng tham gia.</p>
        </div>
        <span className="tag">ĐIỂM DANH</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Chọn ngày trực</label>
        <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} disabled={!days.length} style={{ padding: 10, borderRadius: 8, width: '100%' }}>
          {days.map((day) => <option key={day} value={day}>{fmt(day)}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Chọn ca trực</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SHIFTS.map((shift) => (
            <button type="button" key={shift} onClick={() => setSelectedShift(shift)} className={selectedShift === shift ? 'primary' : 'secondary'}>{shift}</button>
          ))}
        </div>
      </div>
      <div>
        <h4>Danh sách ca {selectedShift}</h4>
        {students.length ? students.map((name) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
            <b>{name}</b>
            <select value={data.attendance?.[selectedDay]?.[selectedShift]?.[name] || ''} onChange={(event) => updateAttendance(name, event.target.value)} style={{ padding: 9, borderRadius: 8, minWidth: 160 }}>
              <option value="">Chưa điểm danh</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        )) : <div className="empty">Chưa có Thành viên được phân công trong ca này.</div>}
      </div>
      <div style={{ marginTop: 28 }}>
        <h3>Thống kê điểm danh tháng</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead><tr>{['Thành viên', 'Được phân công', 'Có mặt', 'Đi trễ', 'Vắng mặt', 'Có phép', 'Tỷ lệ tham gia'].map((heading) => <th key={heading} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd', fontSize: 12 }}>{heading}</th>)}</tr></thead>
            <tbody>{stats.map((item) => <tr key={item.name}>
              <td style={{ padding: 10 }}>{item.name}</td><td style={{ padding: 10 }}>{item.assignedCount}</td><td style={{ padding: 10 }}>{item.present}</td><td style={{ padding: 10 }}>{item.late}</td><td style={{ padding: 10 }}>{item.absent}</td><td style={{ padding: 10 }}>{item.excused}</td><td style={{ padding: 10 }}>{item.rate.toFixed(1)}%</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
