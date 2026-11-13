// Установщик GOD OF GRIMERKA. Игра лежит внутри exe как ресурс game.zip.
// Пока окно открыто, играет музыка из ресурса installer.mp3 (если он вшит при сборке).
// Ключи: /S — тихая установка, /D=папка, /noshortcuts, /noreg, /norun, /shot=файл.png [/done] — снимок окна (для проверки).
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Grimerka
{
    static class SetupMain
    {
        [STAThread]
        static int Main(string[] args)
        {
            string dir = App.DirArg() ?? App.DefaultDir;
            if (App.Has(args, "/S"))
            {
                try
                {
                    bool sc = !App.Has(args, "/noshortcuts");
                    Installer.Install(dir, sc, sc, !App.Has(args, "/noreg"), null);
                    return 0;
                }
                catch (Exception e)
                {
                    File.WriteAllText(Path.Combine(Path.GetTempPath(), "grimerka-setup.log"), e.ToString());
                    return 1;
                }
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            SetupForm f = new SetupForm(dir, App.Has(args, "/noreg"));
            string shot = App.Arg(args, "/shot=");
            if (shot != null)
            {
                f.Show(); Application.DoEvents();
                if (App.Has(args, "/done")) f.ShowDone(dir);
                Application.DoEvents();
                f.Shot(shot);
                return 0;
            }
            Application.Run(f);
            return 0;
        }
    }

    static class Installer
    {
        public static Stream Res(string name) { return Assembly.GetExecutingAssembly().GetManifestResourceStream(name); }

        // игра раньше называлась GOD OF BACK2U: сохранения (профиль браузера) переносим, старую копию тихо удаляем
        const string OldName = "GOD OF BACK2U", OldKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + OldName;
        public static bool OldInstalled() { using (Microsoft.Win32.RegistryKey k = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(OldKey)) return k != null; }
        static void MigrateOld()
        {
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), oldData = Path.Combine(local, OldName);
            try { if (Directory.Exists(oldData) && !Directory.Exists(App.DataDir)) Directory.Move(oldData, App.DataDir); } catch { }
            try
            {
                string oldDir = null;
                using (Microsoft.Win32.RegistryKey k = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(OldKey))
                    if (k != null) oldDir = k.GetValue("InstallLocation") as string;
                string oldExe = oldDir == null ? null : Path.Combine(oldDir, OldName + ".exe");
                if (oldExe != null && File.Exists(oldExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo(oldExe, "/uninstall /S"); psi.UseShellExecute = false; psi.CreateNoWindow = true;
                    using (Process p = Process.Start(psi)) p.WaitForExit(15000);
                }
                else Microsoft.Win32.Registry.CurrentUser.DeleteSubKeyTree(OldKey, false);
            }
            catch { }
        }

        public static long PackedSize()
        {
            long t = 0;
            using (Stream s = Res("game.zip"))
            using (ZipArchive z = new ZipArchive(s, ZipArchiveMode.Read))
                foreach (ZipArchiveEntry e in z.Entries) t += e.Length;
            return t;
        }

        public static long Install(string dir, bool desktop, bool start, bool reg, Action<int, string> progress)
        {
            dir = Path.GetFullPath(dir).TrimEnd('\\');
            MigrateOld();
            Directory.CreateDirectory(dir);
            string game = Path.Combine(dir, "game");
            // обновление: старые файлы игры убираем целиком, сохранения лежат отдельно и не трогаются
            if (File.Exists(Path.Combine(dir, App.Marker)) && Directory.Exists(game)) Directory.Delete(game, true);
            long total = 0;
            using (Stream s = Res("game.zip"))
            using (ZipArchive z = new ZipArchive(s, ZipArchiveMode.Read))
            {
                int n = z.Entries.Count, i = 0;
                foreach (ZipArchiveEntry e in z.Entries)
                {
                    i++;
                    string rel = e.FullName.Replace('/', '\\');
                    if (e.Name.Length == 0) continue;
                    string dst = Path.GetFullPath(Path.Combine(dir, rel));
                    if (!dst.StartsWith(dir + "\\", StringComparison.OrdinalIgnoreCase)) continue;
                    Directory.CreateDirectory(Path.GetDirectoryName(dst));
                    using (Stream src = e.Open())
                    using (FileStream o = File.Create(dst)) src.CopyTo(o);
                    total += e.Length;
                    if (progress != null) progress(i * 100 / n, rel);
                }
            }
            File.WriteAllText(Path.Combine(dir, App.Marker), App.Version);
            string exe = Path.Combine(dir, App.ExeName);
            if (desktop) App.Shortcut(App.DesktopLnk, exe, dir);
            if (start) App.Shortcut(App.StartLnk, exe, dir);
            if (reg) App.Register(dir, total / 1024);
            return total;
        }
    }

    class BufferedPanel : Panel
    {
        public BufferedPanel() { DoubleBuffered = true; ResizeRedraw = true; }
    }

    static class Bgm
    {
        [DllImport("winmm.dll", CharSet = CharSet.Unicode)] static extern int mciSendString(string cmd, System.Text.StringBuilder ret, int len, IntPtr cb);
        static string file; static bool open; public static bool Muted;
        static string Q(string c) { System.Text.StringBuilder sb = new System.Text.StringBuilder(128); mciSendString(c, sb, 128, IntPtr.Zero); return sb.ToString(); }
        public static bool Start()
        {
            try
            {
                using (Stream s = Installer.Res("installer.mp3"))
                {
                    if (s == null) return false;
                    file = Path.Combine(Path.GetTempPath(), "grimerka-setup-" + Process.GetCurrentProcess().Id + ".mp3");
                    using (FileStream o = File.Create(file)) s.CopyTo(o);
                }
                if (mciSendString("open \"" + file + "\" type mpegvideo alias bgm", null, 0, IntPtr.Zero) != 0) return false;
                open = true; mciSendString("setaudio bgm volume to 700", null, 0, IntPtr.Zero); mciSendString("play bgm", null, 0, IntPtr.Zero);
                return true;
            }
            catch { return false; }
        }
        // по кругу: когда трек закончился — с начала
        public static void Tick() { if (open && !Muted && Q("status bgm mode") == "stopped") mciSendString("play bgm from 0", null, 0, IntPtr.Zero); }
        public static void Toggle() { if (!open) return; Muted = !Muted; mciSendString(Muted ? "pause bgm" : "resume bgm", null, 0, IntPtr.Zero); }
        public static void Stop() { if (open) { mciSendString("close bgm", null, 0, IntPtr.Zero); open = false; } try { if (file != null) File.Delete(file); } catch { } }
    }

    // полоса прогресса в цветах игры (системная светлая выбивается из тёмного окна)
    class RedBar : Control
    {
        int v;
        public int Value { get { return v; } set { v = Math.Max(0, Math.Min(100, value)); Invalidate(); } }
        public RedBar() { DoubleBuffered = true; SetStyle(ControlStyles.ResizeRedraw, true); }
        protected override void OnPaint(PaintEventArgs e)
        {
            using (SolidBrush b = new SolidBrush(Color.FromArgb(30, 35, 50))) e.Graphics.FillRectangle(b, ClientRectangle);
            using (SolidBrush r = new SolidBrush(Color.FromArgb(255, 59, 59))) e.Graphics.FillRectangle(r, 0, 0, Width * v / 100, Height);
        }
    }

    class SetupForm : Form
    {
        static readonly Color BG = Color.FromArgb(11, 13, 19), PANEL = Color.FromArgb(22, 26, 38), RED = Color.FromArgb(255, 59, 59),
            TXT = Color.FromArgb(232, 236, 244), DIM = Color.FromArgb(141, 151, 170), LINE = Color.FromArgb(48, 54, 72);
        TextBox path; CheckBox cDesk, cStart, cRun; Button bInst, bCancel, bBrowse, bMus; System.Windows.Forms.Timer mt; RedBar bar; Label status, info, lPath;
        BufferedPanel banner; Image icon; FontFamily ru; bool noreg, done, busy; string doneDir;

        public SetupForm(string dir, bool noreg)
        {
            this.noreg = noreg;
            Text = App.Name + " — установка";
            FormBorderStyle = FormBorderStyle.FixedSingle; MaximizeBox = false; MinimizeBox = true; StartPosition = FormStartPosition.CenterScreen;
            BackColor = BG; ForeColor = TXT; Font = new Font("Segoe UI", 9.75f);
            ClientSize = new Size(660, 452);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            using (Stream s = Installer.Res("icon.png")) { MemoryStream ms = new MemoryStream(); s.CopyTo(ms); icon = Image.FromStream(ms); }
            try
            {
                byte[] fb; using (Stream s = Installer.Res("font.ttf")) { MemoryStream ms = new MemoryStream(); s.CopyTo(ms); fb = ms.ToArray(); }
                PrivateFontCollection pfc = new PrivateFontCollection();
                IntPtr p = Marshal.AllocCoTaskMem(fb.Length); Marshal.Copy(fb, 0, p, fb.Length); pfc.AddMemoryFont(p, fb.Length);
                ru = pfc.Families[0];
            }
            catch { ru = new FontFamily("Segoe UI"); }

            banner = new BufferedPanel(); banner.Location = new Point(0, 0); banner.Size = new Size(660, 178); banner.Paint += PaintBanner;
            lPath = new Label(); lPath.Text = "Папка установки"; lPath.Location = new Point(30, 198); lPath.AutoSize = true; lPath.ForeColor = DIM;
            path = new TextBox(); path.Text = dir; path.Location = new Point(30, 221); path.Size = new Size(484, 28);
            path.BackColor = PANEL; path.ForeColor = TXT; path.BorderStyle = BorderStyle.FixedSingle;
            bBrowse = Btn("Обзор…", new Point(524, 219), new Size(106, 29), false); bBrowse.Click += Browse;
            cDesk = Chk("Ярлык на рабочем столе", 264); cStart = Chk("Ярлык в меню «Пуск»", 291); cRun = Chk("Запустить игру после установки", 318);
            long mb = Math.Max(1, Installer.PackedSize() / 1048576);
            info = new Label(); info.Location = new Point(30, 352); info.Size = new Size(600, 40); info.ForeColor = DIM;
            info.Text = (Installer.OldInstalled() && !App.Installed() ? "Найдена старая GOD OF BACK2U — заменим на GRIMERKA, сохранения перенесём.\n" : App.Installed() ?"Найдена установленная версия — она обновится, сохранения останутся.\n" : "Займёт около " + mb + " МБ. Права администратора не нужны.\n")
                + "Игра откроется в отдельном окне Microsoft Edge — он уже есть в Windows.";
            bar = new RedBar(); bar.Location = new Point(30, 358); bar.Size = new Size(600, 6); bar.Visible = false;
            status = new Label(); status.Location = new Point(30, 370); status.Size = new Size(600, 22); status.ForeColor = DIM; status.Visible = false;
            bInst = Btn("УСТАНОВИТЬ", new Point(398, 404), new Size(132, 34), true); bInst.Click += Go;
            bCancel = Btn("Отмена", new Point(538, 404), new Size(92, 34), false); bCancel.Click += delegate { if (!busy) Close(); };
            bMus = Btn("♪  Музыка: вкл", new Point(30, 404), new Size(150, 34), false); bMus.Visible = false;
            bMus.Click += delegate { Bgm.Toggle(); bMus.Text = Bgm.Muted ? "♪  Музыка: выкл" : "♪  Музыка: вкл"; };
            Controls.AddRange(new Control[] { banner, lPath, path, bBrowse, cDesk, cStart, cRun, info, bar, status, bInst, bCancel, bMus });
            AcceptButton = bInst; ActiveControl = bInst;
            AutoScaleDimensions = new SizeF(96F, 96F); AutoScaleMode = AutoScaleMode.Dpi;
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            if (Bgm.Start()) { bMus.Visible = true; mt = new System.Windows.Forms.Timer(); mt.Interval = 500; mt.Tick += delegate { Bgm.Tick(); }; mt.Start(); }
        }
        protected override void OnFormClosed(FormClosedEventArgs e) { if (mt != null) mt.Stop(); Bgm.Stop(); base.OnFormClosed(e); }

        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int val, int size);
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            int on = 1; try { if (DwmSetWindowAttribute(Handle, 20, ref on, 4) != 0) DwmSetWindowAttribute(Handle, 19, ref on, 4); } catch { }
        }

        Button Btn(string t, Point p, Size s, bool primary)
        {
            Button b = new Button(); b.Text = t; b.Location = p; b.Size = s; b.FlatStyle = FlatStyle.Flat; b.Cursor = Cursors.Hand;
            b.BackColor = primary ? RED : PANEL; b.ForeColor = Color.White; b.Font = new Font("Segoe UI Semibold", 10f);
            b.FlatAppearance.BorderColor = primary ? RED : LINE; b.FlatAppearance.BorderSize = 1;
            b.FlatAppearance.MouseOverBackColor = primary ? Color.FromArgb(255, 95, 80) : Color.FromArgb(34, 40, 56);
            b.UseVisualStyleBackColor = false;
            return b;
        }

        CheckBox Chk(string t, int y)
        {
            CheckBox c = new CheckBox(); c.Text = t; c.Location = new Point(30, y); c.AutoSize = true; c.Checked = true;
            c.ForeColor = TXT; c.BackColor = BG; c.FlatStyle = FlatStyle.Flat; c.Cursor = Cursors.Hand;
            c.FlatAppearance.BorderColor = DIM; c.FlatAppearance.CheckedBackColor = RED;
            return c;
        }

        void PaintBanner(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics; float k = banner.Width / 660f; g.ScaleTransform(k, k);
            g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit; g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            using (LinearGradientBrush lg = new LinearGradientBrush(new Rectangle(0, 0, 660, 178), Color.FromArgb(58, 8, 14), BG, 0f)) g.FillRectangle(lg, 0, 0, 660, 178);
            using (GraphicsPath gp = new GraphicsPath())
            {
                gp.AddEllipse(-120, -130, 420, 420);
                using (PathGradientBrush pg = new PathGradientBrush(gp)) { pg.CenterColor = Color.FromArgb(150, 255, 70, 50); pg.SurroundColors = new Color[] { Color.FromArgb(0, 255, 40, 40) }; g.FillPath(pg, gp); }
            }
            using (Pen p = new Pen(Color.FromArgb(28, 0, 0, 0), 1.4f)) for (int r = 70; r < 300; r += 9) g.DrawEllipse(p, 90 - r, 89 - r, r * 2, r * 2);
            g.DrawImage(icon, new Rectangle(28, 25, 128, 128));
            using (Font f = new Font(ru, 44f, FontStyle.Regular, GraphicsUnit.Pixel))
            using (SolidBrush w = new SolidBrush(Color.White)) using (SolidBrush r = new SolidBrush(RED))
            {
                StringFormat sf = new StringFormat(StringFormat.GenericTypographic); sf.FormatFlags |= StringFormatFlags.MeasureTrailingSpaces;
                float x = 178, y = 42;
                g.DrawString("GOD ", f, w, x, y, sf); x += g.MeasureString("GOD ", f, 1000, sf).Width;
                g.DrawString("OF ", f, r, x, y, sf); x += g.MeasureString("OF ", f, 1000, sf).Width;
                g.DrawString("GRIMERKA", f, w, x, y, sf);
            }
            using (Font f = new Font("Segoe UI", 15f, GraphicsUnit.Pixel)) using (SolidBrush b = new SolidBrush(DIM))
                g.DrawString("сага о Пахане, кенте и девяти серверах", f, b, 182, 102);
            using (Font f = new Font("Segoe UI", 12f, GraphicsUnit.Pixel)) using (SolidBrush b = new SolidBrush(Color.FromArgb(110, 120, 140)))
                g.DrawString("установщик · версия " + App.Version, f, b, 182, 126);
            using (SolidBrush rb = new SolidBrush(RED)) g.FillRectangle(rb, 0, 175, 660, 3);
        }

        void Browse(object s, EventArgs e)
        {
            using (FolderBrowserDialog d = new FolderBrowserDialog())
            {
                d.Description = "Выберите папку — внутри будет создана папка «" + App.Name + "»";
                if (d.ShowDialog(this) == DialogResult.OK)
                    path.Text = d.SelectedPath.TrimEnd('\\').EndsWith(App.Name, StringComparison.OrdinalIgnoreCase) ? d.SelectedPath : Path.Combine(d.SelectedPath, App.Name);
            }
        }

        void Go(object s, EventArgs e)
        {
            if (done) { Play(doneDir); Close(); return; }
            string dir = path.Text.Trim();
            if (dir.Length < 4 || !Path.IsPathRooted(dir)) { MessageBox.Show(this, "Укажите полный путь к папке.", App.Name); return; }
            busy = true;
            foreach (Control c in new Control[] { path, bBrowse, cDesk, cStart, cRun, bInst, bCancel }) c.Enabled = false;
            info.Visible = false; bar.Visible = true; status.Visible = true; status.Text = "Качаем гримерку…";
            bool desk = cDesk.Checked, start = cStart.Checked, run = cRun.Checked;
            Thread t = new Thread(delegate ()
            {
                try
                {
                    Installer.Install(dir, desk, start, !noreg, delegate (int pct, string file)
                    {
                        BeginInvoke((MethodInvoker)delegate { bar.Value = Math.Min(100, pct); status.Text = file; });
                    });
                    BeginInvoke((MethodInvoker)delegate { busy = false; if (run) { Play(dir); Close(); } else ShowDone(dir); });
                }
                catch (Exception ex)
                {
                    BeginInvoke((MethodInvoker)delegate
                    {
                        busy = false;
                        MessageBox.Show(this, "Не удалось установить в эту папку:\n" + ex.Message + "\n\nВыберите папку в своём профиле, например на рабочем столе.", App.Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
                        foreach (Control c in new Control[] { path, bBrowse, cDesk, cStart, cRun, bInst, bCancel }) c.Enabled = true;
                        bar.Visible = false; status.Visible = false; info.Visible = true;
                    });
                }
            });
            t.IsBackground = true; t.Start();
        }

        public void ShowDone(string dir)
        {
            done = true; doneDir = dir;
            foreach (Control c in new Control[] { path, bBrowse, cDesk, cStart, cRun }) c.Enabled = false;
            bar.Visible = true; bar.Value = 100; status.Visible = true; info.Visible = false;
            status.ForeColor = Color.FromArgb(125, 255, 125); status.Text = "Готово! GOD OF GRIMERKA установлена — Пахан ждёт.";
            bInst.Text = "ИГРАТЬ"; bInst.Enabled = true; bCancel.Text = "Закрыть"; bCancel.Enabled = true;
        }

        static void Play(string dir)
        {
            try { Process.Start(new ProcessStartInfo(Path.Combine(dir, App.ExeName)) { UseShellExecute = true, WorkingDirectory = dir }); } catch { }
        }

        public void Shot(string file)
        {
            using (Bitmap b = new Bitmap(Width, Height)) { DrawToBitmap(b, new Rectangle(0, 0, Width, Height)); b.Save(file, System.Drawing.Imaging.ImageFormat.Png); }
        }
    }
}
